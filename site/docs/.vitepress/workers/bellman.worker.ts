/// <reference lib="webworker" />

import init, {
  BellmanEvaluator,
  engine_version,
} from '../generated/wasm/mathrl_wasm.js'
import {
  BELLMAN_PROTOCOL_VERSION,
  bellmanConfigValidationError,
  type BellmanAdvanceOutcome,
  type BellmanSnapshot,
  type BellmanSweepOutcome,
  type BellmanTransition,
  type BellmanWorkerRequest,
  type BellmanWorkerResponse,
} from '../bellmanProtocol'

const workerScope: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope

let engineInitialization: Promise<void> | undefined
let evaluator: BellmanEvaluator | undefined
let activeRunId = ''
let sequence = 0

async function ensureEngine(): Promise<void> {
  engineInitialization ??= init()
    .then(() => undefined)
    .catch((error: unknown) => {
      // A transient Wasm fetch/compile failure must not poison every later retry.
      engineInitialization = undefined
      throw error
    })
  await engineInitialization
}

function post(response: BellmanWorkerResponse): void {
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

workerScope.onmessage = async (event: MessageEvent<BellmanWorkerRequest>) => {
  const request = event.data
  if (request.v !== BELLMAN_PROTOCOL_VERSION) return

  try {
    if (request.kind === 'start') {
      const configError = bellmanConfigValidationError(request.config)
      if (configError) throw configError
      if (
        !Number.isInteger(request.restoreSweeps) ||
        request.restoreSweeps < 0 ||
        request.restoreSweeps > request.config.maxSweeps
      ) {
        throw {
          code: 'evaluation_restore_sweeps',
          message: 'restored sweep count must be within the configured sweep limit',
        }
      }
      await ensureEngine()

      const nextEvaluator = new BellmanEvaluator(
        request.config.discount,
        request.config.tolerance,
        request.config.maxSweeps,
      )
      let snapshot = nextEvaluator.snapshot() as BellmanSnapshot
      let residualHistory = [snapshot.residual]
      if (request.restoreSweeps > 0) {
        const restored = nextEvaluator.advance(request.restoreSweeps) as BellmanAdvanceOutcome
        snapshot = restored.snapshot
        residualHistory = restored.residualHistory
      }

      evaluator?.free()
      evaluator = nextEvaluator
      activeRunId = request.runId
      sequence = 0
      post({
        v: BELLMAN_PROTOCOL_VERSION,
        runId: activeRunId,
        sequence,
        kind: 'started',
        engineVersion: engine_version(),
        snapshot,
        model: evaluator.transition_model() as BellmanTransition[],
        exactValues: evaluator.exact_values() as number[],
        residualHistory,
      })
      return
    }

    if (request.runId !== activeRunId || !evaluator) return
    sequence += 1
    if (request.kind === 'reset') {
      post({
        v: BELLMAN_PROTOCOL_VERSION,
        runId: activeRunId,
        sequence,
        kind: 'reset',
        snapshot: evaluator.reset() as BellmanSnapshot,
      })
      return
    }

    if (request.kind === 'run') {
      post({
        v: BELLMAN_PROTOCOL_VERSION,
        runId: activeRunId,
        sequence,
        kind: 'advanced',
        outcome: evaluator.run_to_convergence() as BellmanAdvanceOutcome,
      })
      return
    }

    post({
      v: BELLMAN_PROTOCOL_VERSION,
      runId: activeRunId,
      sequence,
      kind: 'swept',
      outcome: evaluator.sweep() as BellmanSweepOutcome,
    })
  } catch (error) {
    const normalized = normalizeError(error)
    sequence += 1
    post({
      v: BELLMAN_PROTOCOL_VERSION,
      runId: request.runId,
      sequence,
      kind: 'error',
      code: normalized.code,
      message: normalized.message,
      recoverable: request.kind !== 'start',
    })
  }
}
