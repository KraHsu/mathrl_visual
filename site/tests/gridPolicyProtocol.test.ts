import { describe, expect, it } from 'vitest'

import {
  GRID_POLICY_PROTOCOL_VERSION,
  acceptsGridPolicyResponse,
  canonicalGridPolicyKind,
  gridPolicyConfigValidationError,
  type GridPolicyConfig,
  type GridPolicyWorkerResponse,
} from '../docs/.vitepress/gridPolicyProtocol'

const config: GridPolicyConfig = {
  policy: 'uniform',
  discount: 0.9,
  slipProbability: 0,
  tolerance: 1e-10,
  maxSweeps: 1000,
  seedHex: '5eed',
  rewards: { default: -0.04, boundary: -1, hazard: -1, goal: 1 },
}

function response(sequence: number, runId = 'active'): GridPolicyWorkerResponse {
  return {
    v: GRID_POLICY_PROTOCOL_VERSION,
    runId,
    sequence,
    kind: 'reset',
    snapshot: {
      policy: 'uniform',
      seedHex: '0000000000005eed',
      values: Array(16).fill(0),
      actionValues: Array.from({ length: 16 }, () => Array(5).fill(0)),
      policyProbabilities: Array.from({ length: 16 }, () => Array(5).fill(0.2)),
      expectedRewards: Array(16).fill(0),
      transitionMatrix: Array.from({ length: 16 }, () => Array(16).fill(0)),
      sweepCount: 0,
      residual: 0,
      converged: false,
      truncated: false,
    },
  }
}

describe('shared-grid policy protocol', () => {
  it('canonicalizes policy aliases', () => {
    expect(canonicalGridPolicyKind('equal')).toBe('uniform')
    expect(canonicalGridPolicyKind('goal-seeking')).toBe('goal_seeking')
    expect(canonicalGridPolicyKind('unknown')).toBeUndefined()
  })

  it('validates finite config and stable field codes', () => {
    expect(gridPolicyConfigValidationError(config)).toBeUndefined()
    expect(gridPolicyConfigValidationError({ ...config, discount: 1 })?.code).toBe(
      'grid_policy_discount_range',
    )
    expect(gridPolicyConfigValidationError({ ...config, slipProbability: Number.NaN })?.code).toBe(
      'grid_policy_slip_range',
    )
    expect(gridPolicyConfigValidationError({ ...config, seedHex: 'not-hex' })?.code).toBe(
      'grid_policy_seed',
    )
  })

  it('rejects stale, duplicate, malformed, and unknown-kind envelopes', () => {
    expect(acceptsGridPolicyResponse(response(3), 'active', 2)).toBe(true)
    expect(acceptsGridPolicyResponse(response(2), 'active', 2)).toBe(false)
    expect(acceptsGridPolicyResponse(response(4, 'stale'), 'active', 2)).toBe(false)
    expect(acceptsGridPolicyResponse({ ...response(5), kind: 'bogus' }, 'active', 2)).toBe(false)
    expect(acceptsGridPolicyResponse({ ...response(5), sequence: Number.NaN }, 'active', 2)).toBe(false)
    expect(acceptsGridPolicyResponse({ ...response(5), sequence: -1 }, 'active', 2)).toBe(false)
  })
})
