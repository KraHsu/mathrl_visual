import { describe, expect, it } from 'vitest'

import {
  BELLMAN_PROTOCOL_VERSION,
  acceptsBellmanResponse,
  bellmanConfigValidationError,
  type BellmanWorkerResponse,
} from '../docs/.vitepress/bellmanProtocol'
import {
  PROTOCOL_VERSION,
  acceptsResponse,
  type WorkerResponse,
} from '../docs/.vitepress/protocol'
import {
  OPTIMALITY_PROTOCOL_VERSION,
  acceptsOptimalityResponse,
  optimalityConfigValidationError,
  type OptimalityWorkerResponse,
} from '../docs/.vitepress/optimalityProtocol'

function response(runId: string, sequence: number): WorkerResponse {
  return {
    v: PROTOCOL_VERSION,
    runId,
    sequence,
    kind: 'error',
    code: 'test',
    message: 'test',
    recoverable: true,
  }
}

function bellmanResponse(runId: string, sequence: number): BellmanWorkerResponse {
  return {
    v: BELLMAN_PROTOCOL_VERSION,
    runId,
    sequence,
    kind: 'error',
    code: 'test',
    message: 'test',
    recoverable: true,
  }
}

function optimalityResponse(runId: string, sequence: number): OptimalityWorkerResponse {
  return {
    v: OPTIMALITY_PROTOCOL_VERSION,
    runId,
    sequence,
    kind: 'error',
    code: 'test',
    message: 'test',
    recoverable: true,
  }
}

describe('acceptsResponse', () => {
  it('accepts only newer messages for the current run', () => {
    expect(acceptsResponse(response('active', 4), 'active', 3)).toBe(true)
    expect(acceptsResponse(response('stale', 5), 'active', 3)).toBe(false)
    expect(acceptsResponse(response('active', 3), 'active', 3)).toBe(false)
  })

  it('applies the same stale-message guard to Bellman runs', () => {
    expect(acceptsBellmanResponse(bellmanResponse('active', 4), 'active', 3)).toBe(true)
    expect(acceptsBellmanResponse(bellmanResponse('stale', 5), 'active', 3)).toBe(false)
    expect(acceptsBellmanResponse(bellmanResponse('active', 3), 'active', 3)).toBe(false)
  })

  it('applies the stale-message guard to optimality runs', () => {
    expect(acceptsOptimalityResponse(optimalityResponse('active', 4), 'active', 3)).toBe(true)
    expect(acceptsOptimalityResponse(optimalityResponse('stale', 5), 'active', 3)).toBe(false)
    expect(acceptsOptimalityResponse(optimalityResponse('active', 3), 'active', 3)).toBe(false)
  })

  it('rejects Bellman values that the Wasm ABI would otherwise coerce', () => {
    expect(
      bellmanConfigValidationError({ discount: '', tolerance: 0.001, maxSweeps: 200 })?.code,
    ).toBe('evaluation_discount_range')
    expect(
      bellmanConfigValidationError({ discount: 0.9, tolerance: 0, maxSweeps: 200 })?.code,
    ).toBe('evaluation_tolerance_range')
    expect(
      bellmanConfigValidationError({ discount: 0.9, tolerance: 0.001, maxSweeps: 1.5 })?.code,
    ).toBe('evaluation_max_sweeps_range')
    expect(
      bellmanConfigValidationError({ discount: 0.9, tolerance: 0.001, maxSweeps: 200 }),
    ).toBeUndefined()
  })

  it('rejects invalid optimality configuration before Wasm coercion', () => {
    const valid = {
      discount: 0.9,
      slipProbability: 0,
      tolerance: 1e-12,
      maxSweeps: 1000,
      rewards: { default: -0.04, boundary: -1, hazard: -1, goal: 1 },
    }
    expect(optimalityConfigValidationError({ ...valid, discount: 1 })?.code).toBe(
      'optimality_discount_range',
    )
    expect(optimalityConfigValidationError({ ...valid, slipProbability: -0.1 })?.code).toBe(
      'optimality_slip_range',
    )
    expect(optimalityConfigValidationError({ ...valid, maxSweeps: 2.5 })?.code).toBe(
      'optimality_max_sweeps_range',
    )
    expect(
      optimalityConfigValidationError({
        ...valid,
        rewards: { ...valid.rewards, hazard: Number.POSITIVE_INFINITY },
      })?.code,
    ).toBe('optimality_reward_range')
    expect(optimalityConfigValidationError(valid)).toBeUndefined()
  })
})
