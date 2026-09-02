import type { ActionCode } from './protocol'

/**
 * Versioned browser/Worker contract for the Chapter 5 Monte Carlo lab.
 *
 * The contract deliberately describes observations rather than a transition
 * model.  A Monte Carlo run may report the realised next state and reward for
 * an episode, but it must never require (or reconstruct) a probability table
 * in the browser.
 */
export const MONTE_CARLO_PROTOCOL_VERSION = 1 as const

export const MONTE_CARLO_MODES = ['mc_basic', 'exploring_starts', 'epsilon_greedy'] as const
export type MonteCarloMode = (typeof MONTE_CARLO_MODES)[number]

export const MONTE_CARLO_OBJECTIVES = ['prediction', 'control'] as const
export type MonteCarloObjective = (typeof MONTE_CARLO_OBJECTIVES)[number]

export const MONTE_CARLO_VISIT_STRATEGIES = ['initial', 'first', 'every'] as const
export type MonteCarloVisitStrategy = (typeof MONTE_CARLO_VISIT_STRATEGIES)[number]

/** Names accepted by early Rust/Wasm development builds. */
export const MONTE_CARLO_MODE_ALIASES: Record<string, MonteCarloMode> = {
  basic: 'mc_basic',
  mcBasic: 'mc_basic',
  mc_basic: 'mc_basic',
  'mc-basic': 'mc_basic',
  exploringStarts: 'exploring_starts',
  exploring_starts: 'exploring_starts',
  'exploring-starts': 'exploring_starts',
  es: 'exploring_starts',
  epsilonGreedy: 'epsilon_greedy',
  epsilon_greedy: 'epsilon_greedy',
  'epsilon-greedy': 'epsilon_greedy',
  eg: 'epsilon_greedy',
}

export const MONTE_CARLO_VISIT_ALIASES: Record<string, MonteCarloVisitStrategy> = {
  initial: 'initial',
  initialVisit: 'initial',
  'initial-visit': 'initial',
  first: 'first',
  firstVisit: 'first',
  'first-visit': 'first',
  every: 'every',
  everyVisit: 'every',
  'every-visit': 'every',
}

export interface MonteCarloRewards {
  default: number
  boundary: number
  hazard: number
  goal: number
}

export interface MonteCarloConfig {
  discount: number
  slipProbability: number
  epsilon: number
  /** Number of episodes produced by one `step` command. */
  episodesPerStep: number
  /** Maximum number of episodes accepted by one run. */
  maxEpisodes: number
  /** Episode safety cap. A natural terminal episode may be shorter. */
  maxSteps: number
  seedHex: string
  mode: MonteCarloMode
  visitStrategy: MonteCarloVisitStrategy
  objective: MonteCarloObjective
  /** Exploring-starts mode cycles starts over legal state/action pairs. */
  exploringStarts: boolean
  rewards: MonteCarloRewards
}

export type MonteCarloConfigField =
  | 'discount'
  | 'slipProbability'
  | 'epsilon'
  | 'episodesPerStep'
  | 'maxEpisodes'
  | 'maxSteps'
  | 'seedHex'
  | 'mode'
  | 'visitStrategy'
  | 'objective'
  | 'exploringStarts'
  | 'defaultReward'
  | 'boundaryReward'
  | 'hazardReward'
  | 'goalReward'

export interface MonteCarloConfigValidationError {
  code:
    | 'monte_carlo_discount_range'
    | 'monte_carlo_slip_range'
    | 'monte_carlo_epsilon_range'
    | 'monte_carlo_episodes_per_step_range'
    | 'monte_carlo_max_episodes_range'
    | 'monte_carlo_max_steps_range'
    | 'monte_carlo_seed'
    | 'monte_carlo_mode'
    | 'monte_carlo_visit_strategy'
    | 'monte_carlo_objective'
    | 'monte_carlo_reward_range'
  field: MonteCarloConfigField
  message: string
}

function rewardError(
  field: Extract<
    MonteCarloConfigField,
    'defaultReward' | 'boundaryReward' | 'hazardReward' | 'goalReward'
  >,
): MonteCarloConfigValidationError {
  return {
    code: 'monte_carlo_reward_range',
    field,
    message: 'rewards must be finite with magnitude at most 1,000,000',
  }
}

/**
 * Validate before values reach a wasm-bindgen numeric coercion boundary.
 * Keeping this function pure also makes it useful to a form and to tests.
 */
export function monteCarloConfigValidationError(
  config: unknown,
): MonteCarloConfigValidationError | undefined {
  if (!config || typeof config !== 'object') {
    return {
      code: 'monte_carlo_discount_range',
      field: 'discount',
      message: 'discount must be finite and in [0, 1]',
    }
  }
  const candidate = config as Partial<MonteCarloConfig>
  if (
    typeof candidate.discount !== 'number' ||
    !Number.isFinite(candidate.discount) ||
    candidate.discount < 0 ||
    candidate.discount > 1
  ) {
    return {
      code: 'monte_carlo_discount_range',
      field: 'discount',
      message: 'discount must be finite and in [0, 1]',
    }
  }
  if (
    typeof candidate.slipProbability !== 'number' ||
    !Number.isFinite(candidate.slipProbability) ||
    candidate.slipProbability < 0 ||
    candidate.slipProbability > 1
  ) {
    return {
      code: 'monte_carlo_slip_range',
      field: 'slipProbability',
      message: 'wind probability must be finite and in [0, 1]',
    }
  }
  if (
    typeof candidate.epsilon !== 'number' ||
    !Number.isFinite(candidate.epsilon) ||
    candidate.epsilon < 0 ||
    candidate.epsilon > 1
  ) {
    return {
      code: 'monte_carlo_epsilon_range',
      field: 'epsilon',
      message: 'epsilon must be finite and in [0, 1]',
    }
  }
  if (
    typeof candidate.episodesPerStep !== 'number' ||
    !Number.isInteger(candidate.episodesPerStep) ||
    candidate.episodesPerStep < 1 ||
    candidate.episodesPerStep > 2_000
  ) {
    return {
      code: 'monte_carlo_episodes_per_step_range',
      field: 'episodesPerStep',
      message: 'episodes per step must be an integer from 1 through 2,000',
    }
  }
  if (
    typeof candidate.maxEpisodes !== 'number' ||
    !Number.isInteger(candidate.maxEpisodes) ||
    candidate.maxEpisodes < 1 ||
    candidate.maxEpisodes > 100_000
  ) {
    return {
      code: 'monte_carlo_max_episodes_range',
      field: 'maxEpisodes',
      message: 'maximum episodes must be an integer from 1 through 100,000',
    }
  }
  if (
    typeof candidate.maxSteps !== 'number' ||
    !Number.isInteger(candidate.maxSteps) ||
    candidate.maxSteps < 1 ||
    candidate.maxSteps > 100
  ) {
    return {
      code: 'monte_carlo_max_steps_range',
      field: 'maxSteps',
      message: 'episode step cap must be an integer from 1 through 100',
    }
  }
  if (typeof candidate.seedHex !== 'string' || !/^(?:0x)?[0-9a-f]+$/i.test(candidate.seedHex.trim())) {
    return {
      code: 'monte_carlo_seed',
      field: 'seedHex',
      message: 'seed must be a hexadecimal u64, for example 5eed',
    }
  }
  if (typeof candidate.mode !== 'string' || canonicalMonteCarloMode(candidate.mode) === undefined) {
    return {
      code: 'monte_carlo_mode',
      field: 'mode',
      message: 'the requested Monte Carlo mode is not available',
    }
  }
  if (
    typeof candidate.visitStrategy !== 'string' ||
    canonicalMonteCarloVisitStrategy(candidate.visitStrategy) === undefined
  ) {
    return {
      code: 'monte_carlo_visit_strategy',
      field: 'visitStrategy',
      message: 'the requested visit strategy is not available',
    }
  }
  if (
    typeof candidate.objective !== 'string' ||
    !MONTE_CARLO_OBJECTIVES.includes(candidate.objective as MonteCarloObjective)
  ) {
    return {
      code: 'monte_carlo_objective',
      field: 'objective',
      message: 'objective must be prediction or control',
    }
  }
  if (typeof candidate.exploringStarts !== 'boolean') {
    return {
      code: 'monte_carlo_mode',
      field: 'exploringStarts',
      message: 'exploring-starts flag must be boolean',
    }
  }
  if (!candidate.rewards || typeof candidate.rewards !== 'object') {
    return rewardError('defaultReward')
  }
  const rewardFields = [
    ['default', 'defaultReward'],
    ['boundary', 'boundaryReward'],
    ['hazard', 'hazardReward'],
    ['goal', 'goalReward'],
  ] as const
  for (const [key, field] of rewardFields) {
    const value = candidate.rewards[key]
    if (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > 1_000_000) {
      return rewardError(field)
    }
  }
  return undefined
}

export function canonicalMonteCarloMode(value: unknown): MonteCarloMode | undefined {
  if (typeof value !== 'string') return undefined
  const normalized = value.trim()
  const lower = normalized.toLowerCase()
  return MONTE_CARLO_MODE_ALIASES[normalized] ?? MONTE_CARLO_MODE_ALIASES[lower] ??
    (MONTE_CARLO_MODES.includes(lower as MonteCarloMode)
      ? (lower as MonteCarloMode)
      : undefined)
}

export function canonicalMonteCarloVisitStrategy(
  value: unknown,
): MonteCarloVisitStrategy | undefined {
  if (typeof value !== 'string') return undefined
  const normalized = value.trim()
  const lower = normalized.toLowerCase()
  return MONTE_CARLO_VISIT_ALIASES[normalized] ?? MONTE_CARLO_VISIT_ALIASES[lower] ??
    (MONTE_CARLO_VISIT_STRATEGIES.includes(lower as MonteCarloVisitStrategy)
      ? (lower as MonteCarloVisitStrategy)
      : undefined)
}

export interface MonteCarloStep {
  state: number
  action: ActionCode
  /** Realised action after wind/slip; absent in older worker payloads. */
  actualAction?: ActionCode
  nextState: number
  reward: number
  discountWeight: number
  discountedReward: number
  done: boolean
  truncated: boolean
}

export interface MonteCarloReturnRow {
  time: number
  state: number
  action: ActionCode
  return: number
  included: boolean
  count: number
  estimate: number
}

export interface MonteCarloEpisode {
  number: number
  startState: number
  startAction: ActionCode
  steps: MonteCarloStep[]
  returns: MonteCarloReturnRow[]
  totalReturn: number
  length: number
  done: boolean
  truncated: boolean
  /** Which random branch produced this episode, if the engine reports it. */
  randomDraws?: number[]
}

export interface MonteCarloPolicyProbability {
  state: number
  action: ActionCode
  probability: number
  greedy: boolean
}

export interface MonteCarloSnapshot {
  mode: MonteCarloMode
  visitStrategy: MonteCarloVisitStrategy
  epsilon: number
  episodeCount: number
  totalSteps: number
  values: number[]
  actionValues: number[][]
  visitCounts: number[][]
  returnSums: number[][]
  variances: number[][]
  policyProbabilities: number[][]
  policy: number[]
  lastEpisode?: MonteCarloEpisode
  seedHex: string
  windProbability: number
  truncated: boolean
  episodeReturnMean: number
  episodeReturnVariance: number
  policyChanges: number
  coveredPairs: number
  exhausted: boolean
}

export interface MonteCarloAudit {
  /** Always true for the intended evaluator: updates use realised episodes. */
  modelFree: boolean
  modelRows: number
  observedSteps: number
  creditedReturns: number
  unvisitedPairs: number
  finite: boolean
  message?: string
}

export interface MonteCarloOutcome {
  snapshot: MonteCarloSnapshot
  episode: MonteCarloEpisode
  /** Batch-compatible payloads; older adapters may expose only `episode`. */
  episodes?: MonteCarloEpisode[]
  audit: MonteCarloAudit
}

export interface MonteCarloReference {
  /** Optional diagnostic only; a MC learner has no exact model reference. */
  values?: number[]
  actionValues?: number[][]
  note: string
}

export interface MonteCarloWorkerStart {
  v: typeof MONTE_CARLO_PROTOCOL_VERSION
  runId: string
  kind: 'start'
  config: MonteCarloConfig
  restoreEpisodes: number
}

export type MonteCarloWorkerRequest =
  | MonteCarloWorkerStart
  | {
      v: typeof MONTE_CARLO_PROTOCOL_VERSION
      runId: string
      kind: 'episode'
    }
  | {
      v: typeof MONTE_CARLO_PROTOCOL_VERSION
      runId: string
      kind: 'advance'
      episodes: number
    }
  | {
      v: typeof MONTE_CARLO_PROTOCOL_VERSION
      runId: string
      /** Omit `episodes` for a complete-budget run; include it for a bounded compatibility call. */
      kind: 'run'
      episodes?: number
    }
  | {
      v: typeof MONTE_CARLO_PROTOCOL_VERSION
      runId: string
      kind: 'reset'
    }

export type MonteCarloWorkerResponse =
  | {
      v: typeof MONTE_CARLO_PROTOCOL_VERSION
      runId: string
      sequence: number
      kind: 'started'
      engineVersion: string
      snapshot: MonteCarloSnapshot
      episode?: MonteCarloEpisode
      audit: MonteCarloAudit
      reference?: MonteCarloReference
    }
  | {
      v: typeof MONTE_CARLO_PROTOCOL_VERSION
      runId: string
      sequence: number
      kind: 'episode' | 'advanced' | 'reset'
      outcome: MonteCarloOutcome
    }
  | {
      v: typeof MONTE_CARLO_PROTOCOL_VERSION
      runId: string
      sequence: number
      kind: 'error'
      code: string
      message: string
      recoverable: boolean
    }

export function acceptsMonteCarloResponse(
  response: MonteCarloWorkerResponse,
  currentRunId: string,
  lastSequence: number,
): boolean {
  return (
    response.v === MONTE_CARLO_PROTOCOL_VERSION &&
    response.runId === currentRunId &&
    response.sequence > lastSequence
  )
}
