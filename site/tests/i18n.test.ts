import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * Discover every component catalog instead of maintaining a second list when
 * a new chapter adds a lab.  A missing counterpart is intentionally reported
 * here (rather than silently omitted from the parity comparison).
 */
const catalogDirectory = fileURLToPath(new URL('../docs/.vitepress/i18n/', import.meta.url))
const catalogFiles = readdirSync(catalogDirectory).filter((file) => /\.(?:en|zh-Hans)\.json$/.test(file))

function readCatalog(file: string): unknown {
  return JSON.parse(readFileSync(`${catalogDirectory}/${file}`, 'utf8')) as unknown
}

const catalogs = new Map(catalogFiles.map((file) => [file, readCatalog(file)]))
const catalogPairs = [...new Set(catalogFiles.map((file) => file.replace(/\.(?:en|zh-Hans)\.json$/, '')))]
  .sort()
  .map((base) => ({
    base,
    enFile: `${base}.en.json`,
    zhFile: `${base}.zh-Hans.json`,
  }))

const interactiveChapterCatalogs = [
  'temporalDifference',
  'valueFunction',
  'policyGradient',
  'actorCritic',
]

function keys(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) return [prefix]
  return Object.entries(value).flatMap(([key, nested]) => keys(nested, prefix ? `${prefix}.${key}` : key))
}

function messages(value: unknown, prefix = ''): Record<string, string> {
  if (typeof value === 'string') return { [prefix]: value }
  if (typeof value !== 'object' || value === null) return {}
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, nested]) =>
      Object.entries(messages(nested, prefix ? `${prefix}.${key}` : key)),
    ),
  )
}

function placeholders(message: string): string[] {
  return [...message.matchAll(/\{([A-Za-z][A-Za-z0-9]*)\}/g)]
    .map((match) => match[1])
    .sort()
}

function expectPlaceholderParity(left: unknown, right: unknown): void {
  const leftMessages = messages(left)
  const rightMessages = messages(right)
  for (const key of Object.keys(rightMessages)) {
    expect(placeholders(leftMessages[key] ?? ''), `placeholder mismatch at ${key}`).toEqual(
      placeholders(rightMessages[key]),
    )
  }
}

describe('UI message catalogs', () => {
  it('has a counterpart for every locale catalog', () => {
    for (const pair of catalogPairs) {
      expect(catalogs.has(pair.enFile), `${pair.base}: missing English catalog`).toBe(true)
      expect(catalogs.has(pair.zhFile), `${pair.base}: missing Simplified Chinese catalog`).toBe(true)
    }
  })

  it('ships paired catalogs for Chapters 7–10 labs', () => {
    for (const base of interactiveChapterCatalogs) {
      expect(catalogs.has(`${base}.en.json`), `${base}: missing English catalog`).toBe(true)
      expect(catalogs.has(`${base}.zh-Hans.json`), `${base}: missing Simplified Chinese catalog`).toBe(true)
    }
  })

  it('has identical key sets across every locale pair', () => {
    for (const pair of catalogPairs) {
      const en = catalogs.get(pair.enFile)
      const zhHans = catalogs.get(pair.zhFile)
      expect(keys(zhHans).sort(), `${pair.base}: key set mismatch`).toEqual(keys(en).sort())
    }
  })

  it('does not leave locale catalog files outside the paired naming scheme', () => {
    for (const file of catalogFiles) {
      expect(file, `${file}: catalog filename must end in .en.json or .zh-Hans.json`).toMatch(
        /^.+\.(?:en|zh-Hans)\.json$/,
      )
    }
  })

  it('preserve interpolation placeholders across locales', () => {
    for (const pair of catalogPairs) {
      expectPlaceholderParity(catalogs.get(pair.zhFile), catalogs.get(pair.enFile))
    }
  })
})
