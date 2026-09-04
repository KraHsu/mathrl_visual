import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  GENERATED_FILE_PATTERNS,
  sourceTreeIdentity,
  sourceTreeIdentitySync,
} from '../../scripts/source-identity.mjs'

const projectRoot = resolve(fileURLToPath(new URL('../../', import.meta.url)))

describe('source tree identity', () => {
  it('keeps synchronous SSR and asynchronous artifact identities identical', async () => {
    await expect(sourceTreeIdentity(projectRoot)).resolves.toEqual(sourceTreeIdentitySync(projectRoot))
  })

  it('excludes Vite timestamped config copies from authored content', () => {
    const generated = 'site/docs/.vitepress/config.mts.timestamp-1788455091909-46436870a761b8.mjs'
    expect(GENERATED_FILE_PATTERNS.some((pattern) => pattern.test(generated))).toBe(true)
  })
})
