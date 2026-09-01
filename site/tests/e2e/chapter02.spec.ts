import { expect, test } from '@playwright/test'

test('runs Rust Bellman sweeps from the hand-worked first update to convergence', async ({ page }) => {
  await page.goto('en/labs/bellman-grid')
  const lab = page.locator('.bellman-lab')
  await expect(page.locator('.engine-chip')).toHaveAttribute('data-phase', 'ready')
  expect(
    await page.getByLabel('Residual tolerance ε').evaluate(
      (input) => (input as HTMLInputElement).validity.valid,
    ),
  ).toBe(true)
  await expect(lab).toHaveAttribute('data-sweep-count', '0')
  await expect(lab).toHaveAttribute('data-converged', 'false')

  await page.getByRole('button', { name: 'Run one sweep' }).click()
  await expect(lab).toHaveAttribute('data-sweep-count', '1')
  await expect(page.locator('.bellman-state[data-state="0"]')).toHaveAttribute('data-value', '-0.1')
  await expect(page.locator('.bellman-state[data-state="1"]')).toHaveAttribute('data-value', '0.78')
  expect(
    Number(await page.locator('.bellman-state[data-state="2"]').getAttribute('data-value')),
  ).toBeCloseTo(0.56, 12)
  await expect(page.locator('.bellman-state[data-state="3"]')).toHaveAttribute('data-value', '0')
  await expect(page.locator('.bellman-term-table tbody tr')).toHaveCount(2)

  await page.getByRole('button', { name: 'Matrix form' }).click()
  await expect(page.locator('.bellman-matrix-table')).toContainText('0.6645')
  await expect(page.locator('.bellman-matrix-table')).toContainText('0.8996')

  await page.locator('.bellman-lab .sr-only[aria-live="polite"]').evaluate((node) => {
    const state = window as Window & { __bellmanLiveMutations?: number }
    state.__bellmanLiveMutations = 0
    new MutationObserver(() => {
      state.__bellmanLiveMutations = (state.__bellmanLiveMutations ?? 0) + 1
    }).observe(node, { childList: true, characterData: true, subtree: true })
  })
  await page.locator('.bellman-controls input[type="range"]').fill('80')
  await page.getByRole('button', { name: 'Run to tolerance' }).click()
  await expect(lab).toHaveAttribute('data-converged', 'true', { timeout: 15_000 })
  expect(
    await page.evaluate(
      () => (window as Window & { __bellmanLiveMutations?: number }).__bellmanLiveMutations ?? 0,
    ),
  ).toBeLessThanOrEqual(3)

  await page.getByRole('button', { name: 'Audit' }).click()
  await expect(page.locator('.audit-list li[data-pass="true"]')).toHaveCount(5)
})

test('pauses an animated run and recovers from an invalid Bellman configuration', async ({ page }) => {
  await page.goto('en/labs/bellman-grid')
  const lab = page.locator('.bellman-lab')
  await expect(page.locator('.engine-chip')).toHaveAttribute('data-phase', 'ready')

  await page.getByLabel('Discount factor γ').fill('1')
  const discountInput = page.getByLabel('Discount factor γ')
  await expect(discountInput).toHaveAttribute('aria-invalid', 'true')
  const validationId = await discountInput.getAttribute('aria-describedby')
  expect(validationId).toBe('bellman-validation-en')
  await expect(page.locator(`#${validationId}`)).toContainText(
    'The discount factor must be finite and at least 0 but less than 1.',
  )
  await page.getByRole('button', { name: 'Apply and start from V₀' }).click()
  await expect(page.locator('.engine-chip')).toHaveAttribute('data-phase', 'error')
  await expect(page.locator('.grid-lab__status')).toContainText(
    'The discount factor must be finite and at least 0 but less than 1.',
  )
  await expect(page.locator('.metric-strip')).toContainText('needs input')

  await page.getByLabel('Discount factor γ').fill('0.9')
  await page.getByLabel('Maximum sweeps').fill('1.5')
  await expect(page.getByLabel('Maximum sweeps')).toHaveAttribute('aria-invalid', 'true')
  await page.getByRole('button', { name: 'Apply and start from V₀' }).click()
  await expect(page.locator('.engine-chip')).toHaveAttribute('data-phase', 'error')
  await expect(page.locator('.grid-lab__status')).toContainText(
    'Maximum sweeps must be an integer from 1 through 10,000.',
  )

  await page.getByLabel('Maximum sweeps').fill('200')
  await page.getByRole('button', { name: 'Apply and start from V₀' }).click()
  await expect(page.locator('.engine-chip')).toHaveAttribute('data-phase', 'ready')

  await page.getByLabel('Residual tolerance ε').fill('0.8')
  await page.getByRole('button', { name: 'Apply and start from V₀' }).click()
  await expect(lab).toHaveAttribute('data-converged', 'true')
  await expect(page.locator('.grid-lab__status')).toContainText('Converged after 0 sweeps')
  await expect(page.getByRole('button', { name: 'Run to tolerance' })).toBeDisabled()

  await page.getByLabel('Residual tolerance ε').fill('0.001')
  await page.getByRole('button', { name: 'Apply and start from V₀' }).click()
  await expect(lab).toHaveAttribute('data-converged', 'false')

  await page.locator('.bellman-controls input[type="range"]').fill('1200')
  await page.getByRole('button', { name: 'Run to tolerance' }).click()
  await expect(lab).toHaveAttribute('data-sweep-count', '1')
  await page.getByRole('button', { name: 'Run one sweep' }).dispatchEvent('click')
  await page.getByRole('button', { name: 'Run to tolerance' }).dispatchEvent('click')
  await page.waitForTimeout(100)
  await expect(lab).toHaveAttribute('data-sweep-count', '1')
  await page.getByRole('button', { name: 'Pause' }).click()
  await expect(page.locator('.grid-lab__status')).toContainText('Paused after 1 sweeps')
  await page.waitForTimeout(1_300)
  await expect(lab).toHaveAttribute('data-sweep-count', '1')
})

test('keeps sweep controls keyboard-stable and labels both SVG alternatives', async ({ page }) => {
  await page.goto('en/labs/bellman-grid')
  await expect(page.locator('.engine-chip')).toHaveAttribute('data-phase', 'ready')
  const step = page.getByRole('button', { name: 'Run one sweep' })

  await step.focus()
  await step.press('Enter')
  await expect(page.locator('.bellman-lab')).toHaveAttribute('data-sweep-count', '1')
  await expect(step).toBeFocused()
  await step.press('Enter')
  await expect(page.locator('.bellman-lab')).toHaveAttribute('data-sweep-count', '2')
  await expect(step).toBeFocused()

  await page.getByRole('button', { name: 'Dependencies' }).click()
  await expect(page.locator('.bellman-graph title')).toHaveText(
    'Directed Bellman dependency graph for four states',
  )
  await expect(page.locator('.bellman-graph desc')).toContainText('Seven labeled arrows')

  await page.getByRole('button', { name: 'Convergence' }).click()
  await expect(page.locator('.bellman-residual-chart title')).toHaveText(
    'Bellman residual by sweep',
  )
  await expect(page.locator('.bellman-residual-chart desc')).toContainText(
    'logarithmically scaled line',
  )
})

test('reflows the Bellman workspace without page-level horizontal overflow', async ({ page }) => {
  for (const width of [1024, 800, 400, 320]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('en/labs/bellman-grid')
    await expect(page.locator('.engine-chip')).toHaveAttribute('data-phase', 'ready')
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
      `${width}px viewport should not have page-level horizontal overflow`,
    ).toBe(true)
    expect(
      await page.locator('.bellman-controls').evaluate(
        (element) => element.scrollWidth <= element.clientWidth + 1,
      ),
    ).toBe(true)
    const labBox = await page.locator('.bellman-lab').boundingBox()
    const panelBox = await page.locator('.bellman-view-panel').boundingBox()
    expect(labBox).not.toBeNull()
    expect(panelBox).not.toBeNull()
    expect((panelBox?.x ?? 0) + (panelBox?.width ?? 0)).toBeLessThanOrEqual(
      (labBox?.x ?? 0) + (labBox?.width ?? 0) + 1,
    )
  }
})

test('uses one batched Worker run when reduced motion is requested', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('en/labs/bellman-grid')
  const lab = page.locator('.bellman-lab')
  await expect(page.locator('.engine-chip')).toHaveAttribute('data-phase', 'ready')
  await page.locator('.bellman-controls input[type="range"]').fill('1200')

  await page.getByRole('button', { name: 'Run to tolerance' }).click()
  await expect(lab).toHaveAttribute('data-converged', 'true', { timeout: 3_000 })
  expect(Number(await lab.getAttribute('data-sweep-count'))).toBeGreaterThan(1)
})

test('retries after transient Worker-script and Wasm initialization failures', async ({ page }) => {
  let workerAttempts = 0
  let wasmAttempts = 0
  await page.route('**/bellman.worker-*.js', async (route) => {
    workerAttempts += 1
    if (workerAttempts === 1) await route.abort()
    else await route.continue()
  })
  await page.route('**/mathrl_wasm_bg-*.wasm', async (route) => {
    wasmAttempts += 1
    if (wasmAttempts === 1) await route.abort()
    else await route.continue()
  })

  await page.goto('en/labs/bellman-grid')
  await expect(page.locator('.engine-chip')).toHaveAttribute('data-phase', 'error')

  await page.getByRole('button', { name: 'Apply and start from V₀' }).click()
  await expect(page.locator('.engine-chip')).toHaveAttribute('data-phase', 'error')

  await page.getByRole('button', { name: 'Apply and start from V₀' }).click()
  await expect(page.locator('.engine-chip')).toHaveAttribute('data-phase', 'ready')
  await expect(page.locator('.bellman-lab')).toHaveAttribute('data-sweep-count', '0')
  expect(workerAttempts).toBeGreaterThanOrEqual(2)
  expect(wasmAttempts).toBeGreaterThanOrEqual(2)
})

test('recovers when the browser rejects Worker construction synchronously', async ({ page }) => {
  await page.addInitScript(() => {
    const NativeWorker = window.Worker
    let attempts = 0
    window.Worker = new Proxy(NativeWorker, {
      construct(target, argumentsList, newTarget) {
        attempts += 1
        if (attempts === 1) throw new DOMException('Worker blocked for test', 'SecurityError')
        return Reflect.construct(target, argumentsList, newTarget)
      },
    })
  })

  await page.goto('en/labs/bellman-grid')
  await expect(page.locator('.engine-chip')).toHaveAttribute('data-phase', 'error')
  await expect(page.locator('.grid-lab__status')).toContainText('could not start')

  await page.getByRole('button', { name: 'Apply and start from V₀' }).click()
  await expect(page.locator('.engine-chip')).toHaveAttribute('data-phase', 'ready')
  await expect(page.locator('.bellman-lab')).toHaveAttribute('data-sweep-count', '0')
})

test('restores the deterministic value vector after switching to Chinese', async ({ page }) => {
  await page.goto('en/labs/bellman-grid')
  await expect(page.locator('.engine-chip')).toHaveAttribute('data-phase', 'ready')
  await page.getByRole('button', { name: 'Run one sweep' }).click()
  await expect(page.locator('.bellman-lab')).toHaveAttribute('data-sweep-count', '1')

  await page.getByRole('button', { name: 'Change language' }).click()
  await page.getByRole('link', { name: '简体中文' }).click()
  await expect(page).toHaveURL(/\/zh-Hans\/labs\/bellman-grid$/)
  await expect(page.locator('.engine-chip')).toHaveAttribute('data-phase', 'ready')
  await expect(page.locator('.bellman-lab')).toHaveAttribute('data-sweep-count', '1')
  await expect(page.locator('.bellman-state[data-state="0"]')).toHaveAttribute('data-value', '-0.1')
  await expect(page.getByRole('button', { name: '执行一轮' })).toBeVisible()
})

test('keeps paired Chapter 2 Bellman content readable without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  await page.goto('zh-Hans/learn/ch02/bellman-equation')

  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-Hans')
  await expect(page.locator('meta[name="mathrl:source"]')).toHaveAttribute(
    'content',
    /Chapter%202%20State%20Values%20and%20Bellman%20Equation\.pdf$/,
  )
  const alternateHref = await page
    .locator('link[rel="alternate"][hreflang="en"]')
    .getAttribute('href')
  const currentUrl = new URL(page.url())
  expect(new URL(alternateHref ?? '', currentUrl).pathname).toBe(
    currentUrl.pathname.replace('/zh-Hans/', '/en/'),
  )
  await expect(page.getByRole('link', { name: 'Bellman 策略评估实验' })).toBeVisible()

  await context.close()
})
