/// <reference lib="webworker" />

import init, {
  GridPolicyEvaluationEvaluator,
  engine_version,
} from '../generated/wasm/mathrl_wasm.js'
import {
  GRID_POLICY_PROTOCOL_VERSION,
  canonicalGridPolicyKind,
  gridPolicyConfigValidationError,
  type GridPolicyAdvanceOutcome,
  type GridPolicyConfig,
  type GridPolicyReference,
  type GridPolicySnapshot,
  type GridPolicySweepOutcome,
  type GridPolicyTransition,
  type GridPolicyWorkerRequest,
  type GridPolicyWorkerResponse,
} from '../gridPolicyProtocol'

const workerScope: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope

let engineInitialization: Promise<void> | undefined
let evaluator: GridPolicyEvaluationEvaluator | undefined
let activeRunId = ''
let sequence = 0

async function ensureEngine(): Promise<void> {
  engineInitialization ??= init()
    .then(() => undefined)
    .catch((error: unknown) => {
      engineInitialization = undefined
      throw error
    })
  await engineInitialization
}

function post(response: GridPolicyWorkerResponse): void {
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

workerScope.onmessage = async (event: MessageEvent<GridPolicyWorkerRequest>) => {
  const request = event.data
  if (!request || request.v !== GRID_POLICY_PROTOCOL_VERSION) return

  try {
    if (request.kind === 'start') {
      const configError = gridPolicyConfigValidationError(request.config)
      if (configError) throw configError
      if (
        !Number.isInteger(request.restoreSweeps) ||
        request.restoreSweeps < 0 ||
        request.restoreSweeps > request.config.maxSweeps
      ) {
        throw {
          code: 'grid_policy_restore_sweeps',
          message: 'restored sweep count must be within the configured sweep limit',
        }
      }
      await ensureEngine()
      const policy = canonicalGridPolicyKind(request.config.policy)
      if (!policy) {
        throw {
          code: 'grid_policy_unknown_kind',
          message: 'choose one of the available fixed policies',
        }
      }
      const nextEvaluator = new GridPolicyEvaluationEvaluator(
        policy,
        request.config.discount,
        request.config.slipProbability,
        request.config.tolerance,
        request.config.maxSweeps,
        request.config.seedHex,
        request.config.rewards.default,
        request.config.rewards.boundary,
        request.config.rewards.hazard,
        request.config.rewards.goal,
      )
      let snapshot = nextEvaluator.snapshot() as GridPolicySnapshot
      let residualHistory = [snapshot.residual]
      if (request.restoreSweeps > 0) {
        const restored = nextEvaluator.advance(request.restoreSweeps) as GridPolicyAdvanceOutcome
        snapshot = restored.snapshot
        residualHistory = restored.residualHistory
      }
      const model = nextEvaluator.transitionModel() as GridPolicyTransition[]
      const reference = nextEvaluator.referenceSolution() as GridPolicyReference
      evaluator?.free()
      evaluator = nextEvaluator
      activeRunId = request.runId
      sequence = 0
      post({
        v: GRID_POLICY_PROTOCOL_VERSION,
        runId: activeRunId,
        sequence,
        kind: 'started',
        engineVersion: engine_version(),
        snapshot,
        model,
        reference,
        residualHistory,
      })
      return
    }

    if (request.runId !== activeRunId || !evaluator) return
    sequence += 1

    if (request.kind === 'reset') {
      post({
        v: GRID_POLICY_PROTOCOL_VERSION,
        runId: activeRunId,
        sequence,
        kind: 'reset',
        snapshot: evaluator.reset() as GridPolicySnapshot,
      })
      return
    }

    if (request.kind === 'run') {
      post({
        v: GRID_POLICY_PROTOCOL_VERSION,
        runId: activeRunId,
        sequence,
        kind: 'advanced',
        outcome: evaluator.runToConvergence() as GridPolicyAdvanceOutcome,
      })
      return
    }

    if (request.kind === 'advance') {
      if (!Number.isInteger(request.sweeps) || request.sweeps < 1 || request.sweeps > 100) {
        throw {
          code: 'grid_policy_advance_sweeps',
          message: 'advance sweep count must be an integer from 1 through 100',
        }
      }
      post({
        v: GRID_POLICY_PROTOCOL_VERSION,
        runId: activeRunId,
        sequence,
        kind: 'chunked',
        outcome: evaluator.advance(request.sweeps) as GridPolicyAdvanceOutcome,
      })
      return
    }

    post({
      v: GRID_POLICY_PROTOCOL_VERSION,
      runId: activeRunId,
      sequence,
      kind: 'swept',
      outcome: evaluator.sweep() as GridPolicySweepOutcome,
    })
  } catch (error) {
    const normalized = normalizeError(error)
    sequence += 1
    post({
      v: GRID_POLICY_PROTOCOL_VERSION,
      runId: request.runId,
      sequence,
      kind: 'error',
      code: normalized.code,
      message: normalized.message,
      recoverable: request.kind !== 'start',
    })
  }
}
