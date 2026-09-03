/** Versioned browser/Worker contract for the Chapter 9 policy-gradient lab. */
export const POLICY_GRADIENT_PROTOCOL_VERSION = 1 as const

export const POLICY_GRADIENT_MODES = ['reinforce', 'baseline'] as const
export type PolicyGradientMode = (typeof POLICY_GRADIENT_MODES)[number]

export const POLICY_GRADIENT_MODE_ALIASES: Record<string, PolicyGradientMode> = {
  reinforce: 'reinforce',
  mc: 'reinforce',
  policy_gradient: 'reinforce',
  'policy-gradient': 'reinforce',
  baseline: 'baseline',
  state_baseline: 'baseline',
  'state-baseline': 'baseline',
  reinforce_baseline: 'baseline',
}

export interface PolicyGradientConfig {
  mode: PolicyGradientMode
  alpha: number
  discount: number
  noiseStd: number
  maxEpisodes: number
  seedHex: string
}

export type PolicyGradientConfigField =
  | 'mode'
  | 'alpha'
  | 'discount'
  | 'noiseStd'
  | 'maxEpisodes'
  | 'seedHex'

export interface PolicyGradientConfigValidationError {
  code:
    | 'policy_gradient_mode'
    | 'policy_gradient_alpha_range'
    | 'policy_gradient_discount_range'
    | 'policy_gradient_noise_range'
    | 'policy_gradient_episodes_range'
    | 'policy_gradient_seed'
  field: PolicyGradientConfigField
  message: string
}

export function canonicalPolicyGradientMode(value: unknown): PolicyGradientMode | undefined {
  if (typeof value !== 'string') return undefined
  const normalized = value.trim()
  return POLICY_GRADIENT_MODE_ALIASES[normalized]
    ?? POLICY_GRADIENT_MODE_ALIASES[normalized.toLowerCase()]
}

export function policyGradientConfigValidationError(
  config: unknown,
): PolicyGradientConfigValidationError | undefined {
  if (!config || typeof config !== 'object') {
    return { code: 'policy_gradient_mode', field: 'mode', message: 'configuration must be an object' }
  }
  const candidate = config as Partial<PolicyGradientConfig>
  if (!canonicalPolicyGradientMode(candidate.mode)) {
    return { code: 'policy_gradient_mode', field: 'mode', message: 'choose REINFORCE or baseline mode' }
  }
  if (typeof candidate.alpha !== 'number' || !Number.isFinite(candidate.alpha) || candidate.alpha <= 0 || candidate.alpha > 10) {
    return { code: 'policy_gradient_alpha_range', field: 'alpha', message: 'alpha must be finite and in (0, 10]' }
  }
  if (typeof candidate.discount !== 'number' || !Number.isFinite(candidate.discount) || candidate.discount < 0 || candidate.discount > 1) {
    return { code: 'policy_gradient_discount_range', field: 'discount', message: 'discount must be finite and in [0, 1]' }
  }
  if (typeof candidate.noiseStd !== 'number' || !Number.isFinite(candidate.noiseStd) || candidate.noiseStd < 0 || candidate.noiseStd > 1_000_000) {
    return { code: 'policy_gradient_noise_range', field: 'noiseStd', message: 'noise scale must be finite and in [0, 1e6]' }
  }
  if (typeof candidate.maxEpisodes !== 'number' || !Number.isInteger(candidate.maxEpisodes) || candidate.maxEpisodes < 1 || candidate.maxEpisodes > 100_000) {
    return { code: 'policy_gradient_episodes_range', field: 'maxEpisodes', message: 'episode budget must be an integer from 1 through 100000' }
  }
  if (typeof candidate.seedHex !== 'string' || !/^(?:0x)?[0-9a-f]{1,16}$/i.test(candidate.seedHex.trim())) {
    return { code: 'policy_gradient_seed', field: 'seedHex', message: 'seed must be a hexadecimal u64' }
  }
  return undefined
}

export interface PolicyGradientStep {
  episode: number
  state: number
  action: number
  rewardMean: number
  noise: number
  reward: number
  returnValue: number
  baseline: number
  advantage: number
  probabilities: number[]
  scoreGradient: number[]
  parameterUpdate: number[]
  logits: number[]
  objective: number
  entropy: number
  gradientNorm: number
}

export interface PolicyGradientSnapshot {
  mode: PolicyGradientMode
  alpha: number
  discount: number
  noiseStd: number
  maxEpisodes: number
  seedHex: string
  episodeCount: number
  logits: number[][]
  probabilities: number[][]
  baselineValues: number[]
  baselineCounts: number[]
  objective: number
  entropy: number
  gradientNorm: number
  returnMean: number
  returnVariance: number
  advantageVariance: number
  converged: boolean
  truncated: boolean
  exhausted: boolean
  lastStep?: PolicyGradientStep
  history: PolicyGradientStep[]
}

export interface PolicyGradientOutcome {
  snapshot: PolicyGradientSnapshot
  step: PolicyGradientStep
}

export interface PolicyGradientAdvanceOutcome {
  snapshot: PolicyGradientSnapshot
  steps: PolicyGradientStep[]
}

export type PolicyGradientWorkerRequest =
  | { v: typeof POLICY_GRADIENT_PROTOCOL_VERSION; kind: 'start'; runId: string; sequence: number; config: PolicyGradientConfig }
  | { v: typeof POLICY_GRADIENT_PROTOCOL_VERSION; kind: 'step'; runId: string; sequence: number }
  | { v: typeof POLICY_GRADIENT_PROTOCOL_VERSION; kind: 'advance'; runId: string; sequence: number; episodes: number }
  | { v: typeof POLICY_GRADIENT_PROTOCOL_VERSION; kind: 'run'; runId: string; sequence: number }
  | { v: typeof POLICY_GRADIENT_PROTOCOL_VERSION; kind: 'reset'; runId: string; sequence: number; seedHex?: string }

export type PolicyGradientWorkerResponse =
  | { v: typeof POLICY_GRADIENT_PROTOCOL_VERSION; kind: 'ready'; runId: string; sequence: number; snapshot: PolicyGradientSnapshot }
  | { v: typeof POLICY_GRADIENT_PROTOCOL_VERSION; kind: 'step'; runId: string; sequence: number; outcome: PolicyGradientOutcome }
  | { v: typeof POLICY_GRADIENT_PROTOCOL_VERSION; kind: 'advance'; runId: string; sequence: number; outcome: PolicyGradientAdvanceOutcome }
  | { v: typeof POLICY_GRADIENT_PROTOCOL_VERSION; kind: 'reset'; runId: string; sequence: number; snapshot: PolicyGradientSnapshot }
  | { v: typeof POLICY_GRADIENT_PROTOCOL_VERSION; kind: 'error'; runId: string; sequence: number; code: string; message: string }

export function acceptsPolicyGradientResponse(
  value: unknown,
): value is PolicyGradientWorkerResponse {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  const kinds = ['ready', 'step', 'advance', 'reset', 'error']
  return candidate.v === POLICY_GRADIENT_PROTOCOL_VERSION
    && typeof candidate.kind === 'string'
    && kinds.includes(candidate.kind)
    && typeof candidate.runId === 'string'
    && typeof candidate.sequence === 'number'
    && Number.isSafeInteger(candidate.sequence)
    && candidate.sequence >= 0
}
