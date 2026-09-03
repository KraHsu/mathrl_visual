import { expect, test, type Page } from '@playwright/test'

type LabSpec = {
  chapter: number
  route: string
  selector: string
  stepSelector: string
  traceSelector: string
  progressAttribute: string
}

/**
 * Route-level coverage is kept separate from each chapter's richer algorithm
 * assertions.  This small matrix catches a missing locale page, a component
 * registration typo, or a Worker bundle that only fails after hydration.
 */
const labs: LabSpec[] = [
  {
    chapter: 7,
    route: 'en/labs/ch07-temporal-difference',
    selector: '[data-testid="temporal-difference-lab"]',
    // Selectors are resolved from the lab root returned by openLab(). Keep
    // them relative so a root locator is not accidentally nested twice.
    stepSelector: '.action-button:nth-of-type(2)',
    traceSelector: '.table-wrap tbody tr',
    progressAttribute: 'data-total-steps',
  },
  {
    chapter: 8,
    route: 'en/labs/ch08-value-function',
    selector: '[data-testid="value-function-lab"]',
    stepSelector: '.control-actions .action-button:nth-of-type(2)',
    traceSelector: '.table-wrap tbody tr',
    // The evaluator increments totalSteps even when a tabular mode keeps its
    // replay buffer empty; this is the deterministic one-step smoke signal.
    progressAttribute: 'data-total-steps',
  },
  {
    chapter: 9,
    route: 'en/labs/ch09-policy-gradient',
    selector: '[data-testid="policy-gradient-lab"]',
    stepSelector: '[data-testid="pg-step"]',
    traceSelector: '[data-testid="pg-trace"] tbody tr',
    progressAttribute: 'data-episode',
  },
  {
    chapter: 10,
    route: 'en/labs/ch10-actor-critic',
    selector: '[data-testid="actor-critic-lab"]',
    stepSelector: '[data-testid="ac-step"]',
    traceSelector: '[data-testid="ac-trace"] tbody tr',
    progressAttribute: 'data-episode',
  },
]

async function openLab(page: Page, spec: LabSpec) {
  await page.goto(spec.route)
  const lab = page.locator(spec.selector)
  await expect(lab).toHaveAttribute('data-phase', 'ready', { timeout: 30_000 })
  return lab
}

for (const spec of labs) {
  test(`Chapter ${spec.chapter} lab boots and records one update`, async ({ page }) => {
    const lab = await openLab(page, spec)
    await lab.locator(spec.stepSelector).click()
    await expect
      .poll(async () => Number(await lab.getAttribute(spec.progressAttribute)), { timeout: 15_000 })
      .toBeGreaterThan(0)
    expect(await lab.locator(spec.traceSelector).count()).toBeGreaterThan(0)
  })
}

test('Chapters 7–10 keep paired Chinese lab pages readable without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()

  for (const spec of labs) {
    const route = spec.route.replace(/^en\//, 'zh-Hans/')
    await page.goto(route)
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-Hans')
    await expect(page.locator('h1')).toHaveCount(1)
    await expect(page.locator('h1')).toContainText('实验')
    // Browsers expose a <noscript> element's fallback as innerHTML when
    // scripting is disabled, while textContent can be empty (the element is
    // parsed in the special noscript mode). Inspect the serialized fallback
    // so this assertion remains stable across Chromium versions.
    await expect
      .poll(async () => page.locator('noscript').evaluate((element) => element.innerHTML))
      .toMatch(/JavaScript/)
    await expect(page.locator('meta[name="mathrl:source"]')).toHaveAttribute(
      'content',
      new RegExp(`Chapter%20${spec.chapter}(?:%20|\.)`),
    )

    const alternate = await page
      .locator('link[rel="alternate"][hreflang="en"]')
      .getAttribute('href')
    expect(new URL(alternate ?? '', page.url()).pathname).toContain(`/en/labs/ch${String(spec.chapter).padStart(2, '0')}-`)
  }

  await context.close()
})

test('Chapters 7–10 labs do not create page-level horizontal overflow', async ({ page }) => {
  for (const width of [1024, 400, 320]) {
    await page.setViewportSize({ width, height: 900 })
    for (const spec of labs) {
      const lab = await openLab(page, spec)
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
        `${spec.chapter} at ${width}px should not overflow the page`,
      ).toBe(true)
      await expect(lab).toBeVisible()
    }
  }
})
