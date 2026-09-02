/// <reference lib="webworker" />

/*
 * The Worker is intentionally an adapter, not a second MC implementation.
 * Rust owns episode generation and running statistics.  This file only
 * normalizes the wasm-bindgen payload (which has changed spelling a few times
 * during development) and serializes versioned messages to the Vue client.
 */
import init, * as wasmModule from '../generated/wasm/mathrl_wasm.js'
import {
  MONTE_CARLO_MODES,
  MONTE_CARLO_OBJECTIVES,
  MONTE_CARLO_PROTOCOL_VERSION,
  MONTE_CARLO_VISIT_STRATEGIES,
  canonicalMonteCarloMode,
  canonicalMonteCarloVisitStrategy,
  monteCarloConfigValidationError,
  type MonteCarloAudit,
  type MonteCarloConfig,
  type MonteCarloEpisode,
  type MonteCarloMode,
  type MonteCarloObjective,
  type MonteCarloOutcome,
  type MonteCarloReference,
  type MonteCarloReturnRow,
  type MonteCarloSnapshot,
  type MonteCarloStep,
  type MonteCarloVisitStrategy,
  type MonteCarloWorkerRequest,
  type MonteCarloWorkerResponse,
} from '../monteCarloProtocol'

const workerScope: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope
type UnknownRecord = Record<string, unknown>
type WasmFunction = (...args: unknown[]) => unknown
type WasmEvaluator = UnknownRecord & { free?: () => void }

let engineInitialization: Promise<void> | undefined
let evaluator: WasmEvaluator | undefined
let activeRunId = ''
let sequence = 0
let activeConfig: MonteCarloConfig | undefined
let currentSnapshot: MonteCarloSnapshot | undefined
let currentEpisode: MonteCarloEpisode | undefined
let observedReturns: number[] = []

const STATE_COUNT = 16
const ACTION_COUNT = 5
const TERMINAL_STATE = 15

async function ensureEngine(): Promise<void> {
  engineInitialization ??= init()
    .then(() => undefined)
    .catch((error: unknown) => {
      // A failed fetch/compile must remain retryable after a transient error.
      engineInitialization = undefined
      throw error
    })
  await engineInitialization
}

function post(response: MonteCarloWorkerResponse): void {
  workerScope.postMessage(response)
}

function record(value: unknown): UnknownRecord | undefined {
  return typeof value === 'object' && value !== null ? (value as UnknownRecord) : undefined
}

function valueAt(source: UnknownRecord | undefined, ...keys: string[]): unknown {
  if (!source) return undefined
  for (const key of keys) {
    if (key in source) return source[key]
  }
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

function matrixNumbers(value: unknown, rows = STATE_COUNT, columns = ACTION_COUNT): number[][] {
  const source = array(value)
  return Array.from({ length: rows }, (_, row) => {
    const input = array(source[row])
    return Array.from({ length: columns }, (_, column) => finite(input[column]))
  })
}

function vectorNumbers(value: unknown, length = STATE_COUNT, fallback = 0): number[] {
  const source = array(value)
  return Array.from({ length }, (_, index) => finite(source[index], fallback))
}

function actionCode(value: unknown, fallback = 4): number {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    const names: Record<string, number> = {
      up: 0,
      north: 0,
      right: 1,
      east: 1,
      down: 2,
      south: 2,
      left: 3,
      west: 3,
      stay: 4,
      wait: 4,
    }
    return names[normalized] ?? integer(value, fallback)
  }
  const number = integer(value, fallback)
  return number >= 0 && number < ACTION_COUNT ? number : fallback
}

function mode(value: unknown, fallback: MonteCarloMode): MonteCarloMode {
  return canonicalMonteCarloMode(value) ?? fallback
}

function visitStrategy(value: unknown, fallback: MonteCarloVisitStrategy): MonteCarloVisitStrategy {
  return canonicalMonteCarloVisitStrategy(value) ?? fallback
}

function objective(value: unknown, fallback: MonteCarloObjective): MonteCarloObjective {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim().toLowerCase()
  return (MONTE_CARLO_OBJECTIVES as readonly string[]).includes(normalized)
    ? (normalized as MonteCarloObjective)
    : fallback
}

function normalizeStep(value: unknown, index: number, discount: number): MonteCarloStep {
  const source = record(value)
  const reward = finite(valueAt(source, 'reward', 'r'), 0)
  const weight = finite(valueAt(source, 'discountWeight', 'discount_weight'), Math.pow(discount, index))
  return {
    state: integer(valueAt(source, 'state', 'previousState', 'previous_state'), 0),
    action: actionCode(valueAt(source, 'action', 'requestedAction', 'requested_action'), 4) as MonteCarloStep['action'],
    actualAction: actionCode(
      valueAt(source, 'actualAction', 'actual_action'),
      actionCode(valueAt(source, 'action', 'requestedAction', 'requested_action'), 4),
    ) as MonteCarloStep['action'],
    nextState: integer(valueAt(source, 'nextState', 'next_state'), 0),
    reward,
    discountWeight: weight,
    discountedReward: finite(
      valueAt(source, 'discountedReward', 'discountedContribution', 'discounted_contribution'),
      reward * weight,
    ),
    done: bool(valueAt(source, 'done', 'terminated'), false),
    truncated: bool(valueAt(source, 'truncated'), false),
  }
}

function normalizeReturnRow(value: unknown, index: number): MonteCarloReturnRow {
  const source = record(value)
  return {
    time: integer(valueAt(source, 'time', 'index', 't'), index),
    state: integer(valueAt(source, 'state'), 0),
    action: actionCode(valueAt(source, 'action', 'requestedAction', 'requested_action'), 4) as MonteCarloReturnRow['action'],
    return: finite(valueAt(source, 'return', 'returnValue', 'return_value', 'discountedReturn', 'discounted_return')),
    included: bool(valueAt(source, 'included', 'selected', 'credited'), true),
    count: integer(valueAt(source, 'count', 'sampleCount', 'sample_count', 'visits'), 0),
    estimate: finite(valueAt(source, 'estimate', 'qValue', 'q_value', 'value')),
  }
}

function normalizeEpisode(value: unknown, fallbackNumber: number, discount: number): MonteCarloEpisode {
  const source = record(value)
  const steps = array(valueAt(source, 'steps', 'trajectory', 'transitions')).map((item, index) =>
    normalizeStep(item, index, discount),
  )
  const rawReturns = valueAt(source, 'returns', 'returnLedger', 'return_ledger', 'updates')
  const suppliedReturns = array(rawReturns).map((item, index) => normalizeReturnRow(item, index))
  // A few early engines emitted only credited updates.  Keep every realised
  // step in the browser ledger and overlay the supplied row when one exists;
  // otherwise users could not see why a first/initial-visit row was skipped.
  const returns: MonteCarloReturnRow[] = []
  const suppliedByTime = new Map(suppliedReturns.map((row) => [row.time, row]))
  for (const [index, step] of steps.entries()) {
    returns.push(
      suppliedByTime.get(index) ?? {
        time: index,
        state: step.state,
        action: step.action,
        return: suffixReturn(steps, index, discount),
        included: false,
        count: 0,
        estimate: 0,
      },
    )
  }
  // Preserve any explicitly supplied rows if their time index is outside the
  // realised step range (useful for diagnostics from custom engines).
  for (const row of suppliedReturns) {
    if (!returns.some((candidate) => candidate.time === row.time)) returns.push(row)
  }
  const first = steps[0]
  const totalReturn = finite(
    valueAt(source, 'totalReturn', 'returnValue', 'return_value', 'discountedReturn', 'discounted_return'),
    first ? suffixReturn(steps, 0, discount) : 0,
  )
  return {
    number: integer(valueAt(source, 'number', 'index', 'episode'), fallbackNumber),
    startState: integer(valueAt(source, 'startState', 'start_state'), first?.state ?? 0),
    startAction: actionCode(valueAt(source, 'startAction', 'start_action'), first?.action ?? 4) as MonteCarloEpisode['startAction'],
    steps,
    returns,
    totalReturn,
    length: integer(valueAt(source, 'length'), steps.length),
    done: bool(valueAt(source, 'done', 'terminated'), bool(steps.at(-1)?.done)),
    truncated: bool(valueAt(source, 'truncated'), bool(steps.at(-1)?.truncated)),
    randomDraws: array(valueAt(source, 'randomDraws', 'random_draws')).map((draw) => finite(draw)),
  }
}

function suffixReturn(steps: MonteCarloStep[], index: number, discount: number): number {
  let result = 0
  for (let cursor = steps.length - 1; cursor >= index; cursor -= 1) {
    result = steps[cursor].reward + discount * result
  }
  return result
}

function emptySnapshot(config: MonteCarloConfig): MonteCarloSnapshot {
  return {
    mode: config.mode,
    visitStrategy: config.visitStrategy,
    epsilon: config.epsilon,
    episodeCount: 0,
    totalSteps: 0,
    values: vectorNumbers(undefined),
    actionValues: matrixNumbers(undefined),
    visitCounts: matrixNumbers(undefined),
    returnSums: matrixNumbers(undefined),
    variances: matrixNumbers(undefined),
    policyProbabilities: matrixNumbers(undefined),
    policy: Array(STATE_COUNT).fill(-1),
    seedHex: config.seedHex,
    windProbability: config.slipProbability,
    truncated: false,
    episodeReturnMean: 0,
    episodeReturnVariance: 0,
    policyChanges: 0,
    coveredPairs: 0,
    exhausted: false,
  }
}

function normalizeSnapshot(value: unknown, config: MonteCarloConfig): MonteCarloSnapshot {
  const source = record(value)
  const visits = matrixNumbers(valueAt(source, 'visits', 'visitCounts', 'visit_counts'))
  const q = matrixNumbers(valueAt(source, 'qValues', 'q_values', 'actionValues', 'action_values'))
  const returns = matrixNumbers(valueAt(source, 'returns', 'returnSums', 'return_sums'))
  const variances = matrixNumbers(valueAt(source, 'variances', 'variance'))
  const probabilities = matrixNumbers(
    valueAt(source, 'policyProbabilities', 'policy_probabilities', 'probabilities'),
  )
  const policySource = array(valueAt(source, 'policy'))
  const policy = Array.from({ length: STATE_COUNT }, (_, index) => {
    const action = actionCode(policySource[index], -1)
    return index === TERMINAL_STATE || action < 0 ? -1 : action
  })
  const snapshot: MonteCarloSnapshot = {
    mode: mode(valueAt(source, 'mode'), config.mode),
    visitStrategy: visitStrategy(valueAt(source, 'visitStrategy', 'visit_strategy'), config.visitStrategy),
    epsilon: finite(valueAt(source, 'epsilon'), config.epsilon),
    episodeCount: integer(valueAt(source, 'episodeCount', 'episode_count', 'episodes'), 0),
    totalSteps: integer(valueAt(source, 'totalSteps', 'total_steps'), 0),
    values: vectorNumbers(valueAt(source, 'values', 'stateValues', 'state_values')),
    actionValues: q,
    visitCounts: visits,
    returnSums: returns,
    variances,
    policyProbabilities: probabilities,
    policy,
    seedHex: seedHex(valueAt(source, 'seed', 'seedHex', 'seed_hex'), config.seedHex),
    windProbability: config.slipProbability,
    // Exhausting the configured episode budget is not the same thing as a
    // time-limit truncation inside the last episode.  Older adapters may omit
    // both fields, but must not turn `exhausted: true` into a false truncation.
    truncated: bool(valueAt(source, 'truncated'), false),
    episodeReturnMean: finite(valueAt(source, 'episodeReturnMean', 'episode_return_mean', 'meanReturn')),
    episodeReturnVariance: finite(valueAt(source, 'episodeReturnVariance', 'episode_return_variance', 'returnVariance')),
    policyChanges: integer(valueAt(source, 'lastPolicyChanges', 'last_policy_changes', 'policyChanges'), 0),
    coveredPairs: integer(valueAt(source, 'coveredStateActions', 'covered_state_actions', 'coveredPairs'),
      visits.slice(0, TERMINAL_STATE).flat().filter((count) => count > 0).length),
    exhausted: bool(valueAt(source, 'exhausted', 'truncated'), false),
  }
  // Keep terminal and unvisited cells explicit for the UI/audit.
  snapshot.policy[TERMINAL_STATE] = -1
  snapshot.policyProbabilities[TERMINAL_STATE] = Array(ACTION_COUNT).fill(0)
  if (snapshot.totalSteps === 0 && snapshot.episodeCount > 0) {
    // Older adapters did not expose total_steps.  Keep a conservative value
    // from the traces already observed by this Worker rather than inventing a
    // model-side estimate.
    snapshot.totalSteps = currentSnapshot?.totalSteps ?? 0
  }
  if (snapshot.episodeReturnMean === 0 && observedReturns.length > 0) {
    snapshot.episodeReturnMean = observedReturns.reduce((sum, value) => sum + value, 0) / observedReturns.length
    snapshot.episodeReturnVariance = observedReturns.reduce(
      (sum, value) => sum + (value - snapshot.episodeReturnMean) ** 2,
      0,
    ) / observedReturns.length
  }
  snapshot.coveredPairs = visits.slice(0, TERMINAL_STATE).flat().filter((count) => count > 0).length
  snapshot.exhausted = snapshot.exhausted || snapshot.episodeCount >= config.maxEpisodes
  return snapshot
}

function seedHex(value: unknown, fallback: string): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value).toString(16)
  return fallback
}

function normalizeOutcome(value: unknown, config: MonteCarloConfig, fallbackEpisodeNumber: number): MonteCarloOutcome {
  const source = record(value)
  const rawSnapshot = valueAt(source, 'snapshot', 'state') ?? value
  const snapshot = normalizeSnapshot(rawSnapshot, config)
  const generated = array(valueAt(source, 'episodes', 'episodeList', 'episode_list')).map(
    (item, index) => normalizeEpisode(item, index, config.discount),
  )
  const suppliedEpisode = valueAt(source, 'episode', 'lastEpisode', 'last_episode')
  const episode = normalizeEpisode(
    suppliedEpisode ?? generated.at(-1) ?? currentEpisode,
    Math.max(fallbackEpisodeNumber, snapshot.episodeCount - 1, generated.length - 1),
    config.discount,
  )
  const episodes = generated.length > 0
    ? generated
    : episode.length > 0 && Number.isFinite(episode.totalReturn)
      ? [episode]
      : []
  for (const observedEpisode of episodes) {
    if (!Number.isFinite(observedEpisode.totalReturn)) continue
    observedReturns.push(observedEpisode.totalReturn)
    // Keep only a bounded history in the Worker; the UI has its own capped
    // trace list and should not be able to grow memory without limit.
    if (observedReturns.length > 2_000) observedReturns = observedReturns.slice(-2_000)
  }
  if (snapshot.totalSteps === 0 && episodes.length > 0) {
    snapshot.totalSteps = (currentSnapshot?.totalSteps ?? 0) + episodes.reduce(
      (total, observedEpisode) => total + observedEpisode.steps.length,
      0,
    )
  }
  currentSnapshot = snapshot
  currentEpisode = episode
  const rawAudit = record(valueAt(source, 'audit'))
  const derived = makeAudit(snapshot, episode)
  const audit: MonteCarloAudit = {
    ...derived,
    modelFree: rawAudit && typeof valueAt(rawAudit, 'modelFree', 'model_free') === 'boolean'
      ? Boolean(valueAt(rawAudit, 'modelFree', 'model_free'))
      : derived.modelFree,
    modelRows: integer(valueAt(rawAudit, 'modelRows', 'model_rows'), derived.modelRows),
    observedSteps: integer(valueAt(rawAudit, 'observedSteps', 'observed_steps'), snapshot.totalSteps),
    creditedReturns: integer(valueAt(rawAudit, 'creditedReturns', 'credited_returns'), derived.creditedReturns),
    unvisitedPairs: integer(valueAt(rawAudit, 'unvisitedPairs', 'unvisited_pairs'), derived.unvisitedPairs),
    finite: typeof valueAt(rawAudit, 'finite') === 'boolean' ? Boolean(valueAt(rawAudit, 'finite')) : derived.finite,
    message: typeof valueAt(rawAudit, 'message') === 'string' ? String(valueAt(rawAudit, 'message')) : derived.message,
  }
  return { snapshot, episode, episodes: episodes.length > 0 ? episodes : undefined, audit }
}

function makeAudit(snapshot: MonteCarloSnapshot, episode?: MonteCarloEpisode): MonteCarloAudit {
  const finiteValues = [
    ...snapshot.values,
    ...snapshot.actionValues.flat(),
    ...snapshot.visitCounts.flat(),
    ...snapshot.returnSums.flat(),
    ...snapshot.variances.flat(),
    ...snapshot.policyProbabilities.flat(),
  ].every((value) => Number.isFinite(value))
  const unvisitedPairs = snapshot.visitCounts
    .slice(0, TERMINAL_STATE)
    .flat()
    .filter((count) => count <= 0).length
  return {
    modelFree: true,
    modelRows: 0,
    observedSteps: snapshot.totalSteps || episode?.steps.length || 0,
    creditedReturns: episode?.returns.filter((row) => row.included).length ?? 0,
    unvisitedPairs,
    finite: finiteValues,
    message: 'Updates use realised episodic returns; no transition model is read.',
  }
}

function normalizeError(error: unknown): { code: string; message: string } {
  const source = record(error)
  const code = valueAt(source, 'code')
  const message = valueAt(source, 'message')
  if (typeof code === 'string' && typeof message === 'string') return { code, message }
  if (error instanceof Error) return { code: 'worker_error', message: error.message }
  return { code: 'worker_error', message: String(error) }
}

function method(target: UnknownRecord, names: string[]): WasmFunction | undefined {
  for (const name of names) {
    const candidate = target[name]
    if (typeof candidate === 'function') return candidate as WasmFunction
  }
  return undefined
}

function invoke(target: WasmEvaluator, names: string[], ...args: unknown[]): unknown {
  const candidate = method(target, names)
  if (!candidate) throw new Error(`Monte Carlo evaluator does not expose ${names.join('/')}`)
  return candidate.apply(target, args)
}

function constructorCandidates(config: MonteCarloConfig): unknown[][] {
  const modeText = config.mode === 'mc_basic' ? 'mc-basic' : config.mode.replace('_', '-')
  const visitText = config.visitStrategy === 'initial' ? 'initial-visit' : `${config.visitStrategy}-visit`
  const objectiveText = config.objective
  const modeCode = MONTE_CARLO_MODES.indexOf(config.mode)
  const visitCode = MONTE_CARLO_VISIT_STRATEGIES.indexOf(config.visitStrategy)
  const objectiveCode = MONTE_CARLO_OBJECTIVES.indexOf(config.objective)
  const rewards = [
    config.rewards.default,
    config.rewards.boundary,
    config.rewards.hazard,
    config.rewards.goal,
  ]
  // Keep the most likely ABI first. Additional forms make local preview
  // builds tolerant while the Rust adapter settles on its public spelling.
  return [
    [modeText, visitText, objectiveText, config.discount, config.slipProbability, config.epsilon, config.episodesPerStep, config.maxEpisodes, config.maxSteps, config.seedHex, ...rewards],
    [modeCode, visitCode, objectiveCode, config.discount, config.slipProbability, config.epsilon, config.episodesPerStep, config.maxEpisodes, config.maxSteps, config.seedHex, ...rewards],
    [config.discount, config.slipProbability, config.epsilon, config.episodesPerStep, config.maxEpisodes, config.maxSteps, config.seedHex, modeText, visitText, objectiveText, ...rewards],
    [config],
  ]
}

function createEvaluator(config: MonteCarloConfig): WasmEvaluator {
  const exports = wasmModule as unknown as UnknownRecord
  const candidate = exports.MonteCarloEvaluator ?? exports.MonteCarlo ?? exports.McEvaluator
  if (typeof candidate !== 'function') throw new Error('MonteCarloEvaluator export is unavailable')
  const Constructor = candidate as new (...args: unknown[]) => WasmEvaluator
  let lastError: unknown
  for (const args of constructorCandidates(config)) {
    try {
      return new Constructor(...args)
    } catch (error) {
      lastError = error
    }
  }
  throw lastError ?? new Error('could not construct Monte Carlo evaluator')
}

function callSnapshot(config: MonteCarloConfig): MonteCarloSnapshot {
  if (!evaluator) return emptySnapshot(config)
  return normalizeSnapshot(invoke(evaluator, ['snapshot']), config)
}

function callEpisode(config: MonteCarloConfig): MonteCarloOutcome {
  if (!evaluator) throw new Error('Monte Carlo evaluator is not initialized')
  return normalizeOutcome(invoke(evaluator, ['episode', 'sampleEpisode', 'sample_episode']), config, currentSnapshot?.episodeCount ?? 0)
}

function callAdvance(config: MonteCarloConfig, episodes: number): MonteCarloOutcome {
  if (!evaluator) throw new Error('Monte Carlo evaluator is not initialized')
  const result = invoke(evaluator, ['advance', 'runEpisodes', 'run_episodes'], episodes)
  return normalizeOutcome(result, config, currentSnapshot?.episodeCount ?? 0)
}

function callRunToCompletion(config: MonteCarloConfig): MonteCarloOutcome {
  if (!evaluator) throw new Error('Monte Carlo evaluator is not initialized')
  // Prefer bounded `advance` calls even when an adapter exposes a completion
  // helper.  The core completion helper keeps every episode for native
  // inspection; doing that in a browser with a 100k-episode budget would
  // create an avoidable multi-megabyte message.  The Worker only needs the
  // final normalized snapshot/trace.
  const advance = method(evaluator, ['advance', 'runEpisodes', 'run_episodes'])
  if (!advance) {
    const run = method(evaluator, ['run_to_completion', 'runToCompletion', 'run'])
    if (!run) throw new Error('Monte Carlo evaluator does not expose an advance/completion method')
    return normalizeOutcome(run.call(evaluator), config, currentSnapshot?.episodeCount ?? 0)
  }
  let outcome: MonteCarloOutcome = {
    snapshot: currentSnapshot ?? emptySnapshot(config),
    episode: normalizeEpisode(undefined, 0, config.discount),
    audit: makeAudit(currentSnapshot ?? emptySnapshot(config)),
  }
  while (!outcome.snapshot.exhausted) {
    const before = outcome.snapshot.episodeCount
    outcome = callAdvance(
      config,
      Math.min(
        Math.max(config.episodesPerStep, 1),
        config.maxEpisodes - outcome.snapshot.episodeCount,
        2_000,
      ),
    )
    if (outcome.episode.length === 0 && !outcome.episodes?.length) break
    if (outcome.snapshot.episodeCount <= before) break
  }
  return outcome
}

function callReset(config: MonteCarloConfig): MonteCarloOutcome {
  if (!evaluator) throw new Error('Monte Carlo evaluator is not initialized')
  let result: unknown
  const reset = method(evaluator, ['reset'])
  if (!reset) throw new Error('Monte Carlo evaluator does not expose reset')
  try {
    result = reset.call(evaluator, config.seedHex)
  } catch {
    result = reset.call(evaluator)
  }
  observedReturns = []
  const snapshot = normalizeSnapshot(result, config)
  const episode = normalizeEpisode(undefined, 0, config.discount)
  currentSnapshot = snapshot
  currentEpisode = undefined
  return { snapshot, episode, audit: makeAudit(snapshot) }
}

function engineVersion(): string {
  const exports = wasmModule as unknown as UnknownRecord
  const candidate = exports.engine_version ?? exports.engineVersion
  return typeof candidate === 'function' ? String((candidate as WasmFunction).call(exports)) : 'monte-carlo'
}

workerScope.onmessage = async (event: MessageEvent<MonteCarloWorkerRequest>) => {
  const request = event.data
  if (!request || request.v !== MONTE_CARLO_PROTOCOL_VERSION) return
  try {
    if (request.kind === 'start') {
      const configError = monteCarloConfigValidationError(request.config)
      if (configError) throw configError
      if (!Number.isInteger(request.restoreEpisodes) || request.restoreEpisodes < 0 || request.restoreEpisodes > request.config.maxEpisodes) {
        throw { code: 'monte_carlo_restore_episodes', message: 'restored episode count is outside the configured limit' }
      }
      await ensureEngine()
      const next = createEvaluator(request.config)
      evaluator?.free?.()
      evaluator = next
      activeConfig = request.config
      activeRunId = request.runId
      sequence = 0
      currentEpisode = undefined
      observedReturns = []
      currentSnapshot = callSnapshot(request.config)
      if (request.restoreEpisodes > 0) {
        const restored = callAdvance(request.config, request.restoreEpisodes)
        currentSnapshot = restored.snapshot
        currentEpisode = restored.episode
      }
      post({
        v: MONTE_CARLO_PROTOCOL_VERSION,
        runId: activeRunId,
        sequence,
        kind: 'started',
        engineVersion: engineVersion(),
        snapshot: currentSnapshot,
        episode: currentEpisode,
        audit: makeAudit(currentSnapshot, currentEpisode),
        reference: { note: 'Monte Carlo reports estimates from sampled episodes; no exact model reference is used.' },
      })
      return
    }
    if (request.runId !== activeRunId || !evaluator || !activeConfig) return
    sequence += 1
    let outcome: MonteCarloOutcome
    if (request.kind === 'episode') {
      outcome = callEpisode(activeConfig)
      post({ v: MONTE_CARLO_PROTOCOL_VERSION, runId: activeRunId, sequence, kind: 'episode', outcome })
      return
    }
    if (request.kind === 'reset') {
      outcome = callReset(activeConfig)
      post({ v: MONTE_CARLO_PROTOCOL_VERSION, runId: activeRunId, sequence, kind: 'reset', outcome })
      return
    }
    if (request.kind === 'run') {
      if (request.episodes !== undefined) {
        const amount = integer(request.episodes, 0)
        if (amount < 1 || amount > 2_000) {
          throw { code: 'monte_carlo_advance_episodes', message: 'episode batch must be an integer from 1 through 2,000' }
        }
        outcome = callAdvance(activeConfig, amount)
      } else {
        outcome = callRunToCompletion(activeConfig)
      }
    } else {
      const amount = integer(request.episodes, 0)
      if (amount < 1 || amount > 2_000) {
        throw { code: 'monte_carlo_advance_episodes', message: 'episode batch must be an integer from 1 through 2,000' }
      }
      outcome = callAdvance(activeConfig, amount)
    }
    post({ v: MONTE_CARLO_PROTOCOL_VERSION, runId: activeRunId, sequence, kind: 'advanced', outcome })
  } catch (error) {
    const normalized = normalizeError(error)
    sequence += 1
    post({
      v: MONTE_CARLO_PROTOCOL_VERSION,
      runId: request.runId,
      sequence,
      kind: 'error',
      code: normalized.code,
      message: normalized.message,
      recoverable: request.kind !== 'start',
    })
  }
}
