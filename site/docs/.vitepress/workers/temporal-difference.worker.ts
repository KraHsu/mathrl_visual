/// <reference lib="webworker" />

/*
 * Chapter 7 adapter.  Rust owns the environment, random stream, and TD
 * update; this worker only keeps the run id/sequence guard and normalises the
 * wasm-bindgen payload so an older generated glue file remains readable.
 */
import init, * as wasmModule from '../generated/wasm/mathrl_wasm.js'
import {
  TEMPORAL_DIFFERENCE_PROTOCOL_VERSION,
  canonicalTemporalDifferenceMode,
  temporalDifferenceConfigValidationError,
  type TemporalDifferenceAdvanceOutcome,
  type TemporalDifferenceAudit,
  type TemporalDifferenceConfig,
  type TemporalDifferenceEpisode,
  type TemporalDifferenceMode,
  type TemporalDifferenceOutcome,
  type TemporalDifferenceSnapshot,
  type TemporalDifferenceUpdate,
  type TemporalDifferenceWorkerRequest,
  type TemporalDifferenceWorkerResponse,
  type TemporalDifferenceTransition,
} from '../temporalDifferenceProtocol'

const scope: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope
type RecordLike = Record<string, unknown>
type WasmEvaluator = RecordLike & { free?: () => void }
type WasmConstructor = new (...args: unknown[]) => WasmEvaluator
let evaluator: WasmEvaluator | undefined
let initPromise: Promise<void> | undefined
let activeRunId = ''
let sequence = 0
let config: TemporalDifferenceConfig | undefined
let lastSnapshot: TemporalDifferenceSnapshot | undefined

function record(value: unknown): RecordLike | undefined { return value && typeof value === 'object' ? value as RecordLike : undefined }
function valueAt(source: RecordLike | undefined, ...keys: string[]): unknown { if (!source) return undefined; for (const key of keys) if (key in source) return source[key]; return undefined }
function numberAt(source: RecordLike | undefined, fallback: number, ...keys: string[]): number { const value = valueAt(source, ...keys); const parsed = typeof value === 'number' ? value : Number(value); return Number.isFinite(parsed) ? parsed : fallback }
function boolAt(source: RecordLike | undefined, fallback: boolean, ...keys: string[]): boolean { const value = valueAt(source, ...keys); return typeof value === 'boolean' ? value : fallback }
function arrayAt(source: RecordLike | undefined, ...keys: string[]): unknown[] { const value = valueAt(source, ...keys); return Array.isArray(value) ? value : [] }
function finiteArray(value: unknown, length: number): number[] { const source = Array.isArray(value) ? value : []; return Array.from({ length }, (_, index) => { const parsed = typeof source[index] === 'number' ? source[index] as number : Number(source[index]); return Number.isFinite(parsed) ? parsed : 0 }) }

async function ensureInit(): Promise<void> {
  initPromise ??= init().then(() => undefined).catch((error: unknown) => { initPromise = undefined; throw error })
  await initPromise
}

function constructor(): WasmConstructor | undefined {
  const candidate = (wasmModule as RecordLike).TemporalDifferenceEvaluator
  return typeof candidate === 'function' ? candidate as WasmConstructor : undefined
}

function instantiate(next: TemporalDifferenceConfig): WasmEvaluator {
  const Ctor = constructor()
  if (!Ctor) throw new Error('TemporalDifferenceEvaluator is missing from the Wasm bundle')
  return new Ctor(
    next.mode,
    next.discount,
    next.slipProbability,
    next.epsilon,
    next.alpha,
    next.nStep,
    next.maxEpisodes,
    next.maxSteps,
    next.seedHex,
    next.rewards.default,
    next.rewards.boundary,
    next.rewards.hazard,
    next.rewards.goal,
  )
}

function call(target: WasmEvaluator, names: string[], ...args: unknown[]): unknown {
  for (const name of names) { const method = target[name]; if (typeof method === 'function') return (method as (...values: unknown[]) => unknown).apply(target, args) }
  throw new Error(`Wasm evaluator method is missing: ${names.join('/')}`)
}

function action(value: unknown, fallback = 4): number {
  if (typeof value === 'string') { const map: Record<string, number> = { up: 0, right: 1, down: 2, left: 3, stay: 4 }; const mapped = map[value.toLowerCase()]; if (mapped !== undefined) return mapped; const parsed = Number(value); return Number.isInteger(parsed) ? parsed : fallback }
  const parsed = Number(value); return Number.isInteger(parsed) && parsed >= 0 && parsed <= 4 ? parsed : fallback
}

function normalizeTransition(value: unknown, index = 0): TemporalDifferenceTransition {
  const source = record(value)
  return {
    episodeStep: numberAt(source, index, 'episodeStep', 'episode_step', 'step', 'index'),
    state: numberAt(source, 0, 'state', 'previousState', 'previous_state'),
    action: action(valueAt(source, 'action', 'requestedAction', 'requested_action')) as TemporalDifferenceTransition['action'],
    actualAction: action(valueAt(source, 'actualAction', 'actual_action'), action(valueAt(source, 'action', 'requestedAction', 'requested_action'))) as TemporalDifferenceTransition['actualAction'],
    nextState: numberAt(source, 0, 'nextState', 'next_state'),
    reward: numberAt(source, 0, 'reward'),
    done: boolAt(source, false, 'done', 'terminated'),
    truncated: boolAt(source, false, 'truncated'),
  }
}

function normalizeUpdate(value: unknown, index = 0): TemporalDifferenceUpdate {
  const source = record(value)
  return {
    episode: numberAt(source, 1, 'episode'),
    index: numberAt(source, index, 'index', 'step'),
    state: numberAt(source, 0, 'state'),
    action: action(valueAt(source, 'action'), 255),
    oldValue: numberAt(source, 0, 'oldValue', 'old_value'),
    newValue: numberAt(source, 0, 'newValue', 'new_value'),
    target: numberAt(source, 0, 'target', 'tdTarget', 'td_target'),
    tdError: numberAt(source, 0, 'tdError', 'td_error', 'error'),
    nStepReturn: numberAt(source, numberAt(source, 0, 'target'), 'nStepReturn', 'n_step_return'),
    bootstrapState: numberAt(source, 0, 'bootstrapState', 'bootstrap_state'),
    bootstrapAction: action(valueAt(source, 'bootstrapAction', 'bootstrap_action'), 255),
    bootstrapValue: numberAt(source, 0, 'bootstrapValue', 'bootstrap_value'),
    terminal: boolAt(source, false, 'terminal', 'done', 'terminated'),
  }
}

function normalizeSnapshot(value: unknown, fallback: TemporalDifferenceConfig): TemporalDifferenceSnapshot {
  const source = record(value)
  const values = finiteArray(valueAt(source, 'values', 'stateValues', 'state_values'), 16)
  const actionValues = Array.from({ length: 16 }, (_, state) => finiteArray(arrayAt(source, 'actionValues', 'action_values', 'qValues', 'q_values')[state], 5))
  const policy = finiteArray(valueAt(source, 'policy'), 16).map((value) => Math.trunc(value))
  const policyProbabilities = Array.from({ length: 16 }, (_, state) => finiteArray(arrayAt(source, 'policyProbabilities', 'policy_probabilities', 'probabilities')[state], 5))
  const lastUpdateRaw = valueAt(source, 'lastUpdate', 'last_update')
  return {
    mode: canonicalTemporalDifferenceMode(valueAt(source, 'mode')) ?? fallback.mode,
    episodeCount: numberAt(source, 0, 'episodeCount', 'episode_count'),
    totalSteps: numberAt(source, 0, 'totalSteps', 'total_steps'),
    values,
    actionValues,
    policy,
    policyProbabilities,
    lastState: numberAt(source, 0, 'lastState', 'last_state'),
    lastAction: action(valueAt(source, 'lastAction', 'last_action'), 255),
    lastTarget: numberAt(source, 0, 'lastTarget', 'last_target'),
    lastTdError: numberAt(source, 0, 'lastTdError', 'last_td_error'),
    lastUpdate: lastUpdateRaw ? normalizeUpdate(lastUpdateRaw) : undefined,
    episodeReturnMean: numberAt(source, 0, 'episodeReturnMean', 'episode_return_mean'),
    episodeReturnVariance: numberAt(source, 0, 'episodeReturnVariance', 'episode_return_variance'),
    converged: boolAt(source, false, 'converged'),
    truncated: boolAt(source, false, 'truncated'),
    exhausted: boolAt(source, false, 'exhausted'),
  }
}

function normalizeEpisode(value: unknown, fallbackNumber: number): TemporalDifferenceEpisode {
  const source = record(value)
  const rawSteps = arrayAt(source, 'steps', 'trajectory', 'transitions')
  const rawUpdates = arrayAt(source, 'updates')
  return {
    number: numberAt(source, fallbackNumber, 'number', 'episode'),
    steps: rawSteps.map((row, index) => normalizeTransition(row, index)),
    updates: rawUpdates.map((row, index) => normalizeUpdate(row, index)),
    totalReturn: numberAt(source, 0, 'totalReturn', 'total_return', 'return'),
    discountedReturn: numberAt(source, 0, 'discountedReturn', 'discounted_return'),
    length: numberAt(source, rawSteps.length, 'length'),
    done: boolAt(source, false, 'done', 'terminated'),
    truncated: boolAt(source, false, 'truncated'),
  }
}

function normalizeOutcome(value: unknown, fallback: TemporalDifferenceConfig): TemporalDifferenceOutcome | TemporalDifferenceAdvanceOutcome {
  const source = record(value)
  const snapshot = normalizeSnapshot(valueAt(source, 'snapshot'), fallback)
  const rawTransitions = arrayAt(source, 'transitions')
  const rawUpdates = arrayAt(source, 'updates')
  const rawEpisodes = arrayAt(source, 'episodes')
  if (rawTransitions.length || rawEpisodes.length) {
    return { snapshot, transitions: rawTransitions.map((row, index) => normalizeTransition(row, index)), updates: rawUpdates.map((row, index) => normalizeUpdate(row, index)), episodes: rawEpisodes.map((row, index) => normalizeEpisode(row, index + 1)) }
  }
  const transition = normalizeTransition(valueAt(source, 'transition', 'step'), snapshot.totalSteps > 0 ? snapshot.totalSteps - 1 : 0)
  const updates = rawUpdates.map((row, index) => normalizeUpdate(row, index))
  const episodeRaw = valueAt(source, 'episode')
  return { snapshot, transition, updates, ...(episodeRaw ? { episode: normalizeEpisode(episodeRaw, snapshot.episodeCount) } : {}) }
}

function audit(snapshot: TemporalDifferenceSnapshot, outcome?: TemporalDifferenceOutcome | TemporalDifferenceAdvanceOutcome): TemporalDifferenceAudit {
  const rows: TemporalDifferenceTransition[] = outcome && 'transition' in outcome ? [outcome.transition] : outcome?.transitions ?? []
  const finite = [...snapshot.values.flatMap((value) => [value]), ...snapshot.actionValues.flat()].every(Number.isFinite)
  const probabilitiesNormalized = snapshot.policyProbabilities.slice(0, 15).every((row) => { const sum = row.reduce((total, value) => total + value, 0); return row.every(Number.isFinite) && Math.abs(sum - 1) < 1e-8 })
  const traceConsistent = rows.every((row) => row.state >= 0 && row.state < 16 && row.nextState >= 0 && row.nextState < 16 && Number.isFinite(row.reward))
  return { modelFree: true, finite, traceConsistent, probabilitiesNormalized, updateCount: outcome?.updates.length ?? 0 }
}

function post(response: TemporalDifferenceWorkerResponse): void { scope.postMessage(response) }
function errorResponse(error: unknown, recoverable = true): void {
  const source = record(error)
  const code = typeof source?.code === 'string' ? source.code : 'temporal_difference_worker'
  const message = error instanceof Error
    ? error.message
    : typeof source?.message === 'string' ? source.message : String(error)
  post({ v: TEMPORAL_DIFFERENCE_PROTOCOL_VERSION, runId: activeRunId || undefined, kind: 'error', sequence: ++sequence, code, message, recoverable })
}

async function start(request: Extract<TemporalDifferenceWorkerRequest, { kind: 'start' }>): Promise<void> {
  activeRunId = request.runId
  const validation = temporalDifferenceConfigValidationError(request.config)
  if (validation) { errorResponse(validation); return }
  await ensureInit()
  evaluator?.free?.()
  config = { ...request.config, mode: canonicalTemporalDifferenceMode(request.config.mode) ?? request.config.mode }
  evaluator = instantiate(config)
  sequence = 0
  if (request.restoreEpisodes && request.restoreEpisodes > 0) {
    const amount = Math.min(Math.trunc(request.restoreEpisodes), config.maxEpisodes)
    for (let index = 0; index < amount; index += 1) call(evaluator, ['step', 'episode'])
  }
  lastSnapshot = normalizeSnapshot(call(evaluator, ['snapshot']), config)
  post({ v: TEMPORAL_DIFFERENCE_PROTOCOL_VERSION, runId: activeRunId, kind: 'started', sequence: ++sequence, snapshot: lastSnapshot, engineVersion: 'td-tabular-v1' })
}

function result(request: TemporalDifferenceWorkerRequest, raw: unknown): void {
  if (!config) throw new Error('TD evaluator has not started')
  const normalized = normalizeOutcome(raw, config)
  const snapshot = normalized.snapshot
  lastSnapshot = snapshot
  post({ v: TEMPORAL_DIFFERENCE_PROTOCOL_VERSION, runId: activeRunId, kind: 'result', sequence: ++sequence, outcome: normalized, audit: audit(snapshot, normalized) })
}

async function handle(request: TemporalDifferenceWorkerRequest): Promise<void> {
  if (request.v !== TEMPORAL_DIFFERENCE_PROTOCOL_VERSION) return
  if (request.kind === 'start') { await start(request); return }
  if (request.runId !== activeRunId || !evaluator || !config) return
  if (request.kind === 'reset') {
    const raw = call(evaluator, ['reset'], request.seedHex ?? null)
    lastSnapshot = normalizeSnapshot(raw, config)
    post({ v: TEMPORAL_DIFFERENCE_PROTOCOL_VERSION, runId: activeRunId, kind: 'reset', sequence: ++sequence, snapshot: lastSnapshot, audit: audit(lastSnapshot) })
    return
  }
  if (request.kind === 'step') { result(request, call(evaluator, ['step', 'iteration', 'episode'])); return }
  if (request.kind === 'advance') { result(request, call(evaluator, ['advance', 'runIterations', 'run_iterations'], Math.max(1, Math.min(2_000, Math.trunc(request.transitions))))); return }
  result(request, call(evaluator, ['advance', 'runToCompletion', 'run_to_completion'], 100))
}

scope.addEventListener('message', (event: MessageEvent<TemporalDifferenceWorkerRequest>) => { void handle(event.data).catch((error: unknown) => errorResponse(error, false)) })
