import type { ActionCode } from './protocol'

/** Versioned browser/Worker contract for the Chapter 8 value-function lab. */
export const VALUE_FUNCTION_PROTOCOL_VERSION = 1 as const

export const VALUE_FUNCTION_MODES = ['td_linear', 'sarsa_linear', 'q_learning_linear', 'deep_q'] as const
export type ValueFunctionMode = (typeof VALUE_FUNCTION_MODES)[number]
export const VALUE_FUNCTION_MODE_ALIASES: Record<string, ValueFunctionMode> = {
  td: 'td_linear',
  td_linear: 'td_linear',
  'td-linear': 'td_linear',
  state_td: 'td_linear',
  sarsa: 'sarsa_linear',
  sarsa_linear: 'sarsa_linear',
  'sarsa-linear': 'sarsa_linear',
  q: 'q_learning_linear',
  q_learning: 'q_learning_linear',
  q_learning_linear: 'q_learning_linear',
  'q-learning': 'q_learning_linear',
  'q-learning-linear': 'q_learning_linear',
  dqn: 'deep_q',
  deep_q: 'deep_q',
  'deep-q': 'deep_q',
  deep_q_learning: 'deep_q',
}

export const VALUE_FUNCTION_FEATURE_MAPS = ['coordinates', 'bias_coordinates', 'polynomial', 'fourier', 'one_hot'] as const
export type ValueFunctionFeatureMap = (typeof VALUE_FUNCTION_FEATURE_MAPS)[number]
export const VALUE_FUNCTION_FEATURE_ALIASES: Record<string, ValueFunctionFeatureMap> = {
  xy: 'coordinates',
  coordinates: 'coordinates',
  linear: 'coordinates',
  bias: 'bias_coordinates',
  bias_coordinates: 'bias_coordinates',
  'bias-coordinates': 'bias_coordinates',
  polynomial: 'polynomial',
  poly: 'polynomial',
  quadratic: 'polynomial',
  fourier: 'fourier',
  'fourier-basis': 'fourier',
  fourier_basis: 'fourier',
  one_hot: 'one_hot',
  'one-hot': 'one_hot',
  onehot: 'one_hot',
  tabular: 'one_hot',
}

export interface ValueFunctionRewards { default: number; boundary: number; hazard: number; goal: number }
export interface ValueFunctionConfig {
  mode: ValueFunctionMode
  featureMap: ValueFunctionFeatureMap
  discount: number
  slipProbability: number
  epsilon: number
  alpha: number
  replayCapacity: number
  batchSize: number
  targetUpdateInterval: number
  maxEpisodes: number
  maxSteps: number
  seedHex: string
  rewards: ValueFunctionRewards
}
export type ValueFunctionConfigField = keyof ValueFunctionConfig | 'defaultReward' | 'boundaryReward' | 'hazardReward' | 'goalReward'
export interface ValueFunctionConfigValidationError { code: string; field: ValueFunctionConfigField; message: string }

export interface ValueFunctionTransition {
  episodeStep: number; state: number; action: ActionCode; actualAction: ActionCode; nextState: number; reward: number; done: boolean; truncated: boolean
}
export interface ValueFunctionUpdate {
  episode: number; index: number; state: number; action: number; features: number[]; featureCount: number; prediction: number; target: number; tdError: number; loss: number; gradientNorm: number; updateNorm: number; replaySize: number; targetSynced: boolean
}
export interface ValueFunctionEpisode { number: number; steps: ValueFunctionTransition[]; updates: ValueFunctionUpdate[]; totalReturn: number; discountedReturn: number; length: number; done: boolean; truncated: boolean }
export interface ValueFunctionSnapshot {
  mode: ValueFunctionMode; featureMap: ValueFunctionFeatureMap; featureCount: number; weights: number[]; actionWeights: number[][]; targetActionWeights: number[][]; values: number[]; actionValues: number[][]; policy: number[]; policyProbabilities: number[][]; lastFeatures: number[]; lastState: number; lastAction: number; lastPrediction: number; lastTarget: number; lastTdError: number; lastLoss: number; lastGradientNorm: number; lastUpdateNorm: number; replaySize: number; updateCount: number; targetSyncCount: number; episodeCount: number; totalSteps: number; episodeReturnMean: number; episodeReturnVariance: number; converged: boolean; truncated: boolean; exhausted: boolean
}
export interface ValueFunctionOutcome { snapshot: ValueFunctionSnapshot; transition: ValueFunctionTransition; updates: ValueFunctionUpdate[]; episode?: ValueFunctionEpisode }
export interface ValueFunctionAdvanceOutcome { snapshot: ValueFunctionSnapshot; transitions: ValueFunctionTransition[]; updates: ValueFunctionUpdate[]; episodes: ValueFunctionEpisode[] }
export interface ValueFunctionAudit { finite: boolean; featuresFinite: boolean; replayUniform: boolean; targetNetworkVisible: boolean; updateCount: number; message?: string }

export type ValueFunctionWorkerRequest =
  | { v: 1; runId: string; kind: 'start'; config: ValueFunctionConfig; restoreEpisodes?: number }
  | { v: 1; runId: string; kind: 'step' }
  | { v: 1; runId: string; kind: 'advance'; transitions: number }
  | { v: 1; runId: string; kind: 'run' }
  | { v: 1; runId: string; kind: 'reset'; seedHex?: string }
export type ValueFunctionWorkerResponse =
  | { v: 1; runId: string; kind: 'started'; sequence: number; snapshot: ValueFunctionSnapshot; engineVersion: string }
  | { v: 1; runId: string; kind: 'result'; sequence: number; outcome: ValueFunctionOutcome | ValueFunctionAdvanceOutcome; audit: ValueFunctionAudit }
  | { v: 1; runId: string; kind: 'reset'; sequence: number; snapshot: ValueFunctionSnapshot; audit: ValueFunctionAudit }
  | { v: 1; runId?: string; kind: 'error'; sequence: number; code: string; message: string; recoverable: boolean }

export function canonicalValueFunctionMode(value: unknown): ValueFunctionMode | undefined {
  if (typeof value !== 'string') return undefined
  const normalized = value.trim().toLowerCase()
  return VALUE_FUNCTION_MODE_ALIASES[normalized] ?? (VALUE_FUNCTION_MODES.includes(normalized as ValueFunctionMode) ? normalized as ValueFunctionMode : undefined)
}
export function canonicalValueFunctionFeatureMap(value: unknown): ValueFunctionFeatureMap | undefined {
  if (typeof value !== 'string') return undefined
  const normalized = value.trim().toLowerCase()
  return VALUE_FUNCTION_FEATURE_ALIASES[normalized] ?? (VALUE_FUNCTION_FEATURE_MAPS.includes(normalized as ValueFunctionFeatureMap) ? normalized as ValueFunctionFeatureMap : undefined)
}
function finite(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value) }

export function valueFunctionConfigValidationError(config: unknown): ValueFunctionConfigValidationError | undefined {
  if (!config || typeof config !== 'object') return { code: 'value_function_mode', field: 'mode', message: 'configuration must be an object' }
  const candidate = config as Partial<ValueFunctionConfig>
  if (!canonicalValueFunctionMode(candidate.mode)) return { code: 'value_function_mode', field: 'mode', message: 'unknown value-function mode' }
  if (!canonicalValueFunctionFeatureMap(candidate.featureMap)) return { code: 'value_function_feature_map', field: 'featureMap', message: 'unknown feature map' }
  if (!finite(candidate.discount) || candidate.discount < 0 || candidate.discount > 1) return { code: 'value_function_discount_range', field: 'discount', message: 'discount must be in [0, 1]' }
  if (!finite(candidate.slipProbability) || candidate.slipProbability < 0 || candidate.slipProbability > 1) return { code: 'value_function_slip_range', field: 'slipProbability', message: 'wind probability must be in [0, 1]' }
  if (!finite(candidate.epsilon) || candidate.epsilon < 0 || candidate.epsilon > 1) return { code: 'value_function_epsilon_range', field: 'epsilon', message: 'epsilon must be in [0, 1]' }
  if (!finite(candidate.alpha) || candidate.alpha <= 0 || candidate.alpha > 1) return { code: 'value_function_alpha_range', field: 'alpha', message: 'alpha must be in (0, 1]' }
  if (!Number.isInteger(candidate.replayCapacity) || (candidate.replayCapacity ?? 0) < 1 || (candidate.replayCapacity ?? 0) > 10_000) return { code: 'value_function_replay_capacity_range', field: 'replayCapacity', message: 'replay capacity must be 1–10,000' }
  if (!Number.isInteger(candidate.batchSize) || (candidate.batchSize ?? 0) < 1 || (candidate.batchSize ?? 0) > 256) return { code: 'value_function_batch_size_range', field: 'batchSize', message: 'batch size must be 1–256' }
  if ((candidate.batchSize ?? 0) > (candidate.replayCapacity ?? 0)) return { code: 'value_function_batch_larger_than_replay', field: 'batchSize', message: 'batch size cannot exceed replay capacity' }
  if (!Number.isInteger(candidate.targetUpdateInterval) || (candidate.targetUpdateInterval ?? 0) < 1 || (candidate.targetUpdateInterval ?? 0) > 10_000) return { code: 'value_function_target_interval_range', field: 'targetUpdateInterval', message: 'target interval must be positive' }
  if (!Number.isInteger(candidate.maxEpisodes) || (candidate.maxEpisodes ?? 0) < 1 || (candidate.maxEpisodes ?? 0) > 100_000) return { code: 'value_function_max_episodes_range', field: 'maxEpisodes', message: 'episode budget must be 1–100,000' }
  if (!Number.isInteger(candidate.maxSteps) || (candidate.maxSteps ?? 0) < 1 || (candidate.maxSteps ?? 0) > 100) return { code: 'value_function_max_steps_range', field: 'maxSteps', message: 'episode step cap must be 1–100' }
  if (typeof candidate.seedHex !== 'string' || !/^(?:0x)?[0-9a-f]+$/i.test(candidate.seedHex.trim())) return { code: 'value_function_seed', field: 'seedHex', message: 'seed must be hexadecimal' }
  if (!candidate.rewards || typeof candidate.rewards !== 'object') return { code: 'value_function_reward_range', field: 'defaultReward', message: 'rewards must be finite' }
  for (const [key, field] of [['default', 'defaultReward'], ['boundary', 'boundaryReward'], ['hazard', 'hazardReward'], ['goal', 'goalReward']] as const) if (!finite(candidate.rewards[key]) || Math.abs(candidate.rewards[key]) > 1_000_000) return { code: 'value_function_reward_range', field, message: 'rewards must be finite and bounded' }
  return undefined
}

export function acceptsValueFunctionResponse(response: unknown, runId: string, lastSequence: number): response is ValueFunctionWorkerResponse {
  if (!response || typeof response !== 'object') return false
  const candidate = response as Partial<ValueFunctionWorkerResponse>
  if (candidate.v !== VALUE_FUNCTION_PROTOCOL_VERSION) return false
  if (candidate.runId !== undefined && candidate.runId !== runId) return false
  return typeof candidate.sequence === 'number' && candidate.sequence > lastSequence
}
