import { describe, expect, it } from 'vitest'

import en from '../docs/.vitepress/i18n/ui.en.json'
import zhHans from '../docs/.vitepress/i18n/ui.zh-Hans.json'
import bellmanEn from '../docs/.vitepress/i18n/bellman.en.json'
import bellmanZhHans from '../docs/.vitepress/i18n/bellman.zh-Hans.json'
import optimalityEn from '../docs/.vitepress/i18n/optimality.en.json'
import optimalityZhHans from '../docs/.vitepress/i18n/optimality.zh-Hans.json'
import planningEn from '../docs/.vitepress/i18n/planning.en.json'
import planningZhHans from '../docs/.vitepress/i18n/planning.zh-Hans.json'
import monteCarloEn from '../docs/.vitepress/i18n/monteCarlo.en.json'
import monteCarloZhHans from '../docs/.vitepress/i18n/monteCarlo.zh-Hans.json'

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
  it('have identical key sets', () => {
    expect(keys(zhHans).sort()).toEqual(keys(en).sort())
    expect(keys(bellmanZhHans).sort()).toEqual(keys(bellmanEn).sort())
    expect(keys(optimalityZhHans).sort()).toEqual(keys(optimalityEn).sort())
    expect(keys(planningZhHans).sort()).toEqual(keys(planningEn).sort())
    expect(keys(monteCarloZhHans).sort()).toEqual(keys(monteCarloEn).sort())
  })

  it('preserve interpolation placeholders across locales', () => {
    expectPlaceholderParity(zhHans, en)
    expectPlaceholderParity(bellmanZhHans, bellmanEn)
    expectPlaceholderParity(optimalityZhHans, optimalityEn)
    expectPlaceholderParity(planningZhHans, planningEn)
    expectPlaceholderParity(monteCarloZhHans, monteCarloEn)
  })
})
