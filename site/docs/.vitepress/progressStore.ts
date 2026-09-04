/**
 * Device-local learning progress.
 *
 * IndexedDB is the primary store because notes and future checkpoints can
 * grow beyond the small synchronous localStorage quota.  A bounded,
 * versioned localStorage mirror keeps the progress controls useful in
 * private browsing modes and in browsers that do not expose IndexedDB.
 */

export const PROGRESS_SCHEMA_VERSION = 1 as const
const DB_NAME = 'mathrl-visual-progress'
const DB_VERSION = 1
const STORE_NAME = 'snapshots'
const SNAPSHOT_KEY = 'current'
const LOCAL_KEY = 'mathrl-visual.progress.v1'
const MAX_RECORDS = 5000

export type ProgressRecord = {
  completedAt?: string
  bookmarkedAt?: string
}

export type ProgressSnapshot = {
  schema: typeof PROGRESS_SCHEMA_VERSION
  updatedAt: string
  records: Record<string, ProgressRecord>
}

export type ProgressBackend = 'indexeddb' | 'local'

export type LoadedProgress = {
  snapshot: ProgressSnapshot
  backend: ProgressBackend
  fallback: boolean
}

const emptySnapshot = (): ProgressSnapshot => ({
  schema: PROGRESS_SCHEMA_VERSION,
  updatedAt: new Date().toISOString(),
  records: {},
})

function browserStorage(): Storage | undefined {
  if (typeof window === 'undefined') return undefined
  try {
    return window.localStorage
  } catch {
    return undefined
  }
}

function isRecord(value: unknown): value is ProgressRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const candidate = value as Record<string, unknown>
  return (
    (candidate.completedAt === undefined || typeof candidate.completedAt === 'string') &&
    (candidate.bookmarkedAt === undefined || typeof candidate.bookmarkedAt === 'string')
  )
}

export function validateProgress(value: unknown): ProgressSnapshot | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const candidate = value as Record<string, unknown>
  if (candidate.schema !== PROGRESS_SCHEMA_VERSION || typeof candidate.updatedAt !== 'string') {
    return undefined
  }
  if (!candidate.records || typeof candidate.records !== 'object' || Array.isArray(candidate.records)) {
    return undefined
  }
  const entries = Object.entries(candidate.records as Record<string, unknown>)
  if (entries.length > MAX_RECORDS) return undefined
  const records: Record<string, ProgressRecord> = {}
  for (const [id, record] of entries) {
    if (!id || id.length > 180 || !/^[A-Za-z0-9][A-Za-z0-9._:/-]*$/.test(id) || !isRecord(record)) {
      return undefined
    }
    records[id] = { ...record }
  }
  return {
    schema: PROGRESS_SCHEMA_VERSION,
    updatedAt: candidate.updatedAt,
    records,
  }
}

function readLocal(): ProgressSnapshot | undefined {
  const storage = browserStorage()
  if (!storage) return undefined
  try {
    const raw = storage.getItem(LOCAL_KEY)
    return raw ? validateProgress(JSON.parse(raw)) : undefined
  } catch {
    return undefined
  }
}

function writeLocal(snapshot: ProgressSnapshot): boolean {
  const storage = browserStorage()
  if (!storage) return false
  try {
    storage.setItem(LOCAL_KEY, JSON.stringify(snapshot))
    return true
  } catch {
    return false
  }
}

function indexedDbAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined'
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!indexedDbAvailable()) {
      reject(new Error('indexeddb-unavailable'))
      return
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error ?? new Error('indexeddb-open-failed'))
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME)
    }
    request.onsuccess = () => resolve(request.result)
  })
}

async function readIndexedDb(): Promise<ProgressSnapshot | undefined> {
  const database = await openDb()
  try {
    return await new Promise<ProgressSnapshot | undefined>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readonly')
      const request = transaction.objectStore(STORE_NAME).get(SNAPSHOT_KEY)
      request.onerror = () => reject(request.error ?? new Error('indexeddb-read-failed'))
      request.onsuccess = () => resolve(validateProgress(request.result))
    })
  } finally {
    database.close()
  }
}

async function writeIndexedDb(snapshot: ProgressSnapshot): Promise<void> {
  const database = await openDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite')
      transaction.objectStore(STORE_NAME).put(snapshot, SNAPSHOT_KEY)
      transaction.onerror = () => reject(transaction.error ?? new Error('indexeddb-write-failed'))
      transaction.oncomplete = () => resolve()
    })
  } finally {
    database.close()
  }
}

export async function loadProgress(): Promise<LoadedProgress> {
  const local = readLocal()
  if (indexedDbAvailable()) {
    try {
      const indexed = await readIndexedDb()
      if (indexed) {
        // Keep a small mirror for export/recovery and tolerate a stale mirror.
        writeLocal(indexed)
        return { snapshot: indexed, backend: 'indexeddb', fallback: false }
      }
      const initial = local ?? emptySnapshot()
      await writeIndexedDb(initial)
      writeLocal(initial)
      return { snapshot: initial, backend: 'indexeddb', fallback: false }
    } catch {
      return { snapshot: local ?? emptySnapshot(), backend: 'local', fallback: true }
    }
  }
  return { snapshot: local ?? emptySnapshot(), backend: 'local', fallback: true }
}

export async function saveProgress(snapshot: ProgressSnapshot): Promise<ProgressBackend> {
  const valid = validateProgress(snapshot)
  if (!valid) throw new Error('invalid-progress-snapshot')
  const mirror = writeLocal(valid)
  if (indexedDbAvailable()) {
    try {
      await writeIndexedDb(valid)
      return 'indexeddb'
    } catch {
      if (mirror) return 'local'
      throw new Error('progress-storage-failed')
    }
  }
  if (mirror) return 'local'
  throw new Error('progress-storage-failed')
}

export function updateRecord(
  snapshot: ProgressSnapshot,
  contentId: string,
  field: keyof ProgressRecord,
  enabled: boolean,
): ProgressSnapshot {
  if (!/^[A-Za-z0-9][A-Za-z0-9._:/-]*$/.test(contentId)) throw new Error('invalid-content-id')
  const records = { ...snapshot.records }
  const current = { ...(records[contentId] ?? {}) }
  if (enabled) current[field] = new Date().toISOString()
  else delete current[field]
  if (Object.keys(current).length) records[contentId] = current
  else delete records[contentId]
  return { schema: PROGRESS_SCHEMA_VERSION, updatedAt: new Date().toISOString(), records }
}

export function serializeProgress(snapshot: ProgressSnapshot): string {
  const valid = validateProgress(snapshot)
  if (!valid) throw new Error('invalid-progress-snapshot')
  return JSON.stringify(valid, null, 2)
}

export function parseProgress(text: string): ProgressSnapshot {
  const parsed = validateProgress(JSON.parse(text))
  if (!parsed) throw new Error('invalid-progress-file')
  return parsed
}

export function downloadProgress(snapshot: ProgressSnapshot, locale: string): void {
  if (typeof document === 'undefined' || typeof URL === 'undefined') return
  const blob = new Blob([serializeProgress(snapshot)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `mathrl-progress-${locale || 'en'}.json`
  anchor.click()
  // Releasing the object URL is safe after the click has been queued.
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}
