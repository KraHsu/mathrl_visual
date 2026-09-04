import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

type AxeViolation = Awaited<ReturnType<AxeBuilder['analyze']>>['violations'][number]

/**
 * The release gate samples every interactive lab in both published locales,
 * plus the home and accessibility pages.  Keeping this list explicit makes a
 * missing route fail loudly instead of silently reducing coverage.
 */
const routes = [
  'en/',
  'zh-Hans/',
  'en/accessibility',
  'zh-Hans/accessibility',
  'en/concepts/markov-property',
  'zh-Hans/concepts/markov-property',
  'en/map',
  'zh-Hans/map',
  'en/symbols',
  'zh-Hans/symbols',
  'en/search',
  'zh-Hans/search',
  'en/offline',
  'zh-Hans/offline',
  'en/learn/appendix/',
  'zh-Hans/learn/appendix/',
  'en/learn/appendix/probability',
  'zh-Hans/learn/appendix/probability',
  'en/learn/appendix/convergence',
  'zh-Hans/learn/appendix/convergence',
  'en/learn/appendix/linear-algebra',
  'zh-Hans/learn/appendix/linear-algebra',
  'en/learn/appendix/optimization',
  'zh-Hans/learn/appendix/optimization',
  'en/learn/appendix/glossary',
  'zh-Hans/learn/appendix/glossary',
  'en/about/license',
  'zh-Hans/about/license',
  'en/about/source-version',
  'zh-Hans/about/source-version',
  'en/about/release',
  'zh-Hans/about/release',
  'en/labs/ch01-gridworld',
  'zh-Hans/labs/ch01-gridworld',
  'en/labs/bellman-grid',
  'zh-Hans/labs/bellman-grid',
  'en/labs/ch02-policy-evaluation',
  'zh-Hans/labs/ch02-policy-evaluation',
  'en/labs/bellman-optimality-grid',
  'zh-Hans/labs/bellman-optimality-grid',
  'en/labs/ch04-planning-grid',
  'zh-Hans/labs/ch04-planning-grid',
  'en/labs/ch05-monte-carlo',
  'zh-Hans/labs/ch05-monte-carlo',
  'en/labs/ch06-stochastic-approximation',
  'zh-Hans/labs/ch06-stochastic-approximation',
  'en/labs/ch07-temporal-difference',
  'zh-Hans/labs/ch07-temporal-difference',
  'en/labs/ch08-value-function',
  'zh-Hans/labs/ch08-value-function',
  'en/labs/ch09-policy-gradient',
  'zh-Hans/labs/ch09-policy-gradient',
  'en/labs/ch10-actor-critic',
  'zh-Hans/labs/ch10-actor-critic',
] as const

const labRootSelector = [
  '.lab-shell[data-phase]',
  '.grid-lab[data-phase]',
  '.monte-carlo-lab[data-phase]',
].join(', ')

async function waitForLab(page: Page): Promise<void> {
  const lab = page.locator(labRootSelector).first()
  if (await lab.count() === 0) return
  await expect(lab).toHaveAttribute('data-phase', 'ready', { timeout: 30_000 })
}

/**
 * VitePress renders the appearance switch twice (desktop and the mobile
 * navigation drawer).  Its accessible name is supplied reactively, so axe
 * must not run against the short SSR window where the title is empty.  Accept
 * either attribute because VitePress versions/locales may expose the label as
 * `aria-label` or `title`.
 */
async function waitForAppearanceSwitch(page: Page): Promise<void> {
  const switches = page.locator('.VPSwitchAppearance')
  if (await switches.count() === 0) return

  await expect
    .poll(
      async () => {
        const labels = await switches.evaluateAll((elements) =>
          elements.map((element) =>
            element.getAttribute('aria-label')?.trim()
            || element.getAttribute('title')?.trim()
            || '',
          ),
        )
        return labels.some(Boolean) ? 'ready' : ''
      },
      { timeout: 10_000 },
    )
    .toBe('ready')
}

function formatViolations(violations: ReadonlyArray<AxeViolation>): string {
  return violations
    .map((violation) => {
      const nodes = violation.nodes
        .map((node) => {
          const target = node.target.join(' ')
          const summary = node.failureSummary?.replace(/\s+/g, ' ').trim() ?? ''
          return `    - ${target}${summary ? `: ${summary}` : ''}`
        })
        .join('\n')
      return `${violation.id} (${violation.impact ?? 'unknown'}): ${violation.help}\n${nodes}`
    })
    .join('\n')
}

test.describe('WCAG 2.2 AA accessibility', () => {
  // A single page at a time keeps the wasm Workers and axe injection stable
  // on Firefox/WebKit while still running this suite in each browser project.
  test.describe.configure({ mode: 'serial' })

  for (const route of routes) {
    test(`${route} has no automated WCAG violations`, async ({ page }) => {
      const response = await page.goto(route, { waitUntil: 'domcontentloaded' })
      expect(response, `Route did not return a response: ${route}`).not.toBeNull()
      expect(response?.status(), `Route returned HTTP ${response?.status()}: ${route}`).toBe(200)
      // VitePress renders the content landmark as #VPContent (a div rather
      // than a literal <main>); assert the stable landmark container before
      // injecting axe.
      await expect(page.locator('#VPContent')).toHaveCount(1)
      await waitForLab(page)
      await waitForAppearanceSwitch(page)

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze()

      expect(
        results.violations,
        `${route} accessibility violations:\n${formatViolations(results.violations)}`,
      ).toEqual([])
    })
  }
})
