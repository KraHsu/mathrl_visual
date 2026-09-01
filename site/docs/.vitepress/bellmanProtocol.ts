export const BELLMAN_PROTOCOL_VERSION = 1 as const

export interface BellmanConfig {
  discount: number
  tolerance: number
  maxSweeps: number
}

export interface BellmanConfigValidationError {
  code:
    | 'evaluation_discount_range'
    | 'evaluation_tolerance_range'
    | 'evaluation_max_sweeps_range'
  message: string
}

export function bellmanConfigValidationError(
  config: unknown,
): BellmanConfigValidationError | undefined {
  if (!config || typeof config !== 'object') {
    return {
      code: 'evaluation_discount_range',
      message: 'discount must be finite and in [0, 1)',
    }
  }
  const candidate = config as Partial<BellmanConfig>
  if (
    typeof candidate.discount !== 'number' ||
    !Number.isFinite(candidate.discount) ||
    candidate.discount < 0 ||
    candidate.discount >= 1
  ) {
    return {
      code: 'evaluation_discount_range',
      message: 'discount must be finite and in [0, 1)',
    }
  }
  if (
    typeof candidate.tolerance !== 'number' ||
    !Number.isFinite(candidate.tolerance) ||
    candidate.tolerance <= 0 ||
    candidate.tolerance > 1
  ) {
    return {
      code: 'evaluation_tolerance_range',
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
      code: 'evaluation_max_sweeps_range',
      message: 'max_sweeps must be an integer from 1 through 10,000',
    }
  }
  return undefined
}

export interface BellmanSnapshot {
  values: number[]
  sweepCount: number
  residual: number
  converged: boolean
  truncated: boolean
}

export interface BellmanTransition {
  state: number
  nextState: number
  probability: number
  reward: number
}

export interface BellmanTerm {
  nextState: number
  probability: number
  reward: number
  nextValue: number
  discountedNextValue: number
  contribution: number
}

export interface BellmanValueUpdate {
  state: number
  oldValue: number
  newValue: number
  delta: number
  terms: BellmanTerm[]
}

export interface BellmanSweepOutcome {
  snapshot: BellmanSnapshot
  updates: BellmanValueUpdate[]
  maxUpdate: number
}

export interface BellmanAdvanceOutcome {
  snapshot: BellmanSnapshot
  residualHistory: number[]
}

export type BellmanWorkerRequest =
  | {
      v: typeof BELLMAN_PROTOCOL_VERSION
      runId: string
      kind: 'start'
      config: BellmanConfig
      restoreSweeps: number
    }
  | {
      v: typeof BELLMAN_PROTOCOL_VERSION
      runId: string
      kind: 'sweep'
    }
  | {
      v: typeof BELLMAN_PROTOCOL_VERSION
      runId: string
      kind: 'run'
    }
  | {
      v: typeof BELLMAN_PROTOCOL_VERSION
      runId: string
      kind: 'reset'
    }

export type BellmanWorkerResponse =
  | {
      v: typeof BELLMAN_PROTOCOL_VERSION
      runId: string
      sequence: number
      kind: 'started'
      engineVersion: string
      snapshot: BellmanSnapshot
      model: BellmanTransition[]
      exactValues: number[]
      residualHistory: number[]
    }
  | {
      v: typeof BELLMAN_PROTOCOL_VERSION
      runId: string
      sequence: number
      kind: 'swept'
      outcome: BellmanSweepOutcome
    }
  | {
      v: typeof BELLMAN_PROTOCOL_VERSION
      runId: string
      sequence: number
      kind: 'advanced'
      outcome: BellmanAdvanceOutcome
    }
  | {
      v: typeof BELLMAN_PROTOCOL_VERSION
      runId: string
      sequence: number
      kind: 'reset'
      snapshot: BellmanSnapshot
    }
  | {
      v: typeof BELLMAN_PROTOCOL_VERSION
      runId: string
      sequence: number
      kind: 'error'
      code: string
      message: string
      recoverable: boolean
    }

export function acceptsBellmanResponse(
  response: BellmanWorkerResponse,
  currentRunId: string,
  lastSequence: number,
): boolean {
  return (
    response.v === BELLMAN_PROTOCOL_VERSION &&
    response.runId === currentRunId &&
    response.sequence > lastSequence
  )
}
