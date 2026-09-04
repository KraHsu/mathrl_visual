import { expect, test } from '@playwright/test'

test('evaluates the shared 4×4 Grid World across all 16 states', async ({ page }) => {
  await page.goto('en/labs/ch02-policy-evaluation')
  const lab = page.locator('.grid-policy-evaluation-lab')
  await expect(page.locator('.engine-chip')).toHaveAttribute('data-phase', 'ready')
  await expect(lab).toHaveAttribute('data-state-count', '16')
  await expect(lab).toHaveAttribute('data-sweep-count', '0')

  await page.getByRole('button', { name: 'Run one sweep' }).click()
  await expect(lab).toHaveAttribute('data-sweep-count', '1')
  await expect
    .poll(async () => Number(await page.locator('.grid-policy-state[data-state="0"]').getAttribute('data-value')))
    .toBeCloseTo(-0.424, 12)
  await expect(page.locator('.grid-policy-state[data-state="15"]')).toHaveAttribute('data-value', '0')
  await expect(page.locator('.grid-policy-state')).toHaveCount(16)

  await page.getByRole('button', { name: 'Matrix form' }).click()
  await expect(page.locator('.grid-policy-matrix-table tbody tr')).toHaveCount(16)
  await expect(page.locator('.grid-policy-matrix-table')).toContainText('-3.3452')

  await page.getByRole('button', { name: 'Audit' }).click()
  await expect(page.locator('.audit-list li[data-pass="true"]')).toHaveCount(7)
})

test('switches the fixed policy and exposes wind-induced dependencies', async ({ page }) => {
  await page.goto('en/labs/ch02-policy-evaluation')
  await expect(page.locator('.engine-chip')).toHaveAttribute('data-phase', 'ready')
  await page.getByLabel('Fixed policy').selectOption('goal_seeking')
  await page.getByLabel('Wind probability').fill('0.2')
  await page.getByRole('button', { name: 'Apply and start from V₀' }).click()
  await expect(page.locator('.engine-chip')).toHaveAttribute('data-phase', 'ready')
  await expect(page.locator('.grid-policy-evaluation-lab')).toHaveAttribute('data-sweep-count', '0')

  await page.getByRole('button', { name: 'Dependencies' }).click()
  await expect(page.locator('.grid-policy-dependency-graph title')).toHaveText(
    'Selected-state dependency graph on the 4×4 Grid World',
  )
  await expect(page.locator('.grid-policy-dependency-graph desc')).toContainText('matrix row')
  await expect(page.locator('.grid-policy-view-panel table tbody tr').first()).toBeVisible()
})

test('reports honest truncation and supports reduced-motion convergence', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('en/labs/ch02-policy-evaluation')
  const lab = page.locator('.grid-policy-evaluation-lab')
  await expect(page.locator('.engine-chip')).toHaveAttribute('data-phase', 'ready')
  await page.getByLabel('Residual tolerance ε').fill('0.000000000000001')
  await page.getByLabel('Maximum sweeps').fill('1')
  await page.getByRole('button', { name: 'Apply and start from V₀' }).click()
  await page.getByRole('button', { name: 'Run to tolerance' }).click()
  await expect(lab).toHaveAttribute('data-truncated', 'true')
  await expect(lab).toHaveAttribute('data-converged', 'false')

  await page.getByLabel('Residual tolerance ε').fill('0.001')
  await page.getByLabel('Maximum sweeps').fill('1000')
  await page.getByRole('button', { name: 'Apply and start from V₀' }).click()
  await page.getByRole('button', { name: 'Run to tolerance' }).click()
  await expect(lab).toHaveAttribute('data-converged', 'true', { timeout: 5_000 })
})

test('keeps the shared-grid lab within narrow viewports', async ({ page }) => {
  for (const width of [1024, 800, 400, 320]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('en/labs/ch02-policy-evaluation')
    await expect(page.locator('.engine-chip')).toHaveAttribute('data-phase', 'ready')
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
      `${width}px viewport should not have page-level horizontal overflow`,
    ).toBe(true)
  }
})

test('keeps the shared-grid page readable without JavaScript in both locales', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  for (const locale of ['en', 'zh-Hans']) {
    const page = await context.newPage()
    await page.goto(`${locale}/labs/ch02-policy-evaluation`)
    // Chromium exposes a <noscript> fallback as serialized innerHTML through
    // Playwright's DOM view; textContent can be empty for this parser mode.
    await expect
      .poll(async () => page.locator('noscript').evaluate((element) => element.innerHTML))
      .toContain(locale === 'en' ? 'complete 16-state model' : '完整的 16 状态模型')
    await expect(page.locator('meta[name="mathrl:source"]')).toHaveAttribute('content', /Chapter%202%20State%20Values%20and%20Bellman%20Equation\.pdf$/)
    await page.close()
  }
  await context.close()
})
