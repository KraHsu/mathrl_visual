/// <reference lib="webworker" />

import init, * as wasmModule from '../generated/wasm/mathrl_wasm.js'
import {
  PLANNING_MODES,
  PLANNING_PROTOCOL_VERSION,
  canonicalPlanningMode,
  planningConfigValidationError,
  type PlanningConfig,
  type PlanningCost,
  type PlanningMode,
  type PlanningOutcome,
  type PlanningPhase,
  type PlanningReference,
  type PlanningRunState,
  type PlanningSnapshot,
  type PlanningTransition,
  type PlanningUpdate,
  type PlanningWorkerRequest,
  type PlanningWorkerResponse,
} from '../planningProtocol'

const workerScope: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope

// Keep the dynamic constructor lookup deliberately small.  During the
// chapter's development window the wasm crate may expose IterationEvaluator
// as an alias; accepting it here lets a cached HTML shell recover after a
// worker chunk is upgraded without coupling the UI to a generated d.ts file.
type WasmEvaluator = {
  snapshot: (mode?: string) => unknown
  reset: (mode?: string) => unknown
  transition_model?: () => unknown
  transitionModel?: () => unknown
  reference_solution?: () => unknown
  referenceSolution?: () => unknown
  step?: (mode: string) => unknown
  sweep?: (mode: string) => unknown
  advance?: (mode: string, outerSteps: number) => unknown
  run_to_convergence?: (mode: string) => unknown
  runToConvergence?: (mode: string) => unknown
  free?: () => void
}
type WasmEvaluatorConstructor = new (
  discount: number,
  slipProbability: number,
  tolerance: number,
  maxOuterIterations: number,
  evaluationSweeps: number,
  maxEvaluationSweeps: number,
  defaultReward: number,
  boundaryReward: number,
  hazardReward: number,
  goalReward: number,
) => WasmEvaluator

const moduleRecord = wasmModule as unknown as Record<string, unknown>
const EvaluatorConstructor = (moduleRecord.PlanningEvaluator ??
  moduleRecord.IterationEvaluator) as WasmEvaluatorConstructor | undefined

let engineInitialization: Promise<void> | undefined
let evaluator: WasmEvaluator | undefined
let activeRunId = ''
let sequence = 0

async function ensureEngine(): Promise<void> {
  engineInitialization ??= init()
    .then(() => undefined)
    .catch((error: unknown) => {
      // Failed fetch/compile must be retryable from the visible Apply button.
      engineInitialization = undefined
      throw error
    })
  await engineInitialization
}

function post(response: PlanningWorkerResponse): void {
  workerScope.postMessage(response)
}

function normalizeError(error: unknown): { code: string; message: string } {
  if (typeof error === 'object' && error !== null) {
    const candidate = error as { code?: unknown; message?: unknown }
    if (typeof candidate.code === 'string' && typeof candidate.message === 'string') {
      return { code: candidate.code, message: candidate.message }
    }
  }
  if (error instanceof Error) return { code: 'worker_error', message: error.message }
  return { code: 'worker_error', message: String(error) }
}

function finiteOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function integerOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isInteger(value) ? value : fallback
}

function arrayOfNumbers(value: unknown, length: number, fill = 0): number[] {
  if (!Array.isArray(value)) return Array(length).fill(fill)
  return Array.from({ length }, (_, index) => finiteOr(value[index], fill))
}

function matrixOfNumbers(value: unknown, rows: number, columns: number): number[][] {
  if (!Array.isArray(value)) return Array.from({ length: rows }, () => Array(columns).fill(0))
  return Array.from({ length: rows }, (_, row) => arrayOfNumbers(value[row], columns))
}

function normalizeCost(value: unknown): PlanningCost {
  const candidate = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  return {
    backups: integerOr(candidate.backups, 0),
    actionEvaluations: integerOr(
      candidate.actionEvaluations ?? candidate.action_evaluations,
      0,
    ),
    policyEvaluations: integerOr(
      candidate.policyEvaluations ?? candidate.policy_evaluations ?? candidate.policyEvaluationSweeps,
      0,
    ),
    improvementSteps: integerOr(
      candidate.improvementSteps ?? candidate.improvement_steps ?? candidate.policyImprovementSteps,
      0,
    ),
  }
}

function normalizePhase(value: unknown): PlanningPhase[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item): PlanningPhase[] => {
    if (!item || typeof item !== 'object') return []
    const candidate = item as Record<string, unknown>
    const rawKind = String(candidate.kind ?? '')
    const normalizedKind = rawKind === 'value_backup'
      ? 'backup'
      : rawKind === 'policy_evaluation'
        ? 'evaluation'
        : rawKind === 'policy_improvement'
          ? 'improvement'
          : rawKind
    if (!['backup', 'evaluation', 'improvement', 'stable', 'truncated'].includes(normalizedKind)) {
      return []
    }
    return [{
      kind: normalizedKind as PlanningPhase['kind'],
      ...(candidate.sweeps === undefined
        ? {}
        : { sweeps: integerOr(candidate.sweeps, 0) }),
      ...(candidate.residual === undefined
        ? {}
        : { residual: finiteOr(candidate.residual, 0) }),
      ...(candidate.changedStates === undefined
        ? {}
        : { changedStates: integerOr(candidate.changedStates, 0) }),
      ...(candidate.outerIteration === undefined && candidate.outer_iteration === undefined
        ? {}
        : { outerIteration: integerOr(candidate.outerIteration ?? candidate.outer_iteration, 0) }),
      ...(candidate.maxUpdate === undefined && candidate.max_update === undefined
        ? {}
        : { maxUpdate: finiteOr(candidate.maxUpdate ?? candidate.max_update, 0) }),
      ...(candidate.policyStable === undefined && candidate.policy_stable === undefined
        ? {}
        : { policyStable: Boolean(candidate.policyStable ?? candidate.policy_stable) }),
    }]
  })
}

function normalizeSnapshot(value: unknown, fallbackMode: PlanningMode): PlanningSnapshot {
  const candidate = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  const rawMode = canonicalPlanningMode(candidate.mode) ?? fallbackMode
  const cost = normalizeCost(candidate.cost)
  const policy = arrayOfNumbers(candidate.policy, 16, -1).map((action) => action === 255 ? -1 : action)
  return {
    mode: rawMode,
    values: arrayOfNumbers(candidate.values, 16),
    actionValues: matrixOfNumbers(candidate.actionValues ?? candidate.action_values, 16, 5),
    greedyMasks: arrayOfNumbers(candidate.greedyMasks ?? candidate.greedy_masks, 16),
    policyMasks: arrayOfNumbers(candidate.policyMasks ?? candidate.policy_masks, 16),
    policy,
    outerIteration: integerOr(candidate.outerIteration ?? candidate.outer_iteration, 0),
    evaluationSweep: integerOr(candidate.evaluationSweep ?? candidate.evaluation_sweep, 0),
    residual: finiteOr(candidate.residual, 0),
    valueResidual: finiteOr(candidate.valueResidual ?? candidate.value_residual, 0),
    evaluationResidual: finiteOr(
      candidate.evaluationResidual ?? candidate.evaluation_residual,
      0,
    ),
    policyStable: Boolean(candidate.policyStable ?? candidate.policy_stable),
    converged: Boolean(candidate.converged),
    truncated: Boolean(candidate.truncated),
    evaluationTruncated: Boolean(candidate.evaluationTruncated ?? candidate.evaluation_truncated),
    cost,
  }
}

function normalizeReference(value: unknown): PlanningReference {
  // Some early prototypes returned a map keyed by mode even though the
  // reference is mode-independent.  Select the VI entry in that case.
  let candidate = value
  if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
    const record = candidate as Record<string, unknown>
    if ('value_iteration' in record) candidate = record.value_iteration
    else if ('valueIteration' in record) candidate = record.valueIteration
  }
  const record = (candidate && typeof candidate === 'object' ? candidate : {}) as Record<string, unknown>
  return {
    values: arrayOfNumbers(record.values, 16),
    actionValues: matrixOfNumbers(record.actionValues ?? record.action_values, 16, 5),
    greedyMasks: arrayOfNumbers(record.greedyMasks ?? record.greedy_masks, 16),
    residual: finiteOr(record.residual, Number.POSITIVE_INFINITY),
  }
}

function normalizeUpdate(value: unknown): PlanningUpdate[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item): PlanningUpdate[] => {
    if (!item || typeof item !== 'object') return []
    const candidate = item as Record<string, unknown>
    return [{
      state: integerOr(candidate.state, 0),
      oldValue: finiteOr(candidate.oldValue ?? candidate.old_value, 0),
      newValue: finiteOr(candidate.newValue ?? candidate.new_value, 0),
      delta: finiteOr(candidate.delta, 0),
      actionValues: arrayOfNumbers(candidate.actionValues ?? candidate.action_values, 5),
      greedyMask: integerOr(candidate.greedyMask ?? candidate.greedy_mask, 0),
      ...(candidate.policyMask === undefined && candidate.policy_mask === undefined
        ? {}
        : { policyMask: integerOr(candidate.policyMask ?? candidate.policy_mask, 0) }),
      ...(candidate.policy === undefined ? {} : { policy: integerOr(candidate.policy, -1) }),
      ...(candidate.policyBefore === undefined && candidate.policy_before === undefined
        ? {}
        : { policyBefore: integerOr(candidate.policyBefore ?? candidate.policy_before, -1) }),
      ...(candidate.policyAfter === undefined && candidate.policy_after === undefined
        ? {}
        : { policyAfter: integerOr(candidate.policyAfter ?? candidate.policy_after, -1) }),
    }]
  })
}

function normalizeOutcome(value: unknown, mode: PlanningMode): PlanningOutcome {
  const candidate = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  const snapshot = normalizeSnapshot(candidate.snapshot, mode)
  return {
    snapshot,
    updates: normalizeUpdate(candidate.updates),
    residualHistory: Array.isArray(candidate.residualHistory ?? candidate.residual_history)
      ? (Array.isArray(candidate.residualHistory)
        ? candidate.residualHistory
        : candidate.residual_history as unknown[]).map((item: unknown) =>
          finiteOr(item, snapshot.residual),
        )
      : [snapshot.residual],
    phases: normalizePhase(candidate.phases),
  }
}

function snapshotFor(mode: PlanningMode): PlanningSnapshot {
  if (!evaluator) throw new Error('planning evaluator is not initialized')
  return normalizeSnapshot(evaluator.snapshot(mode), mode)
}

function callTransitionModel(): PlanningTransition[] {
  if (!evaluator) throw new Error('planning evaluator is not initialized')
  const method = evaluator.transition_model ?? evaluator.transitionModel
  const value = method?.call(evaluator)
  if (!Array.isArray(value)) return []
  return value.flatMap((item): PlanningTransition[] => {
    if (!item || typeof item !== 'object') return []
    const candidate = item as Record<string, unknown>
    const requestedAction = integerOr(candidate.requestedAction ?? candidate.requested_action, 0)
    const actualAction = integerOr(candidate.actualAction ?? candidate.actual_action, requestedAction)
    return [{
      state: integerOr(candidate.state, 0),
      requestedAction: requestedAction as PlanningTransition['requestedAction'],
      actualAction: actualAction as PlanningTransition['actualAction'],
      nextState: integerOr(candidate.nextState ?? candidate.next_state, 0),
      probability: finiteOr(candidate.probability, 0),
      reward: finiteOr(candidate.reward, 0),
      boundaryCollision: Boolean(candidate.boundaryCollision ?? candidate.boundary_collision),
    }]
  })
}

function callReference(): PlanningReference {
  if (!evaluator) throw new Error('planning evaluator is not initialized')
  const method = evaluator.reference_solution ?? evaluator.referenceSolution
  return normalizeReference(method?.call(evaluator))
}

function callStep(mode: PlanningMode): PlanningOutcome {
  if (!evaluator) throw new Error('planning evaluator is not initialized')
  const method = evaluator.step ?? evaluator.sweep
  if (!method) throw new Error('planning evaluator does not expose step/sweep')
  return normalizeOutcome(method.call(evaluator, mode), mode)
}

function callAdvance(mode: PlanningMode, outerSteps: number): PlanningOutcome {
  if (!evaluator) throw new Error('planning evaluator is not initialized')
  if (!evaluator.advance) throw new Error('planning evaluator does not expose advance')
  return normalizeOutcome(evaluator.advance.call(evaluator, mode, outerSteps), mode)
}

function callRun(mode: PlanningMode): PlanningOutcome {
  if (!evaluator) throw new Error('planning evaluator is not initialized')
  const method = evaluator.run_to_convergence ?? evaluator.runToConvergence
  if (!method) throw new Error('planning evaluator does not expose run_to_convergence')
  return normalizeOutcome(method.call(evaluator, mode), mode)
}

function callReset(mode: PlanningMode): PlanningSnapshot {
  if (!evaluator) throw new Error('planning evaluator is not initialized')
  return normalizeSnapshot(evaluator.reset(mode), mode)
}

function initialRunState(mode: PlanningMode, restoreOuter: number): PlanningRunState {
  if (restoreOuter > 0) {
    const outcome = callAdvance(mode, restoreOuter)
    return {
      snapshot: outcome.snapshot,
      reference: callReference(),
      residualHistory: outcome.residualHistory,
      updates: outcome.updates,
      phases: outcome.phases,
    }
  }
  const snapshot = snapshotFor(mode)
  return {
    snapshot,
    reference: callReference(),
    residualHistory: [snapshot.residual],
    updates: [],
    phases: [],
  }
}

function engineVersion(): string {
  const value = moduleRecord.engine_version ?? moduleRecord.engineVersion
  return typeof value === 'function' ? String(value()) : 'planning'
}

workerScope.onmessage = async (event: MessageEvent<PlanningWorkerRequest>) => {
  const request = event.data
  if (!request || request.v !== PLANNING_PROTOCOL_VERSION) return

  try {
    if (request.kind === 'start') {
      const configError = planningConfigValidationError(request.config)
      if (configError) throw configError
      for (const mode of PLANNING_MODES) {
        const restore = request.restore?.[mode] ?? 0
        if (!Number.isInteger(restore) || restore < 0 || restore > request.config.maxOuterIterations) {
          throw {
            code: 'planning_restore_iterations',
            message: 'restored outer iteration is outside the configured limit',
          }
        }
      }

      await ensureEngine()
      if (!EvaluatorConstructor) throw new Error('PlanningEvaluator export is unavailable')
      const nextEvaluator = new EvaluatorConstructor(
        request.config.discount,
        request.config.slipProbability,
        request.config.tolerance,
        request.config.maxOuterIterations,
        request.config.evaluationSweeps,
        request.config.maxEvaluationSweeps,
        request.config.rewards.default,
        request.config.rewards.boundary,
        request.config.rewards.hazard,
        request.config.rewards.goal,
      )
      evaluator?.free?.()
      evaluator = nextEvaluator
      activeRunId = request.runId
      sequence = 0
      const reference = callReference()
      const model = callTransitionModel()
      const runs = Object.fromEntries(
        PLANNING_MODES.map((mode) => [mode, initialRunState(mode, request.restore?.[mode] ?? 0)]),
      ) as Record<PlanningMode, PlanningRunState>
      post({
        v: PLANNING_PROTOCOL_VERSION,
        runId: activeRunId,
        sequence,
        kind: 'started',
        engineVersion: engineVersion(),
        model,
        reference,
        runs,
      })
      return
    }

    if (request.runId !== activeRunId || !evaluator) return
    sequence += 1
    if (request.kind === 'reset') {
      post({
        v: PLANNING_PROTOCOL_VERSION,
        runId: activeRunId,
        sequence,
        kind: 'reset',
        mode: request.mode,
        snapshot: callReset(request.mode),
      })
      return
    }
    if (request.kind === 'step') {
      post({
        v: PLANNING_PROTOCOL_VERSION,
        runId: activeRunId,
        sequence,
        kind: 'stepped',
        mode: request.mode,
        outcome: callStep(request.mode),
      })
      return
    }
    if (request.kind === 'advance') {
      if (!Number.isInteger(request.outerSteps) || request.outerSteps < 1 || request.outerSteps > 100) {
        throw {
          code: 'planning_advance_iterations',
          message: 'outer step chunk must be an integer from 1 through 100',
        }
      }
      post({
        v: PLANNING_PROTOCOL_VERSION,
        runId: activeRunId,
        sequence,
        kind: 'chunked',
        mode: request.mode,
        outcome: callAdvance(request.mode, request.outerSteps),
      })
      return
    }
    post({
      v: PLANNING_PROTOCOL_VERSION,
      runId: activeRunId,
      sequence,
      kind: 'advanced',
      mode: request.mode,
      outcome: callRun(request.mode),
    })
  } catch (error) {
    const normalized = normalizeError(error)
    sequence += 1
    post({
      v: PLANNING_PROTOCOL_VERSION,
      runId: request.runId,
      sequence,
      kind: 'error',
      code: normalized.code,
      message: normalized.message,
      recoverable: request.kind !== 'start',
      ...(request.kind === 'start' ? {} : { mode: request.mode }),
    })
  }
}
