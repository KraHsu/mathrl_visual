/**
 * Versioned browser/Worker contract for the Chapter 6 stochastic-
 * approximation laboratory.  Rust owns the random stream and numerical
 * update; the browser receives an auditable scalar trajectory.
 */
export const STOCHASTIC_APPROXIMATION_PROTOCOL_VERSION = 1 as const

export const STOCHASTIC_APPROXIMATION_MODES = [
  'mean',
  'robbins_monro',
  'sgd',
  'mini_batch',
  'batch_gradient',
] as const
export type StochasticApproximationMode = (typeof STOCHASTIC_APPROXIMATION_MODES)[number]

export const STOCHASTIC_APPROXIMATION_SCHEDULES = ['harmonic', 'constant', 'polynomial'] as const
export type StochasticApproximationSchedule = (typeof STOCHASTIC_APPROXIMATION_SCHEDULES)[number]

export const STOCHASTIC_APPROXIMATION_ROOT_FUNCTIONS = ['linear', 'tanh', 'cubic'] as const
export type StochasticApproximationRootFunction =
  (typeof STOCHASTIC_APPROXIMATION_ROOT_FUNCTIONS)[number]

export const STOCHASTIC_APPROXIMATION_MODE_ALIASES: Record<string, StochasticApproximationMode> = {
  mean: 'mean',
  average: 'mean',
  mean_estimation: 'mean',
  'mean-estimation': 'mean',
  rm: 'robbins_monro',
  robbins_monro: 'robbins_monro',
  'robbins-monro': 'robbins_monro',
  robbinsmonro: 'robbins_monro',
  sgd: 'sgd',
  stochastic_gradient: 'sgd',
  'stochastic-gradient': 'sgd',
  mini_batch: 'mini_batch',
  'mini-batch': 'mini_batch',
  minibatch: 'mini_batch',
  mb: 'mini_batch',
  mbgd: 'mini_batch',
  batch_gradient: 'batch_gradient',
  'batch-gradient': 'batch_gradient',
  batchgradient: 'batch_gradient',
  bgd: 'batch_gradient',
}

export const STOCHASTIC_APPROXIMATION_SCHEDULE_ALIASES: Record<
  string,
  StochasticApproximationSchedule
> = {
  harmonic: 'harmonic',
  'harmonic-steps': 'harmonic',
  harmonic_steps: 'harmonic',
  '1/k': 'harmonic',
  constant: 'constant',
  fixed: 'constant',
  'constant-step': 'constant',
  constant_step: 'constant',
  polynomial: 'polynomial',
  power: 'polynomial',
  power_law: 'polynomial',
  'power-law': 'polynomial',
}

export const STOCHASTIC_APPROXIMATION_ROOT_ALIASES: Record<
  string,
  StochasticApproximationRootFunction
> = {
  linear: 'linear',
  line: 'linear',
  identity: 'linear',
  tanh: 'tanh',
  hyperbolic_tangent: 'tanh',
  'hyperbolic-tangent': 'tanh',
  cubic: 'cubic',
  cube: 'cubic',
}

export interface StochasticApproximationConfig {
  mode: StochasticApproximationMode
  schedule: StochasticApproximationSchedule
  rootFunction: StochasticApproximationRootFunction
  target: number
  /** Optional alias accepted by forms that call the target a root. */
  root?: number
  initialW: number
  alpha: number
  polynomialPower: number
  noiseStd: number
  sampleCount: number
  batchSize: number
  tolerance: number
  seedHex: string
}

export type StochasticApproximationConfigField =
  | 'mode'
  | 'schedule'
  | 'rootFunction'
  | 'target'
  | 'initialW'
  | 'alpha'
  | 'polynomialPower'
  | 'noiseStd'
  | 'sampleCount'
  | 'batchSize'
  | 'tolerance'
  | 'seedHex'

export interface StochasticApproximationConfigValidationError {
  code:
    | 'stochastic_approximation_mode'
    | 'stochastic_approximation_schedule'
    | 'stochastic_approximation_root_function'
    | 'stochastic_approximation_target_range'
    | 'stochastic_approximation_initial_w_range'
    | 'stochastic_approximation_alpha_range'
    | 'stochastic_approximation_power_range'
    | 'stochastic_approximation_noise_range'
    | 'stochastic_approximation_sample_count_range'
    | 'stochastic_approximation_batch_size_range'
    | 'stochastic_approximation_tolerance_range'
    | 'stochastic_approximation_seed'
  field: StochasticApproximationConfigField
  message: string
}

const MAX_MAGNITUDE = 1_000_000
const MAX_ALPHA = 10
const MAX_POWER = 4
const MAX_ITERATIONS = 100_000
const MAX_BATCH_SIZE = 256

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function modeError(message: string): StochasticApproximationConfigValidationError {
  return { code: 'stochastic_approximation_mode', field: 'mode', message }
}

export function canonicalStochasticApproximationMode(
  value: unknown,
): StochasticApproximationMode | undefined {
  if (typeof value !== 'string') return undefined
  const normalized = value.trim()
  const lower = normalized.toLowerCase()
  return STOCHASTIC_APPROXIMATION_MODE_ALIASES[normalized]
    ?? STOCHASTIC_APPROXIMATION_MODE_ALIASES[lower]
    ?? (STOCHASTIC_APPROXIMATION_MODES.includes(lower as StochasticApproximationMode)
      ? (lower as StochasticApproximationMode)
      : undefined)
}

export function canonicalStochasticApproximationSchedule(
  value: unknown,
): StochasticApproximationSchedule | undefined {
  if (typeof value !== 'string') return undefined
  const normalized = value.trim()
  const lower = normalized.toLowerCase()
  return STOCHASTIC_APPROXIMATION_SCHEDULE_ALIASES[normalized]
    ?? STOCHASTIC_APPROXIMATION_SCHEDULE_ALIASES[lower]
    ?? (STOCHASTIC_APPROXIMATION_SCHEDULES.includes(lower as StochasticApproximationSchedule)
      ? (lower as StochasticApproximationSchedule)
      : undefined)
}

export function canonicalStochasticApproximationRootFunction(
  value: unknown,
): StochasticApproximationRootFunction | undefined {
  if (typeof value !== 'string') return undefined
  const normalized = value.trim()
  const lower = normalized.toLowerCase()
  return STOCHASTIC_APPROXIMATION_ROOT_ALIASES[normalized]
    ?? STOCHASTIC_APPROXIMATION_ROOT_ALIASES[lower]
    ?? (STOCHASTIC_APPROXIMATION_ROOT_FUNCTIONS.includes(lower as StochasticApproximationRootFunction)
      ? (lower as StochasticApproximationRootFunction)
      : undefined)
}

/** Validate before values reach a wasm-bindgen numeric coercion boundary. */
export function stochasticApproximationConfigValidationError(
  config: unknown,
): StochasticApproximationConfigValidationError | undefined {
  if (!config || typeof config !== 'object') {
    return modeError('stochastic approximation configuration must be an object')
  }
  const candidate = config as Partial<StochasticApproximationConfig>
  if (canonicalStochasticApproximationMode(candidate.mode) === undefined) {
    return modeError('the requested stochastic approximation mode is not available')
  }
  if (canonicalStochasticApproximationSchedule(candidate.schedule) === undefined) {
    return {
      code: 'stochastic_approximation_schedule',
      field: 'schedule',
      message: 'the requested step-size schedule is not available',
    }
  }
  if (canonicalStochasticApproximationRootFunction(candidate.rootFunction ?? 'linear') === undefined) {
    return {
      code: 'stochastic_approximation_root_function',
      field: 'rootFunction',
      message: 'the requested Robbins–Monro root function is not available',
    }
  }
  const target = candidate.target ?? candidate.root
  if (!finite(target) || Math.abs(target) > MAX_MAGNITUDE) {
    return {
      code: 'stochastic_approximation_target_range',
      field: 'target',
      message: 'target/root must be finite with magnitude at most 1,000,000',
    }
  }
  if (!finite(candidate.initialW) || Math.abs(candidate.initialW) > MAX_MAGNITUDE) {
    return {
      code: 'stochastic_approximation_initial_w_range',
      field: 'initialW',
      message: 'initial w must be finite with magnitude at most 1,000,000',
    }
  }
  if (!finite(candidate.alpha) || candidate.alpha <= 0 || candidate.alpha > MAX_ALPHA) {
    return {
      code: 'stochastic_approximation_alpha_range',
      field: 'alpha',
      message: 'alpha must be finite and in (0, 10]',
    }
  }
  if (
    !finite(candidate.polynomialPower)
    || candidate.polynomialPower <= 0
    || candidate.polynomialPower > MAX_POWER
  ) {
    return {
      code: 'stochastic_approximation_power_range',
      field: 'polynomialPower',
      message: 'polynomial power must be finite and in (0, 4]',
    }
  }
  if (!finite(candidate.noiseStd) || candidate.noiseStd < 0 || candidate.noiseStd > MAX_MAGNITUDE) {
    return {
      code: 'stochastic_approximation_noise_range',
      field: 'noiseStd',
      message: 'noise standard deviation must be finite and non-negative',
    }
  }
  if (
    typeof candidate.sampleCount !== 'number'
    || !Number.isInteger(candidate.sampleCount)
    || candidate.sampleCount < 1
    || candidate.sampleCount > MAX_ITERATIONS
  ) {
    return {
      code: 'stochastic_approximation_sample_count_range',
      field: 'sampleCount',
      message: 'sample count must be an integer from 1 through 100,000',
    }
  }
  if (
    typeof candidate.batchSize !== 'number'
    || !Number.isInteger(candidate.batchSize)
    || candidate.batchSize < 1
    || candidate.batchSize > MAX_BATCH_SIZE
  ) {
    return {
      code: 'stochastic_approximation_batch_size_range',
      field: 'batchSize',
      message: 'batch size must be an integer from 1 through 256',
    }
  }
  if (!finite(candidate.tolerance) || candidate.tolerance <= 0 || candidate.tolerance > MAX_MAGNITUDE) {
    return {
      code: 'stochastic_approximation_tolerance_range',
      field: 'tolerance',
      message: 'tolerance must be finite and positive',
    }
  }
  if (typeof candidate.seedHex !== 'string' || !/^(?:0x)?[0-9a-f]+$/i.test(candidate.seedHex.trim())) {
    return {
      code: 'stochastic_approximation_seed',
      field: 'seedHex',
      message: 'seed must be a hexadecimal u64, for example 5eed',
    }
  }
  return undefined
}

export interface StochasticApproximationIteration {
  index: number
  k: number
  wBefore: number
  wAfter: number
  w: number
  alpha: number
  alphaSquared: number
  observation: number
  gradient: number
  noise: number
  target: number
  error: number
  absoluteError: number
  objective: number
  loss: number
  update: number
  batchSize: number
  batchIndices: number[]
  projected: boolean
}

export interface StochasticApproximationSnapshot {
  mode: StochasticApproximationMode
  schedule: StochasticApproximationSchedule
  rootFunction: StochasticApproximationRootFunction
  target: number
  root: number
  initialW: number
  currentW: number
  w: number
  alpha: number
  polynomialPower: number
  noiseStd: number
  sampleCount: number
  batchSize: number
  datasetSize: number
  tolerance: number
  seedHex: string
  iterationCount: number
  alphaSum: number
  alphaSquaredSum: number
  noiseSum: number
  noiseMean: number
  noiseVariance: number
  error: number
  rootResidual: number
  absoluteError: number
  objective: number
  loss: number
  stepSizeConditions: boolean
  converged: boolean
  truncated: boolean
  exhausted: boolean
  lastIteration?: StochasticApproximationIteration
  history: StochasticApproximationIteration[]
}

export interface StochasticApproximationDiagnostics {
  alphaSum: number
  alphaSquaredSum: number
  noiseSum: number
  noiseMean: number
  noiseVariance: number
  error: number
  rootResidual: number
  objective: number
  converged: boolean
  truncated: boolean
  exhausted: boolean
  stepSizeConditions: boolean
}

export interface StochasticApproximationOutcome {
  snapshot: StochasticApproximationSnapshot
  iteration: StochasticApproximationIteration
  diagnostics: StochasticApproximationDiagnostics
}

export interface StochasticApproximationAdvanceOutcome {
  snapshot: StochasticApproximationSnapshot
  iterations: StochasticApproximationIteration[]
  diagnostics: StochasticApproximationDiagnostics
}

export type StochasticApproximationWorkerRequest =
  | {
      v: typeof STOCHASTIC_APPROXIMATION_PROTOCOL_VERSION
      runId: string
      kind: 'start'
      config: StochasticApproximationConfig
      restoreIterations: number
    }
  | {
      v: typeof STOCHASTIC_APPROXIMATION_PROTOCOL_VERSION
      runId: string
      kind: 'iteration' | 'step'
    }
  | {
      v: typeof STOCHASTIC_APPROXIMATION_PROTOCOL_VERSION
      runId: string
      kind: 'advance'
      iterations: number
    }
  | {
      v: typeof STOCHASTIC_APPROXIMATION_PROTOCOL_VERSION
      runId: string
      kind: 'run'
      iterations?: number
    }
  | {
      v: typeof STOCHASTIC_APPROXIMATION_PROTOCOL_VERSION
      runId: string
      kind: 'reset'
      seedHex?: string
    }

export type StochasticApproximationWorkerResponse =
  | {
      v: typeof STOCHASTIC_APPROXIMATION_PROTOCOL_VERSION
      runId: string
      sequence: number
      kind: 'started'
      engineVersion: string
      snapshot: StochasticApproximationSnapshot
    }
  | {
      v: typeof STOCHASTIC_APPROXIMATION_PROTOCOL_VERSION
      runId: string
      sequence: number
      kind: 'iteration' | 'step' | 'advanced' | 'reset'
      outcome: StochasticApproximationOutcome | StochasticApproximationAdvanceOutcome
    }
  | {
      v: typeof STOCHASTIC_APPROXIMATION_PROTOCOL_VERSION
      runId: string
      sequence: number
      kind: 'error'
      code: string
      message: string
      recoverable: boolean
    }

export function acceptsStochasticApproximationResponse(
  response: StochasticApproximationWorkerResponse,
  currentRunId: string,
  lastSequence: number,
): boolean {
  return (
    response.v === STOCHASTIC_APPROXIMATION_PROTOCOL_VERSION
    && response.runId === currentRunId
    && response.sequence > lastSequence
  )
}
