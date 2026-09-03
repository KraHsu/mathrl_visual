/** Versioned browser/Worker contract for the Chapter 10 actor–critic lab. */
export const ACTOR_CRITIC_PROTOCOL_VERSION = 1 as const

export const ACTOR_CRITIC_MODES = ['qac', 'a2c', 'off_policy', 'deterministic'] as const
export type ActorCriticMode = (typeof ACTOR_CRITIC_MODES)[number]

export const ACTOR_CRITIC_MODE_ALIASES: Record<string, ActorCriticMode> = {
  qac: 'qac',
  q_actor_critic: 'qac',
  'q-actor-critic': 'qac',
  a2c: 'a2c',
  advantage: 'a2c',
  advantage_actor_critic: 'a2c',
  'advantage-actor-critic': 'a2c',
  off_policy: 'off_policy',
  'off-policy': 'off_policy',
  offpolicy: 'off_policy',
  importance_sampling: 'off_policy',
  is: 'off_policy',
  deterministic: 'deterministic',
  dpg: 'deterministic',
  deterministic_policy_gradient: 'deterministic',
  'deterministic-policy-gradient': 'deterministic',
}

export interface ActorCriticConfig {
  mode: ActorCriticMode
  actorAlpha: number
  criticAlpha: number
  discount: number
  epsilon: number
  maxEpisodes: number
  maxSteps: number
  seedHex: string
}

export type ActorCriticConfigField =
  | 'mode'
  | 'actorAlpha'
  | 'criticAlpha'
  | 'discount'
  | 'epsilon'
  | 'maxEpisodes'
  | 'maxSteps'
  | 'seedHex'

export interface ActorCriticConfigValidationError {
  code:
    | 'actor_critic_mode'
    | 'actor_critic_actor_alpha_range'
    | 'actor_critic_critic_alpha_range'
    | 'actor_critic_discount_range'
    | 'actor_critic_epsilon_range'
    | 'actor_critic_episodes_range'
    | 'actor_critic_steps_range'
    | 'actor_critic_seed'
  field: ActorCriticConfigField
  message: string
}

export function canonicalActorCriticMode(value: unknown): ActorCriticMode | undefined {
  if (typeof value !== 'string') return undefined
  const normalized = value.trim()
  return ACTOR_CRITIC_MODE_ALIASES[normalized]
    ?? ACTOR_CRITIC_MODE_ALIASES[normalized.toLowerCase()]
}

export function actorCriticConfigValidationError(
  config: unknown,
): ActorCriticConfigValidationError | undefined {
  if (!config || typeof config !== 'object') {
    return { code: 'actor_critic_mode', field: 'mode', message: 'configuration must be an object' }
  }
  const candidate = config as Partial<ActorCriticConfig>
  if (!canonicalActorCriticMode(candidate.mode)) {
    return { code: 'actor_critic_mode', field: 'mode', message: 'choose QAC, A2C, off-policy, or deterministic mode' }
  }
  if (typeof candidate.actorAlpha !== 'number' || !Number.isFinite(candidate.actorAlpha) || candidate.actorAlpha <= 0 || candidate.actorAlpha > 10) {
    return { code: 'actor_critic_actor_alpha_range', field: 'actorAlpha', message: 'actor step size must be finite and in (0, 10]' }
  }
  if (typeof candidate.criticAlpha !== 'number' || !Number.isFinite(candidate.criticAlpha) || candidate.criticAlpha <= 0 || candidate.criticAlpha > 10) {
    return { code: 'actor_critic_critic_alpha_range', field: 'criticAlpha', message: 'critic step size must be finite and in (0, 10]' }
  }
  if (typeof candidate.discount !== 'number' || !Number.isFinite(candidate.discount) || candidate.discount < 0 || candidate.discount > 1) {
    return { code: 'actor_critic_discount_range', field: 'discount', message: 'discount must be finite and in [0, 1]' }
  }
  if (typeof candidate.epsilon !== 'number' || !Number.isFinite(candidate.epsilon) || candidate.epsilon < 0 || candidate.epsilon > 1) {
    return { code: 'actor_critic_epsilon_range', field: 'epsilon', message: 'epsilon must be finite and in [0, 1]' }
  }
  if (typeof candidate.maxEpisodes !== 'number' || !Number.isInteger(candidate.maxEpisodes) || candidate.maxEpisodes < 1 || candidate.maxEpisodes > 100_000) {
    return { code: 'actor_critic_episodes_range', field: 'maxEpisodes', message: 'episode budget must be an integer from 1 through 100000' }
  }
  if (typeof candidate.maxSteps !== 'number' || !Number.isInteger(candidate.maxSteps) || candidate.maxSteps < 1 || candidate.maxSteps > 10) {
    return { code: 'actor_critic_steps_range', field: 'maxSteps', message: 'step cap must be an integer from 1 through 10' }
  }
  if (typeof candidate.seedHex !== 'string' || !/^(?:0x)?[0-9a-f]{1,16}$/i.test(candidate.seedHex.trim())) {
    return { code: 'actor_critic_seed', field: 'seedHex', message: 'seed must be a hexadecimal u64' }
  }
  return undefined
}

export interface ActorCriticStep {
  episode: number
  time: number
  state: number
  action: number
  nextState: number
  reward: number
  done: boolean
  truncated: boolean
  targetProbability: number
  behaviorProbability: number
  importanceRatio: number
  actorProbability: number[]
  scoreGradient: number[]
  qValue: number
  criticValue: number
  bootstrap: number
  tdTarget: number
  tdError: number
  advantage: number
  actorUpdate: number[]
  criticUpdate: number
  actorLogits: number[]
  criticValues: number[]
  qValues: number[][]
}

export interface ActorCriticSnapshot {
  mode: ActorCriticMode
  actorAlpha: number
  criticAlpha: number
  discount: number
  epsilon: number
  maxEpisodes: number
  maxSteps: number
  seedHex: string
  episodeCount: number
  totalSteps: number
  actorLogits: number[][]
  actorProbabilities: number[][]
  criticValues: number[]
  qValues: number[][]
  averageReturn: number
  returnVariance: number
  averageTdError: number
  averageAdvantage: number
  averageImportanceRatio: number
  entropy: number
  converged: boolean
  truncated: boolean
  exhausted: boolean
  lastEpisodeReturn: number
  lastStep?: ActorCriticStep
  history: ActorCriticStep[]
}

export interface ActorCriticOutcome {
  snapshot: ActorCriticSnapshot
  steps: ActorCriticStep[]
}

export interface ActorCriticAdvanceOutcome {
  snapshot: ActorCriticSnapshot
  episodes: ActorCriticOutcome[]
}

export type ActorCriticWorkerRequest =
  | { v: typeof ACTOR_CRITIC_PROTOCOL_VERSION; kind: 'start'; runId: string; sequence: number; config: ActorCriticConfig }
  | { v: typeof ACTOR_CRITIC_PROTOCOL_VERSION; kind: 'step'; runId: string; sequence: number }
  | { v: typeof ACTOR_CRITIC_PROTOCOL_VERSION; kind: 'advance'; runId: string; sequence: number; episodes: number }
  | { v: typeof ACTOR_CRITIC_PROTOCOL_VERSION; kind: 'run'; runId: string; sequence: number }
  | { v: typeof ACTOR_CRITIC_PROTOCOL_VERSION; kind: 'reset'; runId: string; sequence: number; seedHex?: string }

export type ActorCriticWorkerResponse =
  | { v: typeof ACTOR_CRITIC_PROTOCOL_VERSION; kind: 'ready'; runId: string; sequence: number; snapshot: ActorCriticSnapshot }
  | { v: typeof ACTOR_CRITIC_PROTOCOL_VERSION; kind: 'step'; runId: string; sequence: number; outcome: ActorCriticOutcome }
  | { v: typeof ACTOR_CRITIC_PROTOCOL_VERSION; kind: 'advance'; runId: string; sequence: number; outcome: ActorCriticAdvanceOutcome }
  | { v: typeof ACTOR_CRITIC_PROTOCOL_VERSION; kind: 'reset'; runId: string; sequence: number; snapshot: ActorCriticSnapshot }
  | { v: typeof ACTOR_CRITIC_PROTOCOL_VERSION; kind: 'error'; runId: string; sequence: number; code: string; message: string }

export function acceptsActorCriticResponse(value: unknown): value is ActorCriticWorkerResponse {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  const kinds = ['ready', 'step', 'advance', 'reset', 'error']
  return candidate.v === ACTOR_CRITIC_PROTOCOL_VERSION
    && typeof candidate.kind === 'string'
    && kinds.includes(candidate.kind)
    && typeof candidate.runId === 'string'
    && typeof candidate.sequence === 'number'
    && Number.isSafeInteger(candidate.sequence)
    && candidate.sequence >= 0
}
