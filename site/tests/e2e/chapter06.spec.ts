import { expect, test } from '@playwright/test'

const route = 'en/labs/ch06-stochastic-approximation'

async function ready(page: import('@playwright/test').Page): Promise<import('@playwright/test').Locator> {
  await page.goto(route)
  const lab = page.locator('.stochastic-approximation-lab')
  await expect(lab).toHaveAttribute('data-phase', 'ready', { timeout: 30_000 })
  return lab
}

test('replays a seeded scalar update and exposes the arithmetic trace', async ({ page }) => {
  const lab = await ready(page)
  const rows = lab.locator('[data-testid="sa-trace"] tbody tr')
  await expect(rows).toHaveCount(0)
  await lab.locator('[data-testid="sa-step"]').click()
  await expect(rows).toHaveCount(1)
  await expect(rows.first().locator('td').first()).toHaveText('1')
  await expect(lab.locator('[data-testid="sa-metrics"]')).toContainText('1')
  await lab.locator('[data-testid="sa-advance"]').click()
  await expect(rows).toHaveCount(12)
  await expect(lab.locator('.sa-chart polyline')).toHaveCount(1)
})

test('switches to Robbins–Monro and reports the schedule diagnostic', async ({ page }) => {
  const lab = await ready(page)
  await lab.getByLabel('Preset', { exact: true }).selectOption('rm')
  await expect(lab.getByLabel('Update family', { exact: true })).toHaveValue('robbins_monro')
  await expect(lab.getByLabel('Root function', { exact: true })).toHaveValue('tanh')
  await lab.locator('[data-testid="sa-step"]').click()
  await expect(lab.locator('[data-testid="sa-trace"] tbody tr')).toHaveCount(1)
  await expect(lab).toContainText('Σ α')
})

test('batch preset exposes a visible batch size and finite-run boundary', async ({ page }) => {
  const lab = await ready(page)
  await lab.getByLabel('Preset', { exact: true }).selectOption('batch')
  await expect(lab.getByLabel('Update family', { exact: true })).toHaveValue('batch_gradient')
  await expect(lab.getByLabel('Batch size', { exact: true })).toHaveValue('200')
  await lab.locator('[data-testid="sa-run"]').click()
  await expect(lab.locator('[data-testid="sa-metrics"]')).toContainText('200')
})

test('runs the complete configured budget beyond the small demo prefix', async ({ page }) => {
  const lab = await ready(page)
  await lab.getByLabel('Dataset / sample count', { exact: true }).fill('501')
  await lab.locator('[data-testid="sa-apply"]').click()
  await expect(lab).toHaveAttribute('data-phase', 'ready', { timeout: 30_000 })
  await lab.locator('[data-testid="sa-run"]').click()
  await expect(lab).toHaveAttribute('data-iteration', '501', { timeout: 15_000 })
  await expect(lab.locator('[data-testid="sa-diagnostics"]')).toContainText('Budget exhausted')
  await expect(lab.locator('[data-testid="sa-diagnostics"]')).toContainText('yes')
})

test('can pause a chunked finite run before the next Worker request', async ({ page }) => {
  const lab = await ready(page)
  const runButton = lab.locator('[data-testid="sa-run"]')
  await runButton.click()
  await expect(runButton).toHaveText('Pause')
  await expect(lab).toHaveAttribute('data-running', 'true')
  await runButton.click()
  await expect(lab).toHaveAttribute('data-running', 'false')
  const pausedIteration = await lab.getAttribute('data-iteration')
  await page.waitForTimeout(250)
  await expect(lab).toHaveAttribute('data-iteration', pausedIteration ?? '0')
})

test('recovers from an invalid seed after validation failure', async ({ page }) => {
  const lab = await ready(page)
  await lab.getByLabel('Seed (hex)', { exact: true }).fill('not-hex')
  await lab.locator('[data-testid="sa-apply"]').click()
  await expect(lab).toHaveAttribute('data-phase', 'error')
  await lab.getByLabel('Seed (hex)', { exact: true }).fill('5eed')
  await lab.locator('[data-testid="sa-apply"]').click()
  await expect(lab).toHaveAttribute('data-phase', 'ready', { timeout: 30_000 })
})

test('keeps the Chinese lab readable without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  await page.goto('zh-Hans/labs/ch06-stochastic-approximation')
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-Hans')
  await expect(page.getByRole('heading', { level: 1, name: '随机逼近实验' })).toBeVisible()
  await expect(page.getByText('有限运行边界')).toBeVisible()
  await expect(page.getByText('更新方程')).toBeVisible()
  await context.close()
})

test('does not introduce page-level horizontal overflow', async ({ page }) => {
  const lab = await ready(page)
  await expect(lab).toBeVisible()
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBe(true)
})
