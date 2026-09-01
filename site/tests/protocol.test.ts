import { describe, expect, it } from 'vitest'

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

describe('acceptsResponse', () => {
  it('accepts only newer messages for the current run', () => {
    expect(acceptsResponse(response('active', 4), 'active', 3)).toBe(true)
    expect(acceptsResponse(response('stale', 5), 'active', 3)).toBe(false)
    expect(acceptsResponse(response('active', 3), 'active', 3)).toBe(false)
  })
})
