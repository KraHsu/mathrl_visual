import type { ActionCode } from './protocol'

/** Versioned browser/Worker contract for the Chapter 7 tabular TD lab. */
export const TEMPORAL_DIFFERENCE_PROTOCOL_VERSION = 1 as const

export const TEMPORAL_DIFFERENCE_MODES = ['td_zero', 'sarsa', 'n_step_sarsa', 'q_learning'] as const
export type TemporalDifferenceMode = (typeof TEMPORAL_DIFFERENCE_MODES)[number]

export const TEMPORAL_DIFFERENCE_MODE_ALIASES: Record<string, TemporalDifferenceMode> = {
  td: 'td_zero',
  td0: 'td_zero',
  td_zero: 'td_zero',
  'td-zero': 'td_zero',
  state_td: 'td_zero',
  sarsa: 'sarsa',
  on_policy: 'sarsa',
  'on-policy': 'sarsa',
  n_step: 'n_step_sarsa',
  'n-step': 'n_step_sarsa',
  n_step_sarsa: 'n_step_sarsa',
  'n-step-sarsa': 'n_step_sarsa',
  nstepsarsa: 'n_step_sarsa',
  q: 'q_learning',
  q_learning: 'q_learning',
  'q-learning': 'q_learning',
  qlearning: 'q_learning',
}

export interface TemporalDifferenceRewards {
  default: number
  boundary: number
  hazard: number
  goal: number
}

export interface TemporalDifferenceConfig {
  mode: TemporalDifferenceMode
  discount: number
  slipProbability: number
  epsilon: number
  alpha: number
  nStep: number
  maxEpisodes: number
  maxSteps: number
  seedHex: string
  rewards: TemporalDifferenceRewards
}

export type TemporalDifferenceConfigField =
  | 'mode'
  | 'discount'
  | 'slipProbability'
  | 'epsilon'
  | 'alpha'
  | 'nStep'
  | 'maxEpisodes'
  | 'maxSteps'
  | 'seedHex'
  | 'defaultReward'
  | 'boundaryReward'
  | 'hazardReward'
  | 'goalReward'

export interface TemporalDifferenceConfigValidationError {
  code: string
  field: TemporalDifferenceConfigField
  message: string
}

export interface TemporalDifferenceTransition {
  episodeStep: number
  state: number
  action: ActionCode
  actualAction: ActionCode
  nextState: number
  reward: number
  done: boolean
  truncated: boolean
}

export interface TemporalDifferenceUpdate {
  episode: number
  index: number
  state: number
  action: number
  oldValue: number
  newValue: number
  target: number
  tdError: number
  nStepReturn: number
  bootstrapState: number
  bootstrapAction: number
  bootstrapValue: number
  terminal: boolean
}

export interface TemporalDifferenceEpisode {
  number: number
  steps: TemporalDifferenceTransition[]
  updates: TemporalDifferenceUpdate[]
  totalReturn: number
  discountedReturn: number
  length: number
  done: boolean
  truncated: boolean
}

export interface TemporalDifferenceSnapshot {
  mode: TemporalDifferenceMode
  episodeCount: number
  totalSteps: number
  values: number[]
  actionValues: number[][]
  policy: number[]
  policyProbabilities: number[][]
  lastState: number
  lastAction: number
  lastTarget: number
  lastTdError: number
  lastUpdate?: TemporalDifferenceUpdate
  episodeReturnMean: number
  episodeReturnVariance: number
  converged: boolean
  truncated: boolean
  exhausted: boolean
}

export interface TemporalDifferenceOutcome {
  snapshot: TemporalDifferenceSnapshot
  transition: TemporalDifferenceTransition
  updates: TemporalDifferenceUpdate[]
  episode?: TemporalDifferenceEpisode
}

export interface TemporalDifferenceAdvanceOutcome {
  snapshot: TemporalDifferenceSnapshot
  transitions: TemporalDifferenceTransition[]
  updates: TemporalDifferenceUpdate[]
  episodes: TemporalDifferenceEpisode[]
}

export interface TemporalDifferenceAudit {
  modelFree: boolean
  finite: boolean
  traceConsistent: boolean
  probabilitiesNormalized: boolean
  updateCount: number
  message?: string
}

export type TemporalDifferenceWorkerRequest =
  | { v: 1; runId: string; kind: 'start'; config: TemporalDifferenceConfig; restoreEpisodes?: number }
  | { v: 1; runId: string; kind: 'step' }
  | { v: 1; runId: string; kind: 'advance'; transitions: number }
  | { v: 1; runId: string; kind: 'run' }
  | { v: 1; runId: string; kind: 'reset'; seedHex?: string }

export type TemporalDifferenceWorkerResponse =
  | { v: 1; runId: string; kind: 'started'; sequence: number; snapshot: TemporalDifferenceSnapshot; engineVersion: string }
  | { v: 1; runId: string; kind: 'result'; sequence: number; outcome: TemporalDifferenceOutcome | TemporalDifferenceAdvanceOutcome; audit: TemporalDifferenceAudit }
  | { v: 1; runId: string; kind: 'reset'; sequence: number; snapshot: TemporalDifferenceSnapshot; audit: TemporalDifferenceAudit }
  | { v: 1; runId?: string; kind: 'error'; sequence: number; code: string; message: string; recoverable: boolean }

export function canonicalTemporalDifferenceMode(value: unknown): TemporalDifferenceMode | undefined {
  if (typeof value !== 'string') return undefined
  const normalized = value.trim().toLowerCase()
  return TEMPORAL_DIFFERENCE_MODE_ALIASES[normalized]
    ?? (TEMPORAL_DIFFERENCE_MODES.includes(normalized as TemporalDifferenceMode)
      ? normalized as TemporalDifferenceMode
      : undefined)
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function temporalDifferenceConfigValidationError(
  config: unknown,
): TemporalDifferenceConfigValidationError | undefined {
  if (!config || typeof config !== 'object') {
    return { code: 'temporal_difference_mode', field: 'mode', message: 'configuration must be an object' }
  }
  const candidate = config as Partial<TemporalDifferenceConfig>
  if (!canonicalTemporalDifferenceMode(candidate.mode)) return { code: 'temporal_difference_mode', field: 'mode', message: 'unknown TD mode' }
  if (!finite(candidate.discount) || candidate.discount < 0 || candidate.discount > 1) return { code: 'temporal_difference_discount_range', field: 'discount', message: 'discount must be in [0, 1]' }
  if (!finite(candidate.slipProbability) || candidate.slipProbability < 0 || candidate.slipProbability > 1) return { code: 'temporal_difference_slip_range', field: 'slipProbability', message: 'wind probability must be in [0, 1]' }
  if (!finite(candidate.epsilon) || candidate.epsilon < 0 || candidate.epsilon > 1) return { code: 'temporal_difference_epsilon_range', field: 'epsilon', message: 'epsilon must be in [0, 1]' }
  if (!finite(candidate.alpha) || candidate.alpha <= 0 || candidate.alpha > 1) return { code: 'temporal_difference_alpha_range', field: 'alpha', message: 'alpha must be in (0, 1]' }
  if (!Number.isInteger(candidate.nStep) || (candidate.nStep ?? 0) < 1 || (candidate.nStep ?? 0) > 100) return { code: 'temporal_difference_n_step_range', field: 'nStep', message: 'n-step horizon must be 1–100' }
  if (!Number.isInteger(candidate.maxEpisodes) || (candidate.maxEpisodes ?? 0) < 1 || (candidate.maxEpisodes ?? 0) > 100_000) return { code: 'temporal_difference_max_episodes_range', field: 'maxEpisodes', message: 'episode budget must be 1–100,000' }
  if (!Number.isInteger(candidate.maxSteps) || (candidate.maxSteps ?? 0) < 1 || (candidate.maxSteps ?? 0) > 100) return { code: 'temporal_difference_max_steps_range', field: 'maxSteps', message: 'episode step cap must be 1–100' }
  if (typeof candidate.seedHex !== 'string' || !/^(?:0x)?[0-9a-f]+$/i.test(candidate.seedHex.trim())) return { code: 'temporal_difference_seed', field: 'seedHex', message: 'seed must be hexadecimal' }
  const rewards = candidate.rewards
  if (!rewards || typeof rewards !== 'object') return { code: 'temporal_difference_reward_range', field: 'defaultReward', message: 'rewards must be finite' }
  for (const [key, field] of [['default', 'defaultReward'], ['boundary', 'boundaryReward'], ['hazard', 'hazardReward'], ['goal', 'goalReward']] as const) {
    if (!finite(rewards[key]) || Math.abs(rewards[key]) > 1_000_000) return { code: 'temporal_difference_reward_range', field, message: 'rewards must be finite and bounded' }
  }
  return undefined
}

export function acceptsTemporalDifferenceResponse(
  response: unknown,
  runId: string,
  lastSequence: number,
): response is TemporalDifferenceWorkerResponse {
  if (!response || typeof response !== 'object') return false
  const candidate = response as Partial<TemporalDifferenceWorkerResponse>
  if (candidate.v !== TEMPORAL_DIFFERENCE_PROTOCOL_VERSION) return false
  if (candidate.runId !== undefined && candidate.runId !== runId) return false
  return typeof candidate.sequence === 'number' && candidate.sequence > lastSequence
}
