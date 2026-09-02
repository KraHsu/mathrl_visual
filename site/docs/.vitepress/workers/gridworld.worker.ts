/// <reference lib="webworker" />

import init, {
  GridWorldSession,
  engine_version,
} from '../generated/wasm/mathrl_wasm.js'
import {
  PROTOCOL_VERSION,
  type ModelOutcome,
  type Snapshot,
  type StepOutcome,
  type WorkerRequest,
  type WorkerResponse,
} from '../protocol'

const workerScope: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope

let engineInitialization: Promise<void> | undefined
let session: GridWorldSession | undefined
let activeRunId = ''
let sequence = 0

async function ensureEngine(): Promise<void> {
  engineInitialization ??= init()
    .then(() => undefined)
    .catch((error) => {
      // Do not permanently poison this Worker after a transient fetch or
      // compile failure. A later start request can retry initialization.
      engineInitialization = undefined
      throw error
    })
  await engineInitialization
}

function post(response: WorkerResponse): void {
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

workerScope.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const request = event.data
  if (request.v !== PROTOCOL_VERSION) return

  try {
    if (request.kind === 'start') {
      await ensureEngine()
      const config = request.config
      const nextSession = new GridWorldSession(
        config.width,
        config.height,
        config.start,
        config.goal,
        config.goalMode,
        new Uint16Array(config.hazards),
        config.slipProbability,
        config.discount,
        config.seedHex,
        config.rewards.default,
        config.rewards.boundary,
        config.rewards.hazard,
        config.rewards.goal,
      )
      session?.free()
      session = nextSession
      activeRunId = request.runId
      sequence = 0
      post({
        v: PROTOCOL_VERSION,
        runId: activeRunId,
        sequence,
        kind: 'started',
        engineVersion: engine_version(),
        snapshot: session.snapshot() as Snapshot,
        model: session.transition_model() as ModelOutcome[],
      })
      return
    }

    if (request.runId !== activeRunId || !session) return
    sequence += 1
    const outcome =
      request.kind === 'step'
        ? (session.step(request.action) as StepOutcome)
        : (session.step_policy(new Float64Array(request.probabilities)) as StepOutcome)
    post({
      v: PROTOCOL_VERSION,
      runId: activeRunId,
      sequence,
      kind: 'transition',
      outcome,
      snapshot: session.snapshot() as Snapshot,
      model: session.transition_model() as ModelOutcome[],
    })
  } catch (error) {
    const normalized = normalizeError(error)
    sequence += 1
    post({
      v: PROTOCOL_VERSION,
      runId: request.runId,
      sequence,
      kind: 'error',
      code: normalized.code,
      message: normalized.message,
      recoverable: request.kind !== 'start',
    })
  }
}
