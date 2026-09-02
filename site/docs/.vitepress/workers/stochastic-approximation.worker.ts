/// <reference lib="webworker" />

/*
 * Chapter 6 Worker adapter.  It owns no numerical algorithm: Rust/Wasm
 * produces each stochastic-approximation row and this file only validates
 * commands, normalizes camel/snake payload spellings, and guards stale runs.
 */
import init, * as wasmModule from '../generated/wasm/mathrl_wasm.js'
import {
  STOCHASTIC_APPROXIMATION_PROTOCOL_VERSION,
  canonicalStochasticApproximationMode,
  canonicalStochasticApproximationRootFunction,
  canonicalStochasticApproximationSchedule,
  stochasticApproximationConfigValidationError,
  type StochasticApproximationAdvanceOutcome,
  type StochasticApproximationConfig,
  type StochasticApproximationDiagnostics,
  type StochasticApproximationIteration,
  type StochasticApproximationMode,
  type StochasticApproximationOutcome,
  type StochasticApproximationRootFunction,
  type StochasticApproximationSchedule,
  type StochasticApproximationSnapshot,
  type StochasticApproximationWorkerRequest,
  type StochasticApproximationWorkerResponse,
} from '../stochasticApproximationProtocol'

const workerScope: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope
type RecordLike = Record<string, unknown>
type WasmEvaluator = RecordLike & { free?: () => void }
type WasmConstructor = {
  new (...args: unknown[]): WasmEvaluator
  newWithRootFunction?: (...args: unknown[]) => WasmEvaluator
}

const moduleRecord = wasmModule as unknown as Record<string, unknown>
let engineInitialization: Promise<void> | undefined
let evaluator: WasmEvaluator | undefined
let activeRunId = ''
let sequence = 0
let activeConfig: StochasticApproximationConfig | undefined

const MAX_ADVANCE = 2_000
const MAX_ITERATIONS = 100_000

async function ensureEngine(): Promise<void> {
  engineInitialization ??= init()
    .then(() => undefined)
    .catch((error: unknown) => {
      engineInitialization = undefined
      throw error
    })
  await engineInitialization
}

function post(response: StochasticApproximationWorkerResponse): void {
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

function record(value: unknown): RecordLike {
  return value && typeof value === 'object' ? (value as RecordLike) : {}
}

function valueAt(source: RecordLike, ...keys: string[]): unknown {
  for (const key of keys) if (key in source) return source[key]
  return undefined
}

function finite(value: unknown, fallback = 0): number {
  const number = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(number) ? number : fallback
}

function integer(value: unknown, fallback = 0): number {
  const number = finite(value, fallback)
  return Number.isInteger(number) ? number : Math.trunc(number)
}

function bool(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function stringMode(value: unknown, fallback: StochasticApproximationMode): StochasticApproximationMode {
  return canonicalStochasticApproximationMode(value) ?? fallback
}

function stringSchedule(
  value: unknown,
  fallback: StochasticApproximationSchedule,
): StochasticApproximationSchedule {
  return canonicalStochasticApproximationSchedule(value) ?? fallback
}

function stringRoot(
  value: unknown,
  fallback: StochasticApproximationRootFunction,
): StochasticApproximationRootFunction {
  return canonicalStochasticApproximationRootFunction(value) ?? fallback
}

function normalizeIteration(value: unknown, fallbackIndex: number): StochasticApproximationIteration {
  const source = record(value)
  const index = integer(valueAt(source, 'index', 'k', 'step'), fallbackIndex)
  const wAfter = finite(valueAt(source, 'wAfter', 'w_after', 'w', 'currentW'))
  const objective = finite(valueAt(source, 'objective', 'loss'))
  const indices = array(valueAt(source, 'batchIndices', 'batch_indices'))
    .map((item) => integer(item, 0))
  return {
    index,
    k: integer(valueAt(source, 'k', 'index'), index),
    wBefore: finite(valueAt(source, 'wBefore', 'w_before')),
    wAfter,
    w: wAfter,
    alpha: finite(valueAt(source, 'alpha')),
    alphaSquared: finite(valueAt(source, 'alphaSquared', 'alpha_squared')),
    observation: finite(valueAt(source, 'observation')),
    gradient: finite(valueAt(source, 'gradient')),
    noise: finite(valueAt(source, 'noise')),
    target: finite(valueAt(source, 'target')),
    error: finite(valueAt(source, 'error')),
    absoluteError: finite(valueAt(source, 'absoluteError', 'absolute_error')),
    objective,
    loss: finite(valueAt(source, 'loss', 'objective'), objective),
    update: finite(valueAt(source, 'update')),
    batchSize: integer(valueAt(source, 'batchSize', 'batch_size'), Math.max(1, indices.length)),
    batchIndices: indices,
    projected: bool(valueAt(source, 'projected')),
  }
}

function normalizeSnapshot(
  value: unknown,
  config: StochasticApproximationConfig,
): StochasticApproximationSnapshot {
  const source = record(value)
  const currentW = finite(valueAt(source, 'currentW', 'current_w', 'w'), config.initialW)
  const history = array(valueAt(source, 'history', 'iterations', 'trajectory'))
    .map((item, index) => normalizeIteration(item, index + 1))
  const lastRaw = valueAt(source, 'lastIteration', 'last_iteration')
  const mode = stringMode(valueAt(source, 'mode'), config.mode)
  const schedule = stringSchedule(valueAt(source, 'schedule'), config.schedule)
  const rootFunction = stringRoot(valueAt(source, 'rootFunction', 'root_function'), config.rootFunction)
  return {
    mode,
    schedule,
    rootFunction,
    target: finite(valueAt(source, 'target', 'root'), config.target),
    root: finite(valueAt(source, 'root', 'target'), config.target),
    initialW: finite(valueAt(source, 'initialW', 'initial_w'), config.initialW),
    currentW,
    w: currentW,
    alpha: finite(valueAt(source, 'alpha'), config.alpha),
    polynomialPower: finite(
      valueAt(source, 'polynomialPower', 'polynomial_power'),
      config.polynomialPower,
    ),
    noiseStd: finite(valueAt(source, 'noiseStd', 'noise_std'), config.noiseStd),
    sampleCount: integer(valueAt(source, 'sampleCount', 'sample_count'), config.sampleCount),
    batchSize: integer(valueAt(source, 'batchSize', 'batch_size'), config.batchSize),
    datasetSize: integer(valueAt(source, 'datasetSize', 'dataset_size'), 0),
    tolerance: finite(valueAt(source, 'tolerance'), config.tolerance),
    seedHex: String(valueAt(source, 'seedHex', 'seed_hex') ?? config.seedHex),
    iterationCount: integer(valueAt(source, 'iterationCount', 'iteration_count'), history.length),
    alphaSum: finite(valueAt(source, 'alphaSum', 'alpha_sum')),
    alphaSquaredSum: finite(valueAt(source, 'alphaSquaredSum', 'alpha_squared_sum')),
    noiseSum: finite(valueAt(source, 'noiseSum', 'noise_sum')),
    noiseMean: finite(valueAt(source, 'noiseMean', 'noise_mean')),
    noiseVariance: finite(valueAt(source, 'noiseVariance', 'noise_variance')),
    error: finite(valueAt(source, 'error'), currentW - config.target),
    rootResidual: finite(valueAt(source, 'rootResidual', 'root_residual')),
    absoluteError: finite(valueAt(source, 'absoluteError', 'absolute_error'), Math.abs(currentW - config.target)),
    objective: finite(valueAt(source, 'objective', 'loss')),
    loss: finite(valueAt(source, 'loss', 'objective')),
    stepSizeConditions: bool(valueAt(source, 'stepSizeConditions', 'step_size_conditions')),
    converged: bool(valueAt(source, 'converged')),
    truncated: bool(valueAt(source, 'truncated')),
    exhausted: bool(valueAt(source, 'exhausted')),
    lastIteration: lastRaw === undefined
      ? history.at(-1)
      : lastRaw === null
        ? undefined
        : normalizeIteration(lastRaw, history.length || 1),
    history,
  }
}

function diagnostics(snapshot: StochasticApproximationSnapshot): StochasticApproximationDiagnostics {
  return {
    alphaSum: snapshot.alphaSum,
    alphaSquaredSum: snapshot.alphaSquaredSum,
    noiseSum: snapshot.noiseSum,
    noiseMean: snapshot.noiseMean,
    noiseVariance: snapshot.noiseVariance,
    error: snapshot.error,
    rootResidual: snapshot.rootResidual,
    objective: snapshot.objective,
    converged: snapshot.converged,
    truncated: snapshot.truncated,
    exhausted: snapshot.exhausted,
    stepSizeConditions: snapshot.stepSizeConditions,
  }
}

function normalizeOutcome(
  value: unknown,
  config: StochasticApproximationConfig,
): StochasticApproximationOutcome | StochasticApproximationAdvanceOutcome {
  const source = record(value)
  const snapshot = normalizeSnapshot(valueAt(source, 'snapshot') ?? value, config)
  const rawIterations = array(valueAt(source, 'iterations', 'history'))
  const one = valueAt(source, 'iteration', 'lastIteration', 'last_iteration')
  const iterations = rawIterations.length > 0
    ? rawIterations.map((item, index) => normalizeIteration(item, snapshot.iterationCount - rawIterations.length + index + 1))
    : one === undefined || one === null
      ? []
      : [normalizeIteration(one, snapshot.iterationCount || 1)]
  const normalizedSnapshot = snapshot.history.length > 0 || iterations.length === 0
    ? snapshot
    : { ...snapshot, history: iterations, lastIteration: iterations.at(-1) }
  const normalizedDiagnostics = diagnostics(normalizedSnapshot)
  if (one !== undefined && one !== null && rawIterations.length === 0) {
    return { snapshot: normalizedSnapshot, iteration: iterations[0], diagnostics: normalizedDiagnostics }
  }
  return { snapshot: normalizedSnapshot, iterations, diagnostics: normalizedDiagnostics }
}

function call(method: string, ...args: unknown[]): unknown {
  if (!evaluator) throw new Error('stochastic approximation evaluator is not initialized')
  const fn = evaluator[method]
  if (typeof fn !== 'function') throw new Error(`Wasm evaluator method ${method} is unavailable`)
  return (fn as (...values: unknown[]) => unknown).apply(evaluator, args)
}

function makeEvaluator(config: StochasticApproximationConfig): WasmEvaluator {
  const Constructor = moduleRecord.StochasticApproximationEvaluator as WasmConstructor | undefined
  if (!Constructor) throw new Error('StochasticApproximationEvaluator export is unavailable')
  const args: unknown[] = [
    config.mode,
    config.schedule,
    config.target,
    config.initialW,
    config.alpha,
    config.polynomialPower,
    config.noiseStd,
    config.sampleCount,
    config.batchSize,
    config.tolerance,
    config.seedHex,
    config.rootFunction,
  ]
  if (typeof Constructor.newWithRootFunction === 'function') {
    return Constructor.newWithRootFunction(...args)
  }
  return new Constructor(...args)
}

async function restore(iterations: number, config: StochasticApproximationConfig): Promise<StochasticApproximationSnapshot> {
  let snapshot = normalizeSnapshot(call('snapshot'), config)
  let remaining = Math.min(Math.max(0, Math.trunc(iterations)), config.sampleCount)
  while (remaining > 0 && !snapshot.exhausted) {
    const chunk = Math.min(remaining, MAX_ADVANCE)
    const outcome = normalizeOutcome(call('advance', chunk), config)
    snapshot = outcome.snapshot
    remaining -= chunk
  }
  return snapshot
}

workerScope.onmessage = async (event: MessageEvent<StochasticApproximationWorkerRequest>) => {
  const request = event.data
  if (request.v !== STOCHASTIC_APPROXIMATION_PROTOCOL_VERSION) return
  try {
    if (request.kind === 'start') {
      const configError = stochasticApproximationConfigValidationError(request.config)
      if (configError) throw configError
      if (
        !Number.isInteger(request.restoreIterations)
        || request.restoreIterations < 0
        || request.restoreIterations > request.config.sampleCount
      ) {
        throw {
          code: 'stochastic_approximation_restore_iterations',
          message: 'restored iteration count must fit the configured sample budget',
        }
      }
      await ensureEngine()
      const nextConfig: StochasticApproximationConfig = {
        ...request.config,
        mode: canonicalStochasticApproximationMode(request.config.mode) ?? request.config.mode,
        schedule: canonicalStochasticApproximationSchedule(request.config.schedule) ?? request.config.schedule,
        rootFunction:
          canonicalStochasticApproximationRootFunction(request.config.rootFunction)
          ?? request.config.rootFunction
          ?? 'linear',
        target: request.config.target ?? request.config.root ?? 0,
      }
      const nextEvaluator = makeEvaluator(nextConfig)
      evaluator?.free?.()
      evaluator = nextEvaluator
      activeConfig = nextConfig
      activeRunId = request.runId
      sequence = 0
      const snapshot = await restore(request.restoreIterations, nextConfig)
      const engineVersion = typeof moduleRecord.engine_version === 'function'
        ? String((moduleRecord.engine_version as () => unknown)())
        : 'unknown'
      post({
        v: STOCHASTIC_APPROXIMATION_PROTOCOL_VERSION,
        runId: activeRunId,
        sequence,
        kind: 'started',
        engineVersion,
        snapshot,
      })
      return
    }

    if (request.runId !== activeRunId || !evaluator || !activeConfig) return
    sequence += 1
    const config = activeConfig

    if (request.kind === 'reset') {
      if (request.seedHex !== undefined && !/^(?:0x)?[0-9a-f]+$/i.test(request.seedHex.trim())) {
        throw {
          code: 'stochastic_approximation_seed',
          message: 'seed must be a hexadecimal u64, for example 5eed',
        }
      }
      const raw = call('reset', request.seedHex)
      const snapshot = normalizeSnapshot(raw, {
        ...config,
        seedHex: request.seedHex ?? config.seedHex,
      })
      activeConfig = { ...config, seedHex: request.seedHex ?? config.seedHex }
      post({
        v: STOCHASTIC_APPROXIMATION_PROTOCOL_VERSION,
        runId: activeRunId,
        sequence,
        kind: 'reset',
        outcome: {
          snapshot,
          iterations: [],
          diagnostics: diagnostics(snapshot),
        },
      })
      return
    }

    if (request.kind === 'iteration' || request.kind === 'step') {
      const raw = call(request.kind === 'step' ? 'step' : 'iteration')
      const outcome = normalizeOutcome(raw, config) as StochasticApproximationOutcome
      post({
        v: STOCHASTIC_APPROXIMATION_PROTOCOL_VERSION,
        runId: activeRunId,
        sequence,
        kind: request.kind,
        outcome,
      })
      return
    }

    if (request.kind === 'advance') {
      if (!Number.isInteger(request.iterations) || request.iterations < 1 || request.iterations > MAX_ADVANCE) {
        throw {
          code: 'stochastic_approximation_advance_iterations',
          message: 'advance iterations must be an integer from 1 through 2,000',
        }
      }
      const raw = call('advance', request.iterations)
      const outcome = normalizeOutcome(raw, config) as StochasticApproximationAdvanceOutcome
      post({
        v: STOCHASTIC_APPROXIMATION_PROTOCOL_VERSION,
        runId: activeRunId,
        sequence,
        kind: 'advanced',
        outcome,
      })
      return
    }

    // `run` is bounded when a count is supplied.  Without a count, emit the
    // final chunk while the snapshot's history retains the complete bounded
    // trajectory; this avoids one giant postMessage for 100k updates.
    const runRequest = request as Extract<StochasticApproximationWorkerRequest, { kind: 'run' }>
    const count = runRequest.iterations
    if (count !== undefined && (!Number.isInteger(count) || count < 1 || count > MAX_ITERATIONS)) {
      throw {
        code: 'stochastic_approximation_run_iterations',
        message: 'run iterations must be an integer from 1 through 100,000',
      }
    }
    let outcome: StochasticApproximationAdvanceOutcome
    if (count !== undefined) {
      // Drain a requested run in bounded chunks.  The public protocol accepts
      // up to 100,000 updates, while each Wasm call remains small enough to
      // yield predictable Worker latency and message sizes.
      let remaining = count
      let last: StochasticApproximationAdvanceOutcome | undefined
      while (remaining > 0) {
        const current = normalizeSnapshot(call('snapshot'), config)
        if (current.exhausted) break
        const chunk = Math.min(remaining, MAX_ADVANCE, current.sampleCount - current.iterationCount)
        if (chunk < 1) break
        const raw = call('advance', chunk)
        last = normalizeOutcome(raw, config) as StochasticApproximationAdvanceOutcome
        const consumed = last.iterations.length
        remaining -= consumed > 0 ? consumed : chunk
        if (last.snapshot.exhausted || consumed === 0) break
      }
      outcome = last ?? {
        snapshot: normalizeSnapshot(call('snapshot'), config),
        iterations: [],
        diagnostics: diagnostics(normalizeSnapshot(call('snapshot'), config)),
      }
    } else {
      let last: StochasticApproximationAdvanceOutcome | undefined
      while (true) {
        const snapshot = normalizeSnapshot(call('snapshot'), config)
        if (snapshot.exhausted) break
        const raw = call('advance', Math.min(MAX_ADVANCE, snapshot.sampleCount - snapshot.iterationCount))
        last = normalizeOutcome(raw, config) as StochasticApproximationAdvanceOutcome
        if (last.snapshot.exhausted) break
      }
      outcome = last ?? {
        snapshot: normalizeSnapshot(call('snapshot'), config),
        iterations: [],
        diagnostics: diagnostics(normalizeSnapshot(call('snapshot'), config)),
      }
    }
    post({
      v: STOCHASTIC_APPROXIMATION_PROTOCOL_VERSION,
      runId: activeRunId,
      sequence,
      kind: 'advanced',
      outcome,
    })
  } catch (error) {
    const normalized = normalizeError(error)
    sequence += 1
    post({
      v: STOCHASTIC_APPROXIMATION_PROTOCOL_VERSION,
      runId: request.runId,
      sequence,
      kind: 'error',
      code: normalized.code,
      message: normalized.message,
      recoverable: request.kind !== 'start',
    })
  }
}
