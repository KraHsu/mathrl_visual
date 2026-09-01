/// <reference lib="webworker" />

import init, {
  OptimalityEvaluator,
  engine_version,
} from '../generated/wasm/mathrl_wasm.js'
import {
  OPTIMALITY_PROTOCOL_VERSION,
  optimalityConfigValidationError,
  type OptimalityAdvanceOutcome,
  type OptimalityReference,
  type OptimalitySnapshot,
  type OptimalitySweepOutcome,
  type OptimalityTransition,
  type OptimalityWorkerRequest,
  type OptimalityWorkerResponse,
} from '../optimalityProtocol'

const workerScope: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope

let engineInitialization: Promise<void> | undefined
let evaluator: OptimalityEvaluator | undefined
let activeRunId = ''
let sequence = 0

async function ensureEngine(): Promise<void> {
  engineInitialization ??= init()
    .then(() => undefined)
    .catch((error: unknown) => {
      // A failed Wasm fetch/compile must remain retryable in this Worker.
      engineInitialization = undefined
      throw error
    })
  await engineInitialization
}

function post(response: OptimalityWorkerResponse): void {
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

workerScope.onmessage = async (event: MessageEvent<OptimalityWorkerRequest>) => {
  const request = event.data
  if (request.v !== OPTIMALITY_PROTOCOL_VERSION) return

  try {
    if (request.kind === 'start') {
      const configError = optimalityConfigValidationError(request.config)
      if (configError) throw configError
      if (
        !Number.isInteger(request.restoreSweeps) ||
        request.restoreSweeps < 0 ||
        request.restoreSweeps > request.config.maxSweeps
      ) {
        throw {
          code: 'optimality_restore_sweeps',
          message: 'restored sweep count must be within the configured sweep limit',
        }
      }

      await ensureEngine()
      const nextEvaluator = new OptimalityEvaluator(
        request.config.discount,
        request.config.slipProbability,
        request.config.tolerance,
        request.config.maxSweeps,
        request.config.rewards.default,
        request.config.rewards.boundary,
        request.config.rewards.hazard,
        request.config.rewards.goal,
      )
      let snapshot = nextEvaluator.snapshot() as OptimalitySnapshot
      let residualHistory = [snapshot.residual]
      if (request.restoreSweeps > 0) {
        const restored = nextEvaluator.advance(request.restoreSweeps) as OptimalityAdvanceOutcome
        snapshot = restored.snapshot
        residualHistory = restored.residualHistory
      }

      const model = nextEvaluator.transition_model() as OptimalityTransition[]
      const reference = nextEvaluator.reference_solution() as OptimalityReference
      evaluator?.free()
      evaluator = nextEvaluator
      activeRunId = request.runId
      sequence = 0
      post({
        v: OPTIMALITY_PROTOCOL_VERSION,
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
        v: OPTIMALITY_PROTOCOL_VERSION,
        runId: activeRunId,
        sequence,
        kind: 'reset',
        snapshot: evaluator.reset() as OptimalitySnapshot,
      })
      return
    }

    if (request.kind === 'run') {
      post({
        v: OPTIMALITY_PROTOCOL_VERSION,
        runId: activeRunId,
        sequence,
        kind: 'advanced',
        outcome: evaluator.run_to_convergence() as OptimalityAdvanceOutcome,
      })
      return
    }

    if (request.kind === 'advance') {
      if (!Number.isInteger(request.sweeps) || request.sweeps < 1 || request.sweeps > 100) {
        throw {
          code: 'optimality_advance_sweeps',
          message: 'advance sweep count must be an integer from 1 through 100',
        }
      }
      post({
        v: OPTIMALITY_PROTOCOL_VERSION,
        runId: activeRunId,
        sequence,
        kind: 'chunked',
        outcome: evaluator.advance(request.sweeps) as OptimalityAdvanceOutcome,
      })
      return
    }

    post({
      v: OPTIMALITY_PROTOCOL_VERSION,
      runId: activeRunId,
      sequence,
      kind: 'swept',
      outcome: evaluator.sweep() as OptimalitySweepOutcome,
    })
  } catch (error) {
    const normalized = normalizeError(error)
    sequence += 1
    post({
      v: OPTIMALITY_PROTOCOL_VERSION,
      runId: request.runId,
      sequence,
      kind: 'error',
      code: normalized.code,
      message: normalized.message,
      recoverable: request.kind !== 'start',
    })
  }
}
