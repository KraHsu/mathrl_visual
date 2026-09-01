import type { ActionCode } from './protocol'

/**
 * Versioned browser/Worker contract for the Chapter 4 planning laboratory.
 *
 * The Rust evaluator owns all numerical decisions.  The browser only keeps
 * presentation state and never reconstructs an algorithmic update from a
 * partial payload.  Keeping this contract separate from the Chapter 3
 * optimality contract also makes stale messages from either lab harmless.
 */
export const PLANNING_PROTOCOL_VERSION = 1 as const

export const PLANNING_MODES = [
  'value_iteration',
  'policy_iteration',
  'truncated_policy_iteration',
] as const

export type PlanningMode = (typeof PLANNING_MODES)[number]

/** Short labels accepted by older development builds of the Wasm crate. */
export const PLANNING_MODE_ALIASES: Record<string, PlanningMode> = {
  vi: 'value_iteration',
  valueIteration: 'value_iteration',
  value_iteration: 'value_iteration',
  pi: 'policy_iteration',
  policyIteration: 'policy_iteration',
  policy_iteration: 'policy_iteration',
  tpi: 'truncated_policy_iteration',
  truncatedPolicyIteration: 'truncated_policy_iteration',
  truncated_policy_iteration: 'truncated_policy_iteration',
  truncated_pi: 'truncated_policy_iteration',
  modifiedPolicyIteration: 'truncated_policy_iteration',
  modified_policy_iteration: 'truncated_policy_iteration',
  'modified-policy-iteration': 'truncated_policy_iteration',
  mpi: 'truncated_policy_iteration',
}

export interface PlanningRewards {
  default: number
  boundary: number
  hazard: number
  goal: number
}

export interface PlanningConfig {
  discount: number
  slipProbability: number
  tolerance: number
  maxOuterIterations: number
  /** Number of inner policy-evaluation sweeps used by truncated PI. */
  evaluationSweeps: number
  /** Safety cap for a full PI policy evaluation. */
  maxEvaluationSweeps: number
  rewards: PlanningRewards
}

export type PlanningConfigField =
  | 'discount'
  | 'slipProbability'
  | 'tolerance'
  | 'maxOuterIterations'
  | 'evaluationSweeps'
  | 'maxEvaluationSweeps'
  | 'defaultReward'
  | 'boundaryReward'
  | 'hazardReward'
  | 'goalReward'

export interface PlanningConfigValidationError {
  code:
    | 'planning_discount_range'
    | 'planning_slip_range'
    | 'planning_tolerance_range'
    | 'planning_max_outer_iterations_range'
    | 'planning_evaluation_sweeps_range'
    | 'planning_max_evaluation_sweeps_range'
    | 'planning_evaluation_budget'
    | 'planning_unknown_mode'
    | 'planning_reward_range'
  field: PlanningConfigField
  message: string
}

function rewardError(
  field: Extract<
    PlanningConfigField,
    'defaultReward' | 'boundaryReward' | 'hazardReward' | 'goalReward'
  >,
): PlanningConfigValidationError {
  return {
    code: 'planning_reward_range',
    field,
    message: 'rewards must be finite with magnitude at most 1,000,000',
  }
}

/** Validate before values reach a wasm-bindgen numeric coercion boundary. */
export function planningConfigValidationError(
  config: unknown,
): PlanningConfigValidationError | undefined {
  if (!config || typeof config !== 'object') {
    return {
      code: 'planning_discount_range',
      field: 'discount',
      message: 'discount must be finite and in [0, 0.99]',
    }
  }
  const candidate = config as Partial<PlanningConfig>
  if (
    typeof candidate.discount !== 'number' ||
    !Number.isFinite(candidate.discount) ||
    candidate.discount < 0 ||
    candidate.discount > 0.99
  ) {
    return {
      code: 'planning_discount_range',
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
      code: 'planning_slip_range',
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
      code: 'planning_tolerance_range',
      field: 'tolerance',
      message: 'tolerance must be finite and in (0, 1]',
    }
  }
  if (
    typeof candidate.maxOuterIterations !== 'number' ||
    !Number.isInteger(candidate.maxOuterIterations) ||
    candidate.maxOuterIterations < 1 ||
    candidate.maxOuterIterations > 10_000
  ) {
    return {
      code: 'planning_max_outer_iterations_range',
      field: 'maxOuterIterations',
      message: 'max_outer_iterations must be an integer from 1 through 10,000',
    }
  }
  if (
    typeof candidate.evaluationSweeps !== 'number' ||
    !Number.isInteger(candidate.evaluationSweeps) ||
    candidate.evaluationSweeps < 1 ||
    candidate.evaluationSweeps > 10_000
  ) {
    return {
      code: 'planning_evaluation_sweeps_range',
      field: 'evaluationSweeps',
      message: 'evaluation_sweeps must be an integer from 1 through 10,000',
    }
  }
  if (
    typeof candidate.maxEvaluationSweeps !== 'number' ||
    !Number.isInteger(candidate.maxEvaluationSweeps) ||
    candidate.maxEvaluationSweeps < 1 ||
    candidate.maxEvaluationSweeps > 10_000
  ) {
    return {
      code: 'planning_max_evaluation_sweeps_range',
      field: 'maxEvaluationSweeps',
      message: 'max_evaluation_sweeps must be an integer from 1 through 10,000',
    }
  }
  if (candidate.evaluationSweeps > candidate.maxEvaluationSweeps) {
    return {
      code: 'planning_evaluation_budget',
      field: 'evaluationSweeps',
      message: 'evaluation_sweeps cannot exceed max_evaluation_sweeps',
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

export interface PlanningCost {
  /** Number of state/action backups (or equivalent Bellman updates). */
  backups: number
  /** Number of inner policy-evaluation sweeps. */
  policyEvaluations: number
  /** Number of greedy policy-improvement passes. */
  improvementSteps: number
  /** Fixed-size (state, action) expectation slots, including terminal no-ops. */
  actionEvaluations: number
}

export interface PlanningSnapshot {
  mode: PlanningMode
  values: number[]
  actionValues: number[][]
  /** All numerically tied greedy actions, including non-selected ties. */
  greedyMasks: number[]
  /** The deterministic policy used by PI/TPI; -1 marks the terminal state. */
  policyMasks: number[]
  /** Canonical representative action code for each state, -1 at terminal. */
  policy: number[]
  outerIteration: number
  evaluationSweep: number
  residual: number
  /** Maximum absolute value update observed during the most recent outer step, ||ΔV||∞. */
  valueResidual: number
  evaluationResidual: number
  /** True when an inner PI evaluation hit its safety cap. */
  evaluationTruncated?: boolean
  policyStable: boolean
  converged: boolean
  truncated: boolean
  cost: PlanningCost
}

export interface PlanningReference {
  values: number[]
  actionValues: number[][]
  greedyMasks: number[]
  residual: number
}

export interface PlanningTransition {
  state: number
  requestedAction: ActionCode
  actualAction: ActionCode
  nextState: number
  probability: number
  reward: number
  boundaryCollision: boolean
}

export interface PlanningUpdate {
  state: number
  /** Value entering the outer-step backup/improvement calculation. */
  oldValue: number
  /** Greedy-backup candidate; PI/TPI may retain a different evaluated vector. */
  newValue: number
  /** `newValue - oldValue`, not always an applied vector delta for PI/TPI. */
  delta: number
  actionValues: number[]
  greedyMask: number
  policyMask?: number
  policy?: number
  policyBefore?: number
  policyAfter?: number
}

export interface PlanningPhase {
  kind: 'backup' | 'evaluation' | 'improvement' | 'stable' | 'truncated'
  /** Number of inner sweeps represented by this phase, when applicable. */
  sweeps?: number
  /** State-value or policy-choice coordinates changed in this phase. */
  changedStates?: number
  residual?: number
  outerIteration?: number
  maxUpdate?: number
  policyStable?: boolean
}

export interface PlanningOutcome {
  snapshot: PlanningSnapshot
  updates: PlanningUpdate[]
  residualHistory: number[]
  phases: PlanningPhase[]
}

export interface PlanningRunState {
  snapshot: PlanningSnapshot
  reference: PlanningReference
  residualHistory: number[]
  updates: PlanningUpdate[]
  phases: PlanningPhase[]
}

export type PlanningWorkerRequest =
  | {
      v: typeof PLANNING_PROTOCOL_VERSION
      runId: string
      kind: 'start'
      config: PlanningConfig
      restore: Partial<Record<PlanningMode, number>>
    }
  | {
      v: typeof PLANNING_PROTOCOL_VERSION
      runId: string
      kind: 'step' | 'reset'
      mode: PlanningMode
    }
  | {
      v: typeof PLANNING_PROTOCOL_VERSION
      runId: string
      kind: 'advance'
      mode: PlanningMode
      outerSteps: number
    }
  | {
      v: typeof PLANNING_PROTOCOL_VERSION
      runId: string
      kind: 'run'
      mode: PlanningMode
    }

export type PlanningWorkerResponse =
  | {
      v: typeof PLANNING_PROTOCOL_VERSION
      runId: string
      sequence: number
      kind: 'started'
      engineVersion: string
      model: PlanningTransition[]
      reference: PlanningReference
      runs: Record<PlanningMode, PlanningRunState>
    }
  | {
      v: typeof PLANNING_PROTOCOL_VERSION
      runId: string
      sequence: number
      kind: 'stepped' | 'advanced' | 'chunked'
      mode: PlanningMode
      outcome: PlanningOutcome
    }
  | {
      v: typeof PLANNING_PROTOCOL_VERSION
      runId: string
      sequence: number
      kind: 'reset'
      mode: PlanningMode
      snapshot: PlanningSnapshot
    }
  | {
      v: typeof PLANNING_PROTOCOL_VERSION
      runId: string
      sequence: number
      kind: 'error'
      code: string
      message: string
      recoverable: boolean
      mode?: PlanningMode
    }

export function canonicalPlanningMode(value: unknown): PlanningMode | undefined {
  if (typeof value !== 'string') return undefined
  return PLANNING_MODE_ALIASES[value]
}

export function acceptsPlanningResponse(
  response: PlanningWorkerResponse,
  currentRunId: string,
  lastSequence: number,
): boolean {
  return (
    response.v === PLANNING_PROTOCOL_VERSION &&
    response.runId === currentRunId &&
    response.sequence > lastSequence
  )
}
