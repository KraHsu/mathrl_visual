import { expect, test, type Page } from '@playwright/test'

const route = 'en/labs/ch05-monte-carlo'

/**
 * Start each browser test with the documented, empty ledger.  The lab keeps a
 * seeded prefix in localStorage so that a locale switch can replay it; E2E
 * cases that are about a fresh algorithm deliberately clear that optional
 * persistence first.
 */
async function openCleanLab(page: Page) {
  await page.goto(route)
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  await page.reload()
  const lab = page.locator('[data-testid="monte-carlo-lab"]')
  await expect(lab).toHaveAttribute('data-phase', 'ready', { timeout: 15_000 })
  return lab
}

async function sampleOne(lab: ReturnType<Page['locator']>): Promise<void> {
  const sample = lab.getByRole('button', { name: 'Sample one episode', exact: true })
  await expect(sample).toBeEnabled()
  await sample.click()
  await expect(lab).toHaveAttribute('data-episode-count', '1', { timeout: 15_000 })
}

test('records a seeded episode, return ledger, and model-free audit', async ({ page }) => {
  const lab = await openCleanLab(page)

  await expect(lab.locator('.monte-carlo-state')).toHaveCount(16)
  await expect(lab.locator('.monte-carlo-action-table tbody tr')).toHaveCount(5)
  await expect(lab).toHaveAttribute('data-episode-count', '0')
  await expect(lab.locator('[data-episode-trace] .empty-state')).toBeVisible()

  await sampleOne(lab)
  const traceRows = lab.locator('.monte-carlo-trace-table tbody tr')
  const returnRows = lab.locator('.monte-carlo-return-table tbody tr')
  await expect(traceRows.first()).toBeVisible()
  await expect(returnRows).toHaveCount(await traceRows.count())

  const traceBounds = await traceRows.evaluateAll((rows) =>
    rows.every((row) => {
      const state = Number(row.getAttribute('data-state'))
      const action = Number(row.getAttribute('data-action'))
      return state >= 0 && state < 16 && action >= 0 && action < 5
    }),
  )
  expect(traceBounds).toBe(true)
  expect(
    await returnRows.evaluateAll((rows) =>
      rows.some((row) => row.getAttribute('data-included') === 'true'),
    ),
  ).toBe(true)

  await expect(lab.locator('.monte-carlo-audit-list li[data-audit="model"][data-pass="true"]')).toHaveCount(1)
  await expect(lab.locator('.monte-carlo-audit-list li[data-audit="rows"][data-pass="true"]')).toHaveCount(1)
  await expect(lab.locator('.monte-carlo-audit-list li[data-audit="finite"][data-pass="true"]')).toHaveCount(1)
  await expect(lab.locator('.monte-carlo-audit-list li[data-audit="trace"][data-pass="true"]')).toHaveCount(1)
  await expect(lab.locator('[data-metric-steps]')).not.toHaveText('0')
})

test('switches schedules and exposes a normalized epsilon policy row', async ({ page }) => {
  const lab = await openCleanLab(page)
  const mode = page.getByLabel('Monte Carlo schedule', { exact: true })
  const visit = page.getByLabel('Visit strategy', { exact: true })

  await mode.selectOption('exploring_starts')
  await expect(lab).toHaveAttribute('data-mode', 'exploring_starts')
  await expect(lab).toHaveAttribute('data-episode-count', '0')
  await visit.selectOption('every')
  await expect(lab).toHaveAttribute('data-visit-strategy', 'every')
  await sampleOne(lab)
  const exploringStart = Number(
    await lab.locator('.monte-carlo-trace-table tbody tr').first().getAttribute('data-state'),
  )
  expect(exploringStart).toBeGreaterThanOrEqual(0)
  expect(exploringStart).toBeLessThan(15)

  await mode.selectOption('epsilon_greedy')
  await expect(lab).toHaveAttribute('data-mode', 'epsilon_greedy')
  await expect(lab).toHaveAttribute('data-episode-count', '0')
  await page.getByLabel('Exploration ε', { exact: true }).fill('0.2')

  const probabilities = await lab
    .locator('.monte-carlo-action-table tbody [data-policy-probability]')
    .evaluateAll((cells) => cells.map((cell) => Number(cell.getAttribute('data-policy-probability'))))
  expect(probabilities).toHaveLength(5)
  expect(probabilities.every((value) => Number.isFinite(value) && value > 0)).toBe(true)
  expect(probabilities.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 10)
  // Five actions (the fourth chapter's Grid World also has stay) distribute
  // epsilon=.2 as .84 for the greedy action and .04 for each alternative.
  expect(Math.min(...probabilities)).toBeCloseTo(0.04, 10)
  expect(Math.max(...probabilities)).toBeCloseTo(0.84, 10)

  await sampleOne(lab)
  await expect(lab.locator('.monte-carlo-trace-table tbody tr').first()).toHaveAttribute('data-state', '0')
})

test('wind preset is visible in replay metadata and reset reproduces the trace', async ({ page }) => {
  const lab = await openCleanLab(page)
  await page.getByLabel('Preset', { exact: true }).selectOption('wind20')
  await page.getByRole('button', { name: 'Load preset', exact: true }).click()
  await expect(lab).toHaveAttribute('data-wind', '0.2')
  await expect(lab).toHaveAttribute('data-episode-count', '0')

  await sampleOne(lab)
  const firstTrace = await lab.locator('.monte-carlo-trace-table tbody tr').evaluateAll((rows) =>
    rows.map((row) => ({
      state: row.getAttribute('data-state'),
      action: row.getAttribute('data-action'),
      actualAction: row.getAttribute('data-actual-action'),
      text: row.textContent?.replace(/\s+/g, ' ').trim(),
    })),
  )
  const firstReturn = await lab.locator('[data-metric-mean]').textContent()

  await lab.getByRole('button', { name: 'Reset ledger', exact: true }).click()
  await expect(lab).toHaveAttribute('data-episode-count', '0')
  await sampleOne(lab)
  const replayTrace = await lab.locator('.monte-carlo-trace-table tbody tr').evaluateAll((rows) =>
    rows.map((row) => ({
      state: row.getAttribute('data-state'),
      action: row.getAttribute('data-action'),
      actualAction: row.getAttribute('data-actual-action'),
      text: row.textContent?.replace(/\s+/g, ' ').trim(),
    })),
  )
  expect(replayTrace).toEqual(firstTrace)
  await expect(lab.locator('[data-metric-mean]')).toHaveText(firstReturn ?? '')
})

test('rejects an invalid seed and recovers through Apply and restart', async ({ page }) => {
  const lab = await openCleanLab(page)
  const seed = page.getByLabel('Seed (hex)', { exact: true })

  await seed.fill('not-hex')
  await expect(seed).toHaveAttribute('aria-invalid', 'true')
  await expect(lab.locator('.validation-message')).toContainText('hexadecimal seed')
  await lab.getByRole('button', { name: 'Apply and restart', exact: true }).click()
  await expect(lab).toHaveAttribute('data-phase', 'error')
  await expect(lab.getByRole('button', { name: 'Sample one episode', exact: true })).toBeDisabled()

  await seed.fill('5eed')
  await lab.getByRole('button', { name: 'Apply and restart', exact: true }).click()
  await expect(lab).toHaveAttribute('data-phase', 'ready', { timeout: 15_000 })
  await sampleOne(lab)
})

test('keeps the Chinese Chapter 5 fallback readable without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()

  await page.goto('zh-Hans/learn/ch05/checkpoint')
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-Hans')
  await expect(page.getByRole('heading', { level: 1, name: '第五章检查点' })).toBeVisible()
  await expect(page.locator('meta[name="mathrl:source"]')).toHaveAttribute(
    'content',
    /Chapter%205%20Monte%20Carlo%20Methods\.pdf$/,
  )
  const alternateHref = await page
    .locator('link[rel="alternate"][hreflang="en"]')
    .getAttribute('href')
  const currentUrl = new URL(page.url())
  expect(new URL(alternateHref ?? '', currentUrl).pathname).toBe(
    currentUrl.pathname.replace('/zh-Hans/', '/en/'),
  )

  await page.goto('zh-Hans/labs/ch05-monte-carlo')
  await expect(page.getByRole('heading', { level: 1, name: 'Monte Carlo 回合实验' })).toBeVisible()
  await expect(page.getByText('模型无关边界', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'ε-greedy 策略检查' })).toBeVisible()
  expect(await page.locator('noscript').textContent()).toContain('交互控件需要 JavaScript')
  if (process.env.VITE_SITE_STAGE === 'preview') {
    await expect(page.locator('.preview-banner')).toContainText('Preview · 预览')
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,nofollow')
  }

  await context.close()
})

test('reflows the Monte Carlo workspace without page-level horizontal overflow', async ({ page }) => {
  for (const width of [1024, 800, 400, 320]) {
    await page.setViewportSize({ width, height: 900 })
    const lab = await openCleanLab(page)
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
      `${width}px viewport should not have page-level horizontal overflow`,
    ).toBe(true)
    expect(await lab.locator('.monte-carlo-grid').count()).toBe(1)
  }
})
