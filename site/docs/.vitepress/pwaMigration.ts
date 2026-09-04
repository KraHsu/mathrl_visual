/**
 * Versioned, local-only preferences used by the static PWA shell.
 *
 * Experiments keep their own replay schemas (and validate them at the
 * component boundary).  This module owns only cross-page preferences, so a
 * service-worker update can migrate them without requiring a server or an
 * account.  It is intentionally pure and is safe to run in Node tests.
 */

export const PWA_STORAGE_KEY = 'mathrl:pwa:state'
export const PWA_STORAGE_SCHEMA_VERSION = 2 as const

export type PwaLocale = 'zh-Hans' | 'en'
export type PwaTheme = 'light' | 'dark' | 'auto'

export interface PwaStateData {
  locale?: PwaLocale
  theme?: PwaTheme
  reducedMotion?: boolean
  lastRoute?: string
  experiments?: Record<string, Record<string, unknown>>
}

export interface PwaStateEnvelope {
  schemaVersion: typeof PWA_STORAGE_SCHEMA_VERSION
  migratedFrom?: number
  appVersion?: string
  engineVersion?: string
  contentVersion?: string
  data: PwaStateData
}

export interface PwaMigrationResult {
  state?: PwaStateEnvelope
  migrated: boolean
  fromVersion?: number
  reason?: 'invalid' | 'future-schema' | 'unsupported-schema'
}

const LOCALES = new Set<PwaLocale>(['zh-Hans', 'en'])
const THEMES = new Set<PwaTheme>(['light', 'dark', 'auto'])
const MAX_ROUTE_LENGTH = 240
const MAX_EXPERIMENTS = 32
const MAX_EXPERIMENT_BYTES = 16 * 1024

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isJsonSafe(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) return false
  try {
    const encoded = JSON.stringify(value)
    return typeof encoded === 'string' && encoded.length <= MAX_EXPERIMENT_BYTES
  } catch {
    return false
  }
}

function cleanData(value: unknown): PwaStateData {
  if (!isRecord(value)) return {}
  const source = isRecord(value.data) ? value.data : value
  const data: PwaStateData = {}
  if (LOCALES.has(source.locale as PwaLocale)) data.locale = source.locale as PwaLocale
  if (THEMES.has(source.theme as PwaTheme)) data.theme = source.theme as PwaTheme
  if (typeof source.reducedMotion === 'boolean') data.reducedMotion = source.reducedMotion
  if (
    typeof source.lastRoute === 'string' &&
    source.lastRoute.length > 0 &&
    source.lastRoute.length <= MAX_ROUTE_LENGTH &&
    source.lastRoute.startsWith('/') &&
    !source.lastRoute.startsWith('//')
  ) {
    data.lastRoute = source.lastRoute
  }

  if (isRecord(source.experiments)) {
    const experiments: Record<string, Record<string, unknown>> = {}
    for (const key of Object.keys(source.experiments).slice(0, MAX_EXPERIMENTS)) {
      if (!/^[a-zA-Z0-9:_-]{1,96}$/.test(key)) continue
      const item = source.experiments[key]
      if (isJsonSafe(item)) experiments[key] = item
    }
    if (Object.keys(experiments).length > 0) data.experiments = experiments
  }
  return data
}

function versionOf(value: unknown): number {
  if (!isRecord(value)) return 1
  if (Number.isInteger(value.schemaVersion)) return value.schemaVersion as number
  if (Number.isInteger(value.v)) return value.v as number
  return 1
}

/** Migrate a parsed value without touching browser storage. */
export function migratePwaState(
  value: unknown,
  context: Pick<PwaStateEnvelope, 'appVersion' | 'engineVersion' | 'contentVersion'> = {},
): PwaMigrationResult {
  if (!isRecord(value)) return { migrated: false, reason: 'invalid' }
  const fromVersion = versionOf(value)
  if (!Number.isSafeInteger(fromVersion) || fromVersion < 1) {
    return { migrated: false, reason: 'unsupported-schema' }
  }
  if (fromVersion > PWA_STORAGE_SCHEMA_VERSION) {
    return { migrated: false, fromVersion, reason: 'future-schema' }
  }

  const data = cleanData(value)
  const state: PwaStateEnvelope = {
    schemaVersion: PWA_STORAGE_SCHEMA_VERSION,
    ...(fromVersion === PWA_STORAGE_SCHEMA_VERSION ? {} : { migratedFrom: fromVersion }),
    ...(context.appVersion ? { appVersion: context.appVersion } : {}),
    ...(context.engineVersion ? { engineVersion: context.engineVersion } : {}),
    ...(context.contentVersion ? { contentVersion: context.contentVersion } : {}),
    data,
  }
  if (fromVersion === PWA_STORAGE_SCHEMA_VERSION && isRecord(value)) {
    for (const key of ['appVersion', 'engineVersion', 'contentVersion'] as const) {
      const candidate = value[key]
      if (typeof candidate === 'string' && candidate.length <= 128 && state[key] === undefined) {
        state[key] = candidate
      }
    }
  }
  return { state, migrated: fromVersion !== PWA_STORAGE_SCHEMA_VERSION, fromVersion }
}

export function parseAndMigratePwaState(
  raw: string | null | undefined,
  context: Pick<PwaStateEnvelope, 'appVersion' | 'engineVersion' | 'contentVersion'> = {},
): PwaMigrationResult {
  if (!raw || raw.length > 512 * 1024) return { migrated: false, reason: 'invalid' }
  try {
    return migratePwaState(JSON.parse(raw), context)
  } catch {
    return { migrated: false, reason: 'invalid' }
  }
}

export function serializePwaState(state: PwaStateEnvelope): string {
  if (state.schemaVersion !== PWA_STORAGE_SCHEMA_VERSION) {
    throw new Error(`unsupported PWA storage schema: ${String(state.schemaVersion)}`)
  }
  const migrated = migratePwaState(state)
  if (!migrated.state) throw new Error('invalid PWA state')
  return JSON.stringify(migrated.state)
}
