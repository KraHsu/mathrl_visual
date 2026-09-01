import { describe, expect, it } from 'vitest'

import en from '../docs/.vitepress/i18n/ui.en.json'
import zhHans from '../docs/.vitepress/i18n/ui.zh-Hans.json'

function keys(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) return [prefix]
  return Object.entries(value).flatMap(([key, nested]) => keys(nested, prefix ? `${prefix}.${key}` : key))
}

describe('UI message catalogs', () => {
  it('have identical key sets', () => {
    expect(keys(zhHans).sort()).toEqual(keys(en).sort())
  })
})
