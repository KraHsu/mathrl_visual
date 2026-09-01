import { defineConfig } from '@playwright/test'

const siteBase = normalizeBase(process.env.SITE_BASE ?? '/')

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: `http://127.0.0.1:4173${siteBase}`,
    channel: 'chrome',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'corepack pnpm preview --host 127.0.0.1 --port 4173',
    url: `http://127.0.0.1:4173${siteBase}`,
    env: {
      ...process.env,
      SITE_BASE: siteBase,
    },
    // Default to the just-built preview. Reusing an arbitrary process on this
    // port can silently exercise stale assets instead of the current build.
    reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === '1',
    timeout: 30_000,
  },
})

function normalizeBase(value: string): string {
  const withLeadingSlash = value.startsWith('/') ? value : `/${value}`
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`
}
