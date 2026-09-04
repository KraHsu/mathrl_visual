/**
 * Versioned browser/Worker contract for Chapter 2's shared 4×4 policy
 * evaluation laboratory.  The older `bellmanProtocol` remains available for
 * the four-state teaching scaffold; this contract is deliberately separate so
 * cached pages cannot mix payloads from the two models.
 */
export const GRID_POLICY_PROTOCOL_VERSION = 1 as const

export const GRID_POLICY_KINDS = ['uniform', 'goal_seeking'] as const
export type GridPolicyKind = (typeof GRID_POLICY_KINDS)[number]

export const GRID_POLICY_KIND_ALIASES: Record<string, GridPolicyKind> = {
  uniform: 'uniform',
  equal: 'uniform',
  goal: 'goal_seeking',
  goalSeeking: 'goal_seeking',
  goal_seeking: 'goal_seeking',
  'goal-seeking': 'goal_seeking',
}

export function canonicalGridPolicyKind(value: unknown): GridPolicyKind | undefined {
  return typeof value === 'string' ? GRID_POLICY_KIND_ALIASES[value] : undefined
}

export interface GridPolicyRewards {
  default: number
  boundary: number
  hazard: number
  goal: number
}

export interface GridPolicyConfig {
  policy: GridPolicyKind
  discount: number
  slipProbability: number
  tolerance: number
  maxSweeps: number
  seedHex: string
  rewards: GridPolicyRewards
}

export type GridPolicyConfigField =
  | 'policy'
  | 'discount'
  | 'slipProbability'
  | 'tolerance'
  | 'maxSweeps'
  | 'seedHex'
  | 'defaultReward'
  | 'boundaryReward'
  | 'hazardReward'
  | 'goalReward'

export interface GridPolicyConfigValidationError {
  code:
    | 'grid_policy_unknown_kind'
    | 'grid_policy_discount_range'
    | 'grid_policy_slip_range'
    | 'grid_policy_tolerance_range'
    | 'grid_policy_max_sweeps_range'
    | 'grid_policy_seed'
    | 'grid_policy_reward_range'
  field: GridPolicyConfigField
  message: string
}

function rewardError(
  field: Extract<
    GridPolicyConfigField,
    'defaultReward' | 'boundaryReward' | 'hazardReward' | 'goalReward'
  >,
): GridPolicyConfigValidationError {
  return {
    code: 'grid_policy_reward_range',
    field,
    message: 'rewards must be finite with magnitude at most 1,000,000',
  }
}
/** Validate before numbers reach the wasm-bindgen ABI. */
export function gridPolicyConfigValidationError(
  config: unknown,
): GridPolicyConfigValidationError | undefined {
  if (!config || typeof config !== 'object') {
    return {
      code: 'grid_policy_unknown_kind',
      field: 'policy',
      message: 'choose one of the available fixed policies',
    }
  }
  const candidate = config as Partial<GridPolicyConfig>
  if (canonicalGridPolicyKind(candidate.policy) === undefined) {
    return {
      code: 'grid_policy_unknown_kind',
      field: 'policy',
      message: 'choose one of the available fixed policies',
    }
  }
  if (
    typeof candidate.discount !== 'number' ||
    !Number.isFinite(candidate.discount) ||
    candidate.discount < 0 ||
    candidate.discount > 0.99
  ) {
    return {
      code: 'grid_policy_discount_range',
      field: 'discount',
      message: 'discount must be finite and in [0, 0.99]',
    }
  }
  if (
    typeof candidate.slipProbability !== 'number' ||
    !Number.isFinite(candidate.slipProbability) ||
    candidate.slipProbability < 0 ||
    candidate.slipProbability > 1
  ) {
    return {
      code: 'grid_policy_slip_range',
      field: 'slipProbability',
      message: 'wind probability must be finite and in [0, 1]',
    }
  }
  if (
    typeof candidate.tolerance !== 'number' ||
    !Number.isFinite(candidate.tolerance) ||
    candidate.tolerance <= 0 ||
    candidate.tolerance > 1
  ) {
    return {
      code: 'grid_policy_tolerance_range',
      field: 'tolerance',
      message: 'tolerance must be finite and in (0, 1]',
    }
  }
  if (
    typeof candidate.maxSweeps !== 'number' ||
    !Number.isInteger(candidate.maxSweeps) ||
    candidate.maxSweeps < 1 ||
    candidate.maxSweeps > 10_000
  ) {
    return {
      code: 'grid_policy_max_sweeps_range',
      field: 'maxSweeps',
      message: 'max_sweeps must be an integer from 1 through 10,000',
    }
  }
  if (
    typeof candidate.seedHex !== 'string' ||
    !/^(?:0x)?[0-9a-f]{1,16}$/i.test(candidate.seedHex.trim())
  ) {
    return {
      code: 'grid_policy_seed',
      field: 'seedHex',
      message: 'seed must be a hexadecimal u64, for example 5eed',
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

export interface GridPolicyTransition {
  state: number
  requestedAction: number
  actualAction: number
  nextState: number
  probability: number
  reward: number
  boundaryCollision: boolean
}

export interface GridPolicyTerm {
  requestedAction: number
  actualAction: number
  nextState: number
  policyProbability: number
  transitionProbability: number
  probability: number
  reward: number
  nextValue: number
  discountedNextValue: number
  contribution: number
  boundaryCollision: boolean
}

export interface GridPolicyUpdate {
  state: number
  oldValue: number
  newValue: number
  delta: number
  terms: GridPolicyTerm[]
}

export interface GridPolicySnapshot {
  policy: GridPolicyKind
  seedHex: string
  values: number[]
  actionValues: number[][]
  policyProbabilities: number[][]
  expectedRewards: number[]
  transitionMatrix: number[][]
  sweepCount: number
  residual: number
  converged: boolean
  truncated: boolean
}

export interface GridPolicyReference {
  values: number[]
  residual: number
}

export interface GridPolicySweepOutcome {
  snapshot: GridPolicySnapshot
  updates: GridPolicyUpdate[]
  maxUpdate: number
}

export interface GridPolicyAdvanceOutcome {
  snapshot: GridPolicySnapshot
  residualHistory: number[]
}

export type GridPolicyWorkerRequest =
  | {
      v: typeof GRID_POLICY_PROTOCOL_VERSION
      runId: string
      kind: 'start'
      config: GridPolicyConfig
      restoreSweeps: number
    }
  | {
      v: typeof GRID_POLICY_PROTOCOL_VERSION
      runId: string
      kind: 'sweep' | 'run' | 'reset'
    }
  | {
      v: typeof GRID_POLICY_PROTOCOL_VERSION
      runId: string
      kind: 'advance'
      sweeps: number
    }

export type GridPolicyWorkerResponse =
  | {
      v: typeof GRID_POLICY_PROTOCOL_VERSION
      runId: string
      sequence: number
      kind: 'started'
      engineVersion: string
      snapshot: GridPolicySnapshot
      model: GridPolicyTransition[]
      reference: GridPolicyReference
      residualHistory: number[]
    }
  | {
      v: typeof GRID_POLICY_PROTOCOL_VERSION
      runId: string
      sequence: number
      kind: 'swept'
      outcome: GridPolicySweepOutcome
    }
  | {
      v: typeof GRID_POLICY_PROTOCOL_VERSION
      runId: string
      sequence: number
      kind: 'advanced'
      outcome: GridPolicyAdvanceOutcome
    }
  | {
      v: typeof GRID_POLICY_PROTOCOL_VERSION
      runId: string
      sequence: number
      kind: 'chunked'
      outcome: GridPolicyAdvanceOutcome
    }
  | {
      v: typeof GRID_POLICY_PROTOCOL_VERSION
      runId: string
      sequence: number
      kind: 'reset'
      snapshot: GridPolicySnapshot
    }
  | {
      v: typeof GRID_POLICY_PROTOCOL_VERSION
      runId: string
      sequence: number
      kind: 'error'
      code: string
      message: string
      recoverable: boolean
    }

const RESPONSE_KINDS = new Set<GridPolicyWorkerResponse['kind']>([
  'started',
  'swept',
  'advanced',
  'chunked',
  'reset',
  'error',
])

/** Reject stale, malformed, or duplicate Worker envelopes. */
export function acceptsGridPolicyResponse(
  response: unknown,
  currentRunId: string,
  lastSequence: number,
): response is GridPolicyWorkerResponse {
  if (!response || typeof response !== 'object') return false
  const candidate = response as Partial<GridPolicyWorkerResponse>
  return (
    candidate.v === GRID_POLICY_PROTOCOL_VERSION &&
    typeof candidate.runId === 'string' &&
    candidate.runId === currentRunId &&
    typeof candidate.sequence === 'number' &&
    Number.isSafeInteger(candidate.sequence) &&
    candidate.sequence >= 0 &&
    candidate.sequence > lastSequence &&
    typeof candidate.kind === 'string' &&
    RESPONSE_KINDS.has(candidate.kind as GridPolicyWorkerResponse['kind'])
  )
}
