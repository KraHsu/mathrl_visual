import { describe, expect, it } from 'vitest'

import {
  PROGRESS_SCHEMA_VERSION,
  parseProgress,
  serializeProgress,
  updateRecord,
  validateProgress,
} from '../docs/.vitepress/progressStore'

describe('device-local progress contract', () => {
  it('updates completion and bookmark flags without locale-specific keys', () => {
    const initial = {
      schema: PROGRESS_SCHEMA_VERSION,
      updatedAt: '2026-09-03T00:00:00.000Z',
      records: {},
    } as const
    const complete = updateRecord(initial, 'ch01-overview', 'completedAt', true)
    const bookmarked = updateRecord(complete, 'ch01-overview', 'bookmarkedAt', true)

    expect(bookmarked.records['ch01-overview']).toMatchObject({
      completedAt: expect.any(String),
      bookmarkedAt: expect.any(String),
    })
    expect(updateRecord(bookmarked, 'ch01-overview', 'completedAt', false).records['ch01-overview'])
      .toMatchObject({ bookmarkedAt: expect.any(String) })
  })

  it('round-trips a bounded export and rejects malformed or oversized records', () => {
    const snapshot = {
      schema: PROGRESS_SCHEMA_VERSION,
      updatedAt: '2026-09-03T00:00:00.000Z',
      records: { 'ch02-overview': { completedAt: '2026-09-03T00:00:00.000Z' } },
    }
    expect(parseProgress(serializeProgress(snapshot))).toEqual(snapshot)
    expect(validateProgress({ ...snapshot, schema: 99 })).toBeUndefined()
    expect(validateProgress({ ...snapshot, records: { '<script>': {} } })).toBeUndefined()
  })
})
