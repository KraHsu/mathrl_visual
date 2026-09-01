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
})
