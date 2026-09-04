import { describe, expect, it } from 'vitest'

import {
  PWA_STORAGE_SCHEMA_VERSION,
  migratePwaState,
  parseAndMigratePwaState,
  serializePwaState,
} from '../docs/.vitepress/pwaMigration'

describe('PWA preference migration', () => {
  it('migrates the v1 envelope and keeps bounded preferences', () => {
    const result = migratePwaState({
      v: 1,
      locale: 'zh-Hans',
      theme: 'dark',
      reducedMotion: true,
      lastRoute: '/zh-Hans/learn/ch07/',
      experiments: {
        'ch07:td': { mode: 'sarsa', episode: 4 },
        '../unsafe': { should: 'drop' },
      },
    }, { appVersion: '1.0.0' })

    expect(result.migrated).toBe(true)
    expect(result.fromVersion).toBe(1)
    expect(result.state).toEqual({
      schemaVersion: PWA_STORAGE_SCHEMA_VERSION,
      migratedFrom: 1,
      appVersion: '1.0.0',
      data: {
        locale: 'zh-Hans',
        theme: 'dark',
        reducedMotion: true,
        lastRoute: '/zh-Hans/learn/ch07/',
        experiments: { 'ch07:td': { mode: 'sarsa', episode: 4 } },
      },
    })
  })

  it('accepts the current schema and preserves version metadata', () => {
    const raw = JSON.stringify({
      schemaVersion: 2,
      appVersion: '0.2.0',
      engineVersion: '0.1.0',
      contentVersion: 'content-abcd',
      data: { locale: 'en', theme: 'auto' },
    })
    const result = parseAndMigratePwaState(raw)
    expect(result.migrated).toBe(false)
    expect(result.state?.appVersion).toBe('0.2.0')
    expect(result.state?.data).toEqual({ locale: 'en', theme: 'auto' })
    expect(serializePwaState(result.state!)).toBe(JSON.stringify(result.state))
  })

  it('does not overwrite a state from a future schema', () => {
    expect(migratePwaState({ schemaVersion: 99, data: { locale: 'en' } })).toEqual({
      migrated: false,
      fromVersion: 99,
      reason: 'future-schema',
    })
  })

  it('rejects malformed, unsafe, and oversized values without throwing', () => {
    expect(parseAndMigratePwaState('{not-json')).toEqual({ migrated: false, reason: 'invalid' })
    expect(migratePwaState(null)).toEqual({ migrated: false, reason: 'invalid' })
    expect(migratePwaState({ schemaVersion: 0 })).toEqual({
      migrated: false,
      reason: 'unsupported-schema',
    })
    expect(migratePwaState({
      schemaVersion: 1,
      lastRoute: '//evil.example/path',
      locale: 'fr',
      theme: 'solarized',
    }).state?.data).toEqual({})
    expect(parseAndMigratePwaState('x'.repeat(512 * 1024 + 1))).toEqual({
      migrated: false,
      reason: 'invalid',
    })
  })
})
