export const PROTOCOL_VERSION = 3 as const

export const ACTION = {
  up: 0,
  right: 1,
  down: 2,
  left: 3,
  stay: 4,
} as const

export const GOAL_MODE = {
  terminate: 0,
  absorb: 1,
  continue: 2,
} as const

export type ActionCode = (typeof ACTION)[keyof typeof ACTION]
export type GoalModeCode = (typeof GOAL_MODE)[keyof typeof GOAL_MODE]

export interface RewardConfig {
  default: number
  boundary: number
  hazard: number
  goal: number
}

export interface GridWorldConfig {
  width: number
  height: number
  start: number
  goal: number
  goalMode: GoalModeCode
  hazards: number[]
  slipProbability: number
  discount: number
  seedHex: string
  rewards: RewardConfig
}

export interface Snapshot {
  state: number
  stepCount: number
  cumulativeReturn: number
  discountedReturn: number
  done: boolean
  truncated: boolean
}

export interface StepOutcome extends Snapshot {
  previousState: number
  requestedAction: ActionCode
  actualAction: ActionCode
  nextState: number
  reward: number
  discountWeight: number
  discountedContribution: number
  boundaryCollision: boolean
  slipped: boolean
}

export interface ModelOutcome {
  requestedAction: ActionCode
  actualAction: ActionCode
  nextState: number
  probability: number
  reward: number
  boundaryCollision: boolean
}

export type WorkerRequest =
  | {
      v: typeof PROTOCOL_VERSION
      runId: string
      kind: 'start'
      config: GridWorldConfig
    }
  | {
      v: typeof PROTOCOL_VERSION
      runId: string
      kind: 'step'
      action: ActionCode
    }
  | {
      v: typeof PROTOCOL_VERSION
      runId: string
      kind: 'stepPolicy'
      probabilities: number[]
    }

export type WorkerResponse =
  | {
      v: typeof PROTOCOL_VERSION
      runId: string
      sequence: number
      kind: 'started'
      engineVersion: string
      snapshot: Snapshot
      model: ModelOutcome[]
    }
  | {
      v: typeof PROTOCOL_VERSION
      runId: string
      sequence: number
      kind: 'transition'
      snapshot: Snapshot
      outcome: StepOutcome
      model: ModelOutcome[]
    }
  | {
      v: typeof PROTOCOL_VERSION
      runId: string
      sequence: number
      kind: 'error'
      code: string
      message: string
      recoverable: boolean
    }

export function acceptsResponse(
  response: WorkerResponse,
  currentRunId: string,
  lastSequence: number,
): boolean {
  return (
    response.v === PROTOCOL_VERSION &&
    response.runId === currentRunId &&
    response.sequence > lastSequence
  )
}
