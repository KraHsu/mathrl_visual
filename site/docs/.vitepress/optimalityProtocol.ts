import type { ActionCode } from './protocol'

export const OPTIMALITY_PROTOCOL_VERSION = 1 as const

export interface OptimalityRewards {
  default: number
  boundary: number
  hazard: number
  goal: number
}

export interface OptimalityConfig {
  discount: number
  slipProbability: number
  tolerance: number
  maxSweeps: number
  rewards: OptimalityRewards
}

export type OptimalityConfigField =
  | 'discount'
  | 'slipProbability'
  | 'tolerance'
  | 'maxSweeps'
  | 'defaultReward'
  | 'boundaryReward'
  | 'hazardReward'
  | 'goalReward'

export interface OptimalityConfigValidationError {
  code:
    | 'optimality_discount_range'
    | 'optimality_slip_range'
    | 'optimality_tolerance_range'
    | 'optimality_max_sweeps_range'
    | 'optimality_reward_range'
  field: OptimalityConfigField
  message: string
}

function rewardError(
  field: Extract<
    OptimalityConfigField,
    'defaultReward' | 'boundaryReward' | 'hazardReward' | 'goalReward'
  >,
): OptimalityConfigValidationError {
  return {
    code: 'optimality_reward_range',
    field,
    message: 'rewards must be finite with magnitude at most 1,000,000',
  }
}

export function optimalityConfigValidationError(
  config: unknown,
): OptimalityConfigValidationError | undefined {
  if (!config || typeof config !== 'object') {
    return {
      code: 'optimality_discount_range',
      field: 'discount',
      message: 'discount must be finite and in [0, 0.99]',
    }
  }
  const candidate = config as Partial<OptimalityConfig>
  if (
    typeof candidate.discount !== 'number' ||
    !Number.isFinite(candidate.discount) ||
    candidate.discount < 0 ||
    candidate.discount > 0.99
  ) {
    return {
      code: 'optimality_discount_range',
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
      code: 'optimality_slip_range',
      field: 'slipProbability',
      message: 'slip_probability must be finite and in [0, 1]',
    }
  }
  if (
    typeof candidate.tolerance !== 'number' ||
    !Number.isFinite(candidate.tolerance) ||
    candidate.tolerance <= 0 ||
    candidate.tolerance > 1
  ) {
    return {
      code: 'optimality_tolerance_range',
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
      code: 'optimality_max_sweeps_range',
      field: 'maxSweeps',
      message: 'max_sweeps must be an integer from 1 through 10,000',
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

export interface OptimalitySnapshot {
  values: number[]
  actionValues: number[][]
  greedyMasks: number[]
  sweepCount: number
  residual: number
  converged: boolean
  truncated: boolean
}

export interface OptimalityReference {
  values: number[]
  actionValues: number[][]
  greedyMasks: number[]
  residual: number
}

export interface OptimalityTransition {
  state: number
  requestedAction: ActionCode
  actualAction: ActionCode
  nextState: number
  probability: number
  reward: number
  boundaryCollision: boolean
}

export interface OptimalityUpdate {
  state: number
  oldValue: number
  newValue: number
  delta: number
  actionValues: number[]
  greedyMask: number
}

export interface OptimalitySweepOutcome {
  snapshot: OptimalitySnapshot
  updates: OptimalityUpdate[]
  maxUpdate: number
}

export interface OptimalityAdvanceOutcome {
  snapshot: OptimalitySnapshot
  residualHistory: number[]
}

export type OptimalityWorkerRequest =
  | {
      v: typeof OPTIMALITY_PROTOCOL_VERSION
      runId: string
      kind: 'start'
      config: OptimalityConfig
      restoreSweeps: number
    }
  | {
      v: typeof OPTIMALITY_PROTOCOL_VERSION
      runId: string
      kind: 'sweep' | 'run' | 'reset'
    }
  | {
      v: typeof OPTIMALITY_PROTOCOL_VERSION
      runId: string
      kind: 'advance'
      sweeps: number
    }

export type OptimalityWorkerResponse =
  | {
      v: typeof OPTIMALITY_PROTOCOL_VERSION
      runId: string
      sequence: number
      kind: 'started'
      engineVersion: string
      snapshot: OptimalitySnapshot
      model: OptimalityTransition[]
      reference: OptimalityReference
      residualHistory: number[]
    }
  | {
      v: typeof OPTIMALITY_PROTOCOL_VERSION
      runId: string
      sequence: number
      kind: 'swept'
      outcome: OptimalitySweepOutcome
    }
  | {
      v: typeof OPTIMALITY_PROTOCOL_VERSION
      runId: string
      sequence: number
      kind: 'advanced'
      outcome: OptimalityAdvanceOutcome
    }
  | {
      v: typeof OPTIMALITY_PROTOCOL_VERSION
      runId: string
      sequence: number
      kind: 'chunked'
      outcome: OptimalityAdvanceOutcome
    }
  | {
      v: typeof OPTIMALITY_PROTOCOL_VERSION
      runId: string
      sequence: number
      kind: 'reset'
      snapshot: OptimalitySnapshot
    }
  | {
      v: typeof OPTIMALITY_PROTOCOL_VERSION
      runId: string
      sequence: number
      kind: 'error'
      code: string
      message: string
      recoverable: boolean
    }

export function acceptsOptimalityResponse(
  response: OptimalityWorkerResponse,
  currentRunId: string,
  lastSequence: number,
): boolean {
  return (
    response.v === OPTIMALITY_PROTOCOL_VERSION &&
    response.runId === currentRunId &&
    response.sequence > lastSequence
  )
}
