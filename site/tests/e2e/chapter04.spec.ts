import { expect, test } from '@playwright/test'

const route = 'en/labs/ch04-planning-grid'
const modes = ['value_iteration', 'policy_iteration', 'truncated_policy_iteration'] as const

async function openCleanLab(page: import('@playwright/test').Page) {
  await page.goto(route)
  // Each test starts from the documented v₀/π₀ state.  The real persistence
  // path is exercised separately, while this guard prevents a prior test's
  // localStorage from changing its golden frontier.
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  await page.reload()
  const lab = page.locator('.planning-lab')
  await expect(lab).toHaveAttribute('data-phase', 'ready', { timeout: 10_000 })
  return lab
}

async function cardOuter(
  lab: import('@playwright/test').Locator,
  mode: string,
): Promise<number> {
  return Number(await lab.locator(`.planning-algorithm-card[data-mode="${mode}"]`).getAttribute('data-outer-iteration'))
}

test('shows three independent algorithms and the first synchronous frontier', async ({ page }) => {
  const lab = await openCleanLab(page)
  await expect(lab.locator('.planning-algorithm-card')).toHaveCount(3)
  await expect(lab.locator('.planning-state')).toHaveCount(48)
  for (const mode of modes) await expect(lab.locator(`.planning-algorithm-card[data-mode="${mode}"]`)).toHaveAttribute('data-outer-iteration', '0')

  await lab.getByRole('button', { name: 'Advance selected once', exact: true }).click()
  await expect(lab.locator('.planning-algorithm-card[data-mode="value_iteration"]')).toHaveAttribute('data-outer-iteration', '1')
  await expect(lab.locator('.planning-state[data-mode="value_iteration"][data-state="11"]')).toHaveAttribute('data-value', '1')
  await expect(lab.locator('.planning-state[data-mode="value_iteration"][data-state="15"]')).toHaveAttribute('data-value', '0')
  await expect(lab.locator('[data-cost-mode="value_iteration"] [data-cost-action-evaluations]')).toHaveText('80')

  // One queued click advances every nonterminal mode exactly once without
  // sharing a value vector between evaluators.
  await lab.getByRole('button', { name: 'All algorithms', exact: true }).click()
  await expect(lab.locator('.planning-algorithm-card[data-mode="value_iteration"]')).toHaveAttribute('data-outer-iteration', '2')
  await expect(lab.locator('.planning-algorithm-card[data-mode="policy_iteration"]')).toHaveAttribute('data-outer-iteration', '1')
  await expect(lab.locator('.planning-algorithm-card[data-mode="truncated_policy_iteration"]')).toHaveAttribute('data-outer-iteration', '1')

  await lab.getByRole('button', { name: 'Policy Iteration', exact: true }).click()
  await lab.getByRole('button', { name: 'Advance selected once', exact: true }).click()
  await expect(lab.locator('.planning-phase-table tbody tr')).toHaveCount(2)
  await expect(lab.locator('.planning-phase-table tbody tr').first()).toContainText('Policy evaluation')
  await expect(lab.locator('[data-comparison-mode="policy_iteration"] [data-comparison-eval]')).not.toHaveAttribute('data-comparison-eval', '0')

  await lab.getByRole('button', { name: 'Truncated Policy Iteration', exact: true }).click()
  await lab.getByRole('button', { name: 'Advance selected once', exact: true }).click()
  await expect(lab.locator('.planning-phase-table tbody tr')).toHaveCount(2)
  await expect(lab.locator('.planning-phase-table tbody tr').first()).toContainText('Policy evaluation')
})

test('converges VI, records PI/TPI work, and retains greedy policies', async ({ page }) => {
  const lab = await openCleanLab(page)
  await lab.getByRole('button', { name: 'Run selected to stopping condition', exact: true }).click()
  const vi = lab.locator('.planning-algorithm-card[data-mode="value_iteration"]')
  await expect(vi).toHaveAttribute('data-converged', 'true', { timeout: 10_000 })
  await expect(vi).toHaveAttribute('data-outer-iteration', '6')
  expect(Number(await lab.locator('.planning-state[data-mode="value_iteration"][data-state="0"]').getAttribute('data-value'))).toBeCloseTo(0.426686, 6)
  await expect(lab.locator('.planning-audit-list li[data-pass="true"]')).toHaveCount(7)

  for (const mode of ['policy_iteration', 'truncated_policy_iteration'] as const) {
    await lab.locator(`.planning-algorithm-card[data-mode="${mode}"]`).click()
    await lab.getByRole('button', { name: 'Run selected to stopping condition', exact: true }).click()
    await expect(lab.locator(`.planning-algorithm-card[data-mode="${mode}"]`)).toHaveAttribute('data-converged', 'true', { timeout: 10_000 })
    expect(Number(await lab.locator(`[data-cost-mode="${mode}"] [data-cost-total]`).textContent())).toBeGreaterThan(0)
  }
})

test('wind preset exposes outcome probabilities before the action maximum', async ({ page }) => {
  const lab = await openCleanLab(page)
  await lab.getByLabel('Preset', { exact: true }).selectOption('wind20')
  await lab.getByRole('button', { name: 'Load preset', exact: true }).click()
  await expect(lab).toHaveAttribute('data-wind', '0.2')
  await lab.locator('.planning-state[data-mode="value_iteration"][data-state="11"]').click()
  await lab.getByRole('button', { name: 'Inspect outcomes for down', exact: true }).click()
  const rows = lab.locator('.planning-ledger-table tbody tr')
  await expect(rows).toHaveCount(4)
  const probabilities = await rows.locator('[data-probability]').evaluateAll((cells) =>
    cells.map((cell) => Number(cell.getAttribute('data-probability'))).sort((a, b) => a - b),
  )
  expect(probabilities[0]).toBeCloseTo(0.05, 12)
  expect(probabilities[1]).toBeCloseTo(0.05, 12)
  expect(probabilities[2]).toBeCloseTo(0.05, 12)
  expect(probabilities[3]).toBeCloseTo(0.85, 12)
  const q = Number(await lab.locator('.planning-action-table tr[data-action="2"] [data-q-value]').getAttribute('data-q-value'))
  expect(q).toBeCloseTo(0.796, 12)
  expect(Number(await lab.locator('[data-ledger-total]').getAttribute('data-ledger-total'))).toBeCloseTo(q, 12)
})

test('recovers from invalid input and restores bilingual run state', async ({ page }) => {
  const lab = await openCleanLab(page)
  const discount = page.getByLabel('Discount factor γ', { exact: true })
  await discount.fill('1')
  await expect(discount).toHaveAttribute('aria-invalid', 'true')
  await lab.getByRole('button', { name: 'Apply and restart all', exact: true }).click()
  await expect(lab).toHaveAttribute('data-phase', 'error')
  await discount.fill('0.9')
  await lab.getByRole('button', { name: 'Apply and restart all', exact: true }).click()
  await expect(lab).toHaveAttribute('data-phase', 'ready')

  await lab.getByRole('button', { name: 'Policy Iteration', exact: true }).click()
  await lab.locator('.planning-state[data-mode="policy_iteration"][data-state="7"]').click()
  await lab.getByRole('button', { name: 'Advance selected once', exact: true }).click()
  await expect(lab).toHaveAttribute('data-selected-mode', 'policy_iteration')
  await page.goto('zh-Hans/labs/ch04-planning-grid')
  const zh = page.locator('.planning-lab')
  await expect(zh).toHaveAttribute('data-phase', 'ready', { timeout: 10_000 })
  await expect(zh).toHaveAttribute('data-selected-mode', 'policy_iteration')
  await expect(zh).toHaveAttribute('data-selected-state', '7')
  await expect(zh.locator('.planning-algorithm-card[data-mode="policy_iteration"]')).toHaveAttribute('data-outer-iteration', '1')
  await expect(zh.locator('.planning-audit-list li[data-pass="true"]')).toHaveCount(7)
})

test('keeps the bilingual planning chapter readable without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()

  await page.goto('zh-Hans/learn/ch04/checkpoint')
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-Hans')
  await expect(page.getByRole('heading', { level: 1, name: '第四章检查点' })).toBeVisible()
  await expect(page.locator('meta[name="mathrl:source"]')).toHaveAttribute('content', /Chapter%204/)
  const alternateHref = await page
    .locator('link[rel="alternate"][hreflang="en"]')
    .getAttribute('href')
  const currentUrl = new URL(page.url())
  expect(new URL(alternateHref ?? '', currentUrl).pathname).toBe(
    currentUrl.pathname.replace('/zh-Hans/', '/en/'),
  )
  if (process.env.VITE_SITE_STAGE === 'preview') {
    await expect(page.locator('.preview-banner')).toContainText('Preview · 预览')
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,nofollow')
  }

  await context.close()
})

test('chunks reduced-motion runs and has no page-level overflow', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const lab = await openCleanLab(page)
  await lab.getByRole('button', { name: 'Run selected to stopping condition', exact: true }).click()
  await expect(lab.locator('.planning-algorithm-card[data-mode="value_iteration"]')).toHaveAttribute('data-converged', 'true', { timeout: 10_000 })
  expect(Number(await lab.getAttribute('data-outer-iteration'))).toBeGreaterThan(0)

  for (const width of [1024, 800, 400, 320]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto(route)
    await expect(page.locator('.planning-lab')).toHaveAttribute('data-phase', 'ready', { timeout: 10_000 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `${width}px should not overflow`).toBe(true)
  }
})
