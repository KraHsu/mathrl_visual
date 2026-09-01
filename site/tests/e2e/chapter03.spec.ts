import { expect, test } from '@playwright/test'

const route = 'en/labs/bellman-optimality-grid'

async function waitForEngine(page: import('@playwright/test').Page) {
  const lab = page.locator('.optimality-lab')
  await expect(lab.locator('.engine-chip')).toHaveAttribute('data-phase', 'ready')
  return lab
}

test('matches the default first image, tie masks, contraction witness, and fixed point', async ({ page }) => {
  await page.goto(route)
  const lab = await waitForEngine(page)
  await expect(lab).toHaveAttribute('data-selected-state', '5')
  await expect(lab.locator('.optimality-state')).toHaveCount(16)
  await expect(lab.locator('[data-numeric-state]')).toHaveCount(16)
  await expect(lab).toHaveAttribute('data-sweep-count', '0')

  await page.getByRole('button', { name: 'Apply T* once' }).click()
  await expect(lab).toHaveAttribute('data-sweep-count', '1')
  await expect(lab.locator('.optimality-state[data-state="0"]')).toHaveAttribute('data-value', '-0.04')
  await expect(lab.locator('.optimality-state[data-state="11"]')).toHaveAttribute('data-value', '1')
  await expect(lab.locator('.optimality-state[data-state="14"]')).toHaveAttribute('data-value', '1')
  await expect(lab.locator('.optimality-state[data-state="15"]')).toHaveAttribute('data-value', '0')

  await page.getByRole('button', { name: 'Contraction' }).click()
  await expect(lab.locator('.optimality-witness')).toHaveAttribute('data-pass', 'true')
  expect(Number(await lab.locator('[data-witness-residual]').getAttribute('data-witness-residual')))
    .toBeCloseTo(0.9, 12)
  expect(Number(await lab.locator('[data-witness-bound]').getAttribute('data-witness-bound')))
    .toBeCloseTo(0.9, 12)

  await page.getByRole('button', { name: 'Apply T* once' }).click()
  await expect(lab).toHaveAttribute('data-sweep-count', '2')
  await lab.locator('.optimality-state[data-state="10"]').click()
  await page.getByRole('button', { name: 'Action backups' }).click()
  await expect(lab.locator('.optimality-action-table tr[data-action="1"]')).toHaveAttribute('data-greedy', 'true')
  await expect(lab.locator('.optimality-action-table tr[data-action="2"]')).toHaveAttribute('data-greedy', 'true')
  expect(Number(await lab.locator('[data-action="1"] [data-q-value]').getAttribute('data-q-value')))
    .toBeCloseTo(0.86, 12)
  expect(Number(await lab.locator('[data-action="2"] [data-q-value]').getAttribute('data-q-value')))
    .toBeCloseTo(0.86, 12)

  await lab.locator('.sr-only[aria-live="polite"]').evaluate((node) => {
    const state = window as Window & { __optimalityLiveMutations?: number }
    state.__optimalityLiveMutations = 0
    new MutationObserver(() => {
      state.__optimalityLiveMutations = (state.__optimalityLiveMutations ?? 0) + 1
    }).observe(node, { childList: true, characterData: true, subtree: true })
  })
  await lab.locator('.optimality-controls input[type="range"]').fill('80')
  await page.getByRole('button', { name: 'Run to tolerance' }).click()
  await expect(lab).toHaveAttribute('data-converged', 'true', { timeout: 8_000 })
  await expect(lab).toHaveAttribute('data-sweep-count', '6')
  expect(Number(await lab.locator('.optimality-state[data-state="0"]').getAttribute('data-value')))
    .toBeCloseTo(0.426686, 6)

  const expectedMasks = [6, 2, 2, 4, 4, 9, 6, 4, 4, 6, 6, 4, 2, 2, 2, 0]
  for (const [state, mask] of expectedMasks.entries()) {
    await expect(lab.locator(`.optimality-state[data-state="${state}"]`)).toHaveAttribute(
      'data-greedy-mask',
      String(mask),
    )
  }
  expect(
    await page.evaluate(
      () => (window as Window & { __optimalityLiveMutations?: number }).__optimalityLiveMutations ?? 0,
    ),
  ).toBeLessThanOrEqual(3)

  await page.getByRole('button', { name: 'Audit' }).click()
  await expect(lab.locator('.optimality-audit-list li[data-pass="true"]')).toHaveCount(8)
})

test('sums stochastic outcomes within a request before maximizing and loads isolated presets', async ({ page }) => {
  await page.goto(route)
  const lab = await waitForEngine(page)
  const preset = page.getByLabel('Preset')
  const labels = await preset.locator('option').allTextContents()
  expect(labels).toHaveLength(4)
  expect(labels.every((label) => label.trim().length > 0)).toBe(true)

  await preset.selectOption('wind20')
  await page.getByRole('button', { name: 'Load preset' }).click()
  await expect(lab).toHaveAttribute('data-wind', '0.2')
  await expect(lab).toHaveAttribute('data-discount', '0.9')
  await lab.locator('.optimality-state[data-state="0"]').click()
  await page.getByRole('button', { name: 'Inspect outcomes for right' }).click()

  const outcomeRows = lab.locator('.optimality-ledger-table tbody tr')
  await expect(outcomeRows).toHaveCount(4)
  const probabilities = (await outcomeRows.locator('[data-probability]').evaluateAll((cells) =>
    cells.map((cell) => Number(cell.getAttribute('data-probability'))).sort((a, b) => a - b),
  ))
  expect(probabilities[0]).toBeCloseTo(0.05, 12)
  expect(probabilities[1]).toBeCloseTo(0.05, 12)
  expect(probabilities[2]).toBeCloseTo(0.05, 12)
  expect(probabilities[3]).toBeCloseTo(0.85, 12)

  const contributions = await outcomeRows.locator('[data-contribution]').evaluateAll((cells) =>
    cells.map((cell) => Number(cell.getAttribute('data-contribution'))),
  )
  const withinRequest = Number(
    await lab.locator('[data-ledger-total]').getAttribute('data-ledger-total'),
  )
  const requestedRight = Number(
    await lab.locator('[data-action="1"] [data-q-value]').getAttribute('data-q-value'),
  )
  expect(contributions.reduce((sum, value) => sum + value, 0)).toBeCloseTo(withinRequest, 12)
  expect(withinRequest).toBeCloseTo(requestedRight, 12)

  const qValues = await lab.locator('[data-q-value]').evaluateAll((cells) =>
    cells.map((cell) => Number(cell.getAttribute('data-q-value'))),
  )
  const operatorTotal = Number(
    await lab.locator('[data-operator-total]').getAttribute('data-operator-total'),
  )
  expect(operatorTotal).toBeCloseTo(Math.max(...qValues), 12)
  expect(operatorTotal).not.toBeCloseTo(Math.max(...contributions), 8)

  await preset.selectOption('short')
  await page.getByRole('button', { name: 'Load preset' }).click()
  await expect(lab).toHaveAttribute('data-discount', '0.3')
  await expect(lab).toHaveAttribute('data-wind', '0')

  await preset.selectOption('long')
  await page.getByRole('button', { name: 'Load preset' }).click()
  await expect(lab).toHaveAttribute('data-discount', '0.95')
  await expect(lab).toHaveAttribute('data-wind', '0')
})

test('validates configuration, retries Apply in the error state, and pauses an animated run', async ({ page }) => {
  await page.goto(route)
  const lab = await waitForEngine(page)
  const discount = page.getByLabel('Discount factor γ')

  await discount.fill('1')
  await expect(discount).toHaveAttribute('aria-invalid', 'true')
  expect(await discount.getAttribute('aria-describedby')).toBe('optimality-validation-en')
  await expect(page.locator('#optimality-validation-en')).toContainText(
    'The discount factor must be finite and between 0 and 0.99.',
  )
  await page.getByRole('button', { name: 'Apply and start from V₀' }).click()
  await expect(lab.locator('.engine-chip')).toHaveAttribute('data-phase', 'error')
  await expect(page.getByRole('button', { name: 'Apply and start from V₀' })).toBeEnabled()

  await discount.fill('0.9')
  await page.getByLabel('Maximum sweeps').fill('1.5')
  await expect(page.getByLabel('Maximum sweeps')).toHaveAttribute('aria-invalid', 'true')
  await page.getByRole('button', { name: 'Apply and start from V₀' }).click()
  await expect(lab.locator('.grid-lab__status')).toContainText(
    'Maximum sweeps must be an integer from 1 through 10,000.',
  )

  await page.getByLabel('Maximum sweeps').fill('1000')
  await page.getByRole('button', { name: 'Apply and start from V₀' }).click()
  await waitForEngine(page)
  await lab.locator('.optimality-controls input[type="range"]').fill('1200')
  await page.getByRole('button', { name: 'Run to tolerance' }).click()
  await expect(lab).toHaveAttribute('data-sweep-count', '1')
  await page.getByRole('button', { name: 'Pause' }).click()
  await expect(lab.locator('.grid-lab__status')).toContainText('Paused after 1 sweeps')
  await page.waitForTimeout(1_300)
  await expect(lab).toHaveAttribute('data-sweep-count', '1')
})

test('keeps keyboard focus, SVG text alternatives, and a full numeric fallback', async ({ page }) => {
  await page.goto(route)
  const lab = await waitForEngine(page)
  const step = page.getByRole('button', { name: 'Apply T* once' })

  await step.focus()
  await step.press('Enter')
  await expect(lab).toHaveAttribute('data-sweep-count', '1')
  await expect(step).toBeFocused()
  await step.press('Enter')
  await expect(lab).toHaveAttribute('data-sweep-count', '2')
  await expect(step).toBeFocused()

  await page.getByRole('button', { name: 'Propagation' }).click()
  await expect(lab.locator('.optimality-residual-chart title')).toHaveText(
    'Bellman optimality residual by synchronous sweep',
  )
  await expect(lab.locator('.optimality-residual-chart desc')).toContainText(
    'logarithmically scaled line',
  )
  await expect(lab.locator('.optimality-history-table tbody tr')).toHaveCount(3)
  await expect(lab.locator('[data-numeric-state]')).toHaveCount(16)
})

test('chunks reduced-motion work, pauses at a boundary, and preserves every residual', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(route)
  const lab = await waitForEngine(page)
  await page.getByLabel('Preset').selectOption('wind20')
  await page.getByRole('button', { name: 'Load preset' }).click()
  await expect(lab).toHaveAttribute('data-wind', '0.2')

  const run = page.getByRole('button', { name: 'Run to tolerance' })
  const pause = page.getByRole('button', { name: 'Pause' })
  await expect(pause).toBeDisabled()
  await run.evaluate(async (runButton) => {
    const typedRunButton = runButton as HTMLButtonElement
    const controls = typedRunButton.closest('.optimality-controls')
    const buttons = controls
      ? Array.from(controls.querySelectorAll<HTMLButtonElement>('button'))
      : []
    const pauseButton = buttons
      .find((button) => button.textContent?.trim() === 'Pause')
    typedRunButton.click()
    await Promise.resolve()
    if (!pauseButton || pauseButton.disabled) {
      throw new Error('Pause must become available synchronously when a run starts')
    }
    pauseButton.click()
  })
  await expect(lab.locator('.grid-lab__status')).toContainText('Paused after')

  const pausedAt = Number(await lab.getAttribute('data-sweep-count'))
  expect(pausedAt).toBeGreaterThan(10)
  await page.waitForTimeout(150)
  await expect(lab).toHaveAttribute('data-sweep-count', String(pausedAt))

  await page.getByRole('button', { name: 'Propagation' }).click()
  await expect(lab.locator('.optimality-history-table tbody tr')).toHaveCount(pausedAt + 1)
})

test('retries transient Worker script and Wasm initialization failures', async ({ page }) => {
  let workerAttempts = 0
  let wasmAttempts = 0
  await page.route('**/optimality.worker-*.js', async (requestRoute) => {
    workerAttempts += 1
    if (workerAttempts === 1) await requestRoute.abort()
    else await requestRoute.continue()
  })
  await page.route('**/mathrl_wasm_bg-*.wasm', async (requestRoute) => {
    wasmAttempts += 1
    if (wasmAttempts === 1) await requestRoute.abort()
    else await requestRoute.continue()
  })

  await page.goto(route)
  const lab = page.locator('.optimality-lab')
  await expect(lab.locator('.engine-chip')).toHaveAttribute('data-phase', 'error')
  await page.getByRole('button', { name: 'Apply and start from V₀' }).click()
  await expect(lab.locator('.engine-chip')).toHaveAttribute('data-phase', 'error')
  await page.getByRole('button', { name: 'Apply and start from V₀' }).click()
  await expect(lab.locator('.engine-chip')).toHaveAttribute('data-phase', 'ready')
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

  await page.goto(route)
  const lab = page.locator('.optimality-lab')
  await expect(lab.locator('.engine-chip')).toHaveAttribute('data-phase', 'error')
  await expect(lab.locator('.grid-lab__status')).toContainText('could not start')
  await page.getByRole('button', { name: 'Apply and start from V₀' }).click()
  await expect(lab.locator('.engine-chip')).toHaveAttribute('data-phase', 'ready')
})

test('reflows at 320–1024px without page-level horizontal overflow', async ({ page }) => {
  for (const width of [1024, 800, 400, 320]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto(route)
    const lab = await waitForEngine(page)
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
      `${width}px viewport should not have page-level horizontal overflow`,
    ).toBe(true)
    expect(
      await page.locator('.VPNavBarTitle a.title').evaluate(
        (element) => element.scrollWidth <= element.clientWidth + 1,
      ),
      `${width}px viewport should keep the site title inside its navigation slot`,
    ).toBe(true)
    const previewBanner = page.locator('.preview-banner')
    if (await previewBanner.count()) {
      await expect(previewBanner).toBeVisible()
      const bannerBox = await previewBanner.boundingBox()
      const navBox = await page.locator('.VPNav').boundingBox()
      expect(bannerBox).not.toBeNull()
      expect(navBox).not.toBeNull()
      expect(navBox?.y ?? 0).toBeGreaterThanOrEqual(
        (bannerBox?.y ?? 0) + (bannerBox?.height ?? 0) - 1,
      )
    }
    expect(
      await lab.locator('.optimality-controls').evaluate(
        (element) => element.scrollWidth <= element.clientWidth + 1,
      ),
    ).toBe(true)
    expect(
      await lab.locator('.optimality-grid').evaluate(
        (element) => element.scrollWidth <= element.clientWidth + 1,
      ),
    ).toBe(true)
    const labBox = await lab.boundingBox()
    const panelBox = await lab.locator('.optimality-view-panel').boundingBox()
    expect(labBox).not.toBeNull()
    expect(panelBox).not.toBeNull()
    expect((panelBox?.x ?? 0) + (panelBox?.width ?? 0)).toBeLessThanOrEqual(
      (labBox?.x ?? 0) + (labBox?.width ?? 0) + 1,
    )
  }
})

test('restores the applied vector and selection after switching to Chinese', async ({ page }) => {
  await page.goto(route)
  const lab = await waitForEngine(page)
  await page.getByLabel('Preset').selectOption('short')
  await page.getByRole('button', { name: 'Load preset' }).click()
  await expect(lab).toHaveAttribute('data-discount', '0.3')
  await page.getByRole('button', { name: 'Apply T* once' }).click()
  await expect(lab).toHaveAttribute('data-sweep-count', '1')
  await lab.locator('.optimality-state[data-state="10"]').click()
  await page.getByRole('button', { name: 'Inspect outcomes for down' }).click()

  await page.getByRole('button', { name: 'Change language' }).click()
  await page.getByRole('link', { name: '简体中文' }).click()
  await expect(page).toHaveURL(/\/zh-Hans\/labs\/bellman-optimality-grid$/)
  const chineseLab = page.locator('.optimality-lab')
  await expect(chineseLab.locator('.engine-chip')).toHaveAttribute('data-phase', 'ready')
  await expect(chineseLab).toHaveAttribute('data-sweep-count', '1')
  await expect(chineseLab).toHaveAttribute('data-selected-state', '10')
  await expect(chineseLab).toHaveAttribute('data-selected-action', '2')
  await expect(chineseLab).toHaveAttribute('data-discount', '0.3')
  await expect(page.getByRole('button', { name: '运行到容差' })).toBeVisible()
})

test('keeps the paired Chapter 3 source metadata and golden model readable without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL })
  const page = await context.newPage()
  await page.goto('zh-Hans/labs/bellman-optimality-grid')

  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-Hans')
  await expect(page.locator('meta[name="mathrl:source"]')).toHaveAttribute(
    'content',
    /Chapter%203%20Optimal%20State%20Values%20and%20Bellman%20Optimality%20Equation\.pdf$/,
  )
  const alternateHref = await page.locator('link[rel="alternate"][hreflang="en"]').getAttribute('href')
  const currentUrl = new URL(page.url())
  expect(new URL(alternateHref ?? '', currentUrl).pathname).toBe(
    currentUrl.pathname.replace('/zh-Hans/', '/en/'),
  )
  await expect(page.getByRole('heading', { name: '从零向量开始的第一轮 golden' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '默认模型的最终 golden' })).toBeVisible()
  await context.close()
})
