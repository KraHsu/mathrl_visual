import { defineConfig, devices } from '@playwright/test'

const siteBase = normalizeBase(process.env.SITE_BASE ?? '/')
const browserNames = requestedBrowsers(process.env.PLAYWRIGHT_BROWSERS ?? 'chromium')
const includeMobile = process.env.PLAYWRIGHT_MOBILE === '1'

const desktopProjects = browserNames.map((browserName) => ({
  name: browserName,
  testIgnore: /mobile\.spec\.ts/,
  use: { browserName },
}))

const mobileProjects = includeMobile
  ? browserNames.map((browserName) => {
      if (browserName === 'chromium') {
        return {
          name: 'chromium-mobile',
          testMatch: /mobile\.spec\.ts/,
          use: { ...devices['Pixel 5'], browserName },
        }
      }
      if (browserName === 'webkit') {
        return {
          name: 'webkit-mobile',
          testMatch: /mobile\.spec\.ts/,
          use: { ...devices['iPhone 13'], browserName },
        }
      }
      // Firefox does not expose WebKit's `isMobile` emulation flag.  Keep a
      // touch-capable phone-sized viewport so the same responsive smoke suite
      // still exercises Firefox's layout and keyboard/focus behavior.
      return {
        name: 'firefox-mobile',
        testMatch: /mobile\.spec\.ts/,
        use: {
          browserName,
          viewport: { width: 390, height: 844 },
          screen: { width: 390, height: 844 },
          deviceScaleFactor: 2,
          hasTouch: true,
          isMobile: false,
        },
      }
    })
  : []

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: `http://127.0.0.1:4173${siteBase}`,
    trace: 'retain-on-failure',
  },
  // Keep the fast Chromium default for local iteration. Release CI selects
  // all three desktop engines and sets PLAYWRIGHT_MOBILE=1 for the explicit
  // emulated-device smoke projects below. Browser selection is explicit
  // rather than silently falling back when a browser binary is unavailable.
  projects: [...desktopProjects, ...mobileProjects],
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

type BrowserName = 'chromium' | 'firefox' | 'webkit'

function requestedBrowsers(value: string): BrowserName[] {
  const aliases: Record<string, BrowserName[]> = {
    all: ['chromium', 'firefox', 'webkit'],
    chromium: ['chromium'],
    chrome: ['chromium'],
    firefox: ['firefox'],
    webkit: ['webkit'],
  }
  const names = value
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .flatMap((item) => aliases[item] ?? [])
  const invalid = value
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item && !aliases[item])
  if (invalid.length > 0) {
    throw new Error(
      `Unknown PLAYWRIGHT_BROWSERS value(s): ${invalid.join(', ')}. `
      + 'Use chromium, firefox, webkit, or all.',
    )
  }
  const unique = [...new Set(names)]
  if (unique.length === 0) {
    throw new Error('PLAYWRIGHT_BROWSERS must select at least one browser')
  }
  return unique
}
