import { expect, test, type Page } from '@playwright/test'

async function openLanguageMenu(page: Page): Promise<void> {
  // VitePress keeps the desktop nav's translation control in the DOM while
  // its hide-on-scroll transition is settling. Use the keyboard path rather
  // than a forced mouse click: VPFlyout's pointer-leave handler can otherwise
  // close the menu immediately in WebKit when the click is dispatched while
  // the nav is transitioning.
  await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }))
  const switcher = page.locator('.VPNavBarTranslations > button[aria-label="Change language"]')
  await expect(switcher).toBeVisible()
  await switcher.focus()
  await switcher.press('Enter')
  await expect(switcher).toHaveAttribute('aria-expanded', 'true')
}

async function followRightEdgePath(page: Page): Promise<void> {
  for (let step = 0; step < 3; step += 1) {
    await page.getByRole('button', { name: 'Move right' }).click()
  }
  for (let step = 0; step < 3; step += 1) {
    await page.getByRole('button', { name: 'Move down' }).click()
  }
}

async function openPolicyView(page: Page): Promise<void> {
  await page.goto('en/labs/ch01-gridworld')
  await expect(page.locator('.engine-chip')).toHaveAttribute('data-phase', 'ready')
  await page.getByRole('button', { name: 'World' }).click()
  await page.locator('input[type="range"]').fill('0')
  await page.getByRole('button', { name: 'Apply and reset' }).click()
  await expect(page.locator('.engine-chip')).toHaveAttribute('data-phase', 'ready')
  await page.getByRole('button', { name: 'Policy' }).click()
}

async function samplePolicy(page: Page, count: number, buttonName: string): Promise<void> {
  const rows = page.locator('.trajectory-panel tbody tr')
  const initial = await rows.count()
  for (let index = 1; index <= count; index += 1) {
    await page.getByRole('button', { name: buttonName }).click()
    await expect(rows).toHaveCount(initial + index)
  }
}

test('runs the Rust/Wasm transition and restores it in the other locale', async ({ page }) => {
  await page.goto('en/labs/ch01-gridworld')
  await expect(page.locator('.engine-chip')).toHaveAttribute('data-phase', 'ready')

  await page.locator('input[type="range"]').fill('0')
  await page.getByRole('button', { name: 'Apply and reset' }).click()
  await expect(page.locator('.engine-chip')).toHaveAttribute('data-phase', 'ready')
  await page.getByRole('button', { name: 'Move right' }).click()

  await expect(page.locator('.grid-cell--active .grid-cell__state')).toHaveText('s1')
  await expect(page.locator('.trajectory-panel tbody tr')).toHaveCount(1)
  await expect(page.locator('.trajectory-panel tbody tr')).toContainText('s0 → s1')

  await openLanguageMenu(page)
  await page.getByRole('link', { name: '简体中文' }).click()
  await expect(page).toHaveURL(/\/zh-Hans\/labs\/ch01-gridworld$/)
  await expect(page.locator('.engine-chip')).toHaveAttribute('data-phase', 'ready')
  await expect(page.locator('.grid-cell--active .grid-cell__state')).toHaveText('s1')
  await expect(page.locator('.trajectory-panel tbody tr')).toHaveCount(1)
  await expect(page.getByRole('button', { name: '搜索站点' })).toBeVisible()
  await page.getByRole('button', { name: '转移', exact: true }).click()
  await expect(page.locator('[data-guided-wind="banner"]')).toContainText('风扰动引导')
  await expect(page.locator('[data-guided-wind="banner"]')).toContainText('两个视图都会提供这个按钮')
  await expect(page.locator('[data-guided-wind="hint"]')).toContainText('先选择一个移动动作并观察上方无风的基准概率行')
  await expect(page.locator('[data-guided-wind="button"]')).toHaveText('开启 20% 风扰动并重置')
})

test('recovers from an invalid restart without reloading the worker', async ({ page }) => {
  await page.goto('en/labs/ch01-gridworld')
  await expect(page.locator('.engine-chip')).toHaveAttribute('data-phase', 'ready')

  await page.getByLabel('Seed (hex)').fill('not-hex')
  await page.getByRole('button', { name: 'Apply and reset' }).click()
  await expect(page.locator('.engine-chip')).toHaveAttribute('data-phase', 'error')
  await expect(page.locator('.grid-lab__status')).toContainText(
    'Enter a hexadecimal seed, for example 5eed.',
  )

  await page.getByLabel('Seed (hex)').fill('5eed')
  await page.locator('input[type="range"]').fill('0')
  await page.getByRole('button', { name: 'Apply and reset' }).click()
  await expect(page.locator('.engine-chip')).toHaveAttribute('data-phase', 'ready')

  await page.getByRole('button', { name: 'Move right' }).click()
  await expect(page.locator('.grid-cell--active .grid-cell__state')).toHaveText('s1')
  await expect(page.locator('.trajectory-panel tbody tr')).toHaveCount(1)
})

test('retries a transient Wasm initialization failure in the real Worker', async ({ page }) => {
  let workerBundles = 0
  let faultInjected = false
  // Playwright's page-level routing does not consistently observe requests
  // initiated by module Workers in WebKit. Route at the browser context and
  // prepend a tiny, worker-local fault injector to the real bundle instead.
  await page.context().route('**/gridworld.worker-*.js', async (requestRoute) => {
    workerBundles += 1
    const response = await requestRoute.fetch()
    // Preview serves hashed assets with Brotli and entity validators. Strip
    // entity headers for every fulfilled response so a rewritten or
    // pass-through Worker body is never paired with stale encoding metadata.
    const headers = Object.fromEntries(
      Object.entries(response.headers()).filter(
        ([name]) =>
          !['content-encoding', 'content-length', 'transfer-encoding', 'etag'].includes(name),
      ),
    )
    // A page may request the same module bundle more than once (for example
    // after a failed initialization). Inject the transient fault only into
    // the first response so the retry can exercise the untouched real bundle.
    if (faultInjected) {
      await requestRoute.fulfill({
        response,
        headers: { ...headers, 'cache-control': 'no-store' },
      })
      return
    }
    const source = await response.text()
    if (!source.includes('fetch(e)')) {
      throw new Error('generated Worker bundle no longer exposes the wasm fetch marker')
    }
    const patchedSource = source.replace('fetch(e)', 'globalThis.__mathrlFetch(e)')
    const fault = `
      (() => {
        // Rewrite the generated glue's bare fetch call to an explicit hook.
        // Injecting a rejected response exercises the real init() rejection
        // path without mutating host WebAssembly methods (which differ in
        // writability across browser engines).
        const originalFetch = fetch
        let failNextWasm = true
        globalThis.__mathrlFetch = (input, init) => {
          const url = typeof input === 'string'
            ? input
            : input && typeof input === 'object' && 'url' in input
              ? input.url
              : String(input)
          if (failNextWasm && url.includes('mathrl_wasm_bg-')) {
            failNextWasm = false
            return Promise.resolve(new Response('', {
              status: 503,
              statusText: 'Transient test failure',
              headers: {
                'cache-control': 'no-store',
                'content-type': 'application/wasm',
              },
            }))
          }
          return Reflect.apply(originalFetch, globalThis, [input, init])
        }
      })();
    `
    faultInjected = true
    await requestRoute.fulfill({
      response,
      headers: { ...headers, 'cache-control': 'no-store' },
      body: `${fault}\n${patchedSource}`,
    })
  })

  await page.goto('en/labs/ch01-gridworld')
  await expect(page.locator('.engine-chip')).toHaveAttribute('data-phase', 'error')
  expect(workerBundles).toBeGreaterThanOrEqual(1)

  // The worker clears its failed initialization promise. A visible retry must
  // reuse the worker and complete after the injected one-shot failure.
  await page.getByRole('button', { name: 'Apply and reset' }).click()
  await expect(page.locator('.engine-chip')).toHaveAttribute('data-phase', 'ready')
})

test('keeps the bilingual chapter readable without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()

  await page.goto('zh-Hans/learn/ch01/state-action')
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-Hans')
  await expect(page.getByRole('heading', { level: 1, name: '状态与动作' })).toBeVisible()
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', /\/favicon\.svg$/)
  if (process.env.VITE_SITE_STAGE === 'preview') {
    await expect(page.locator('.preview-banner')).toContainText('Preview · 预览')
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,nofollow')
  }
  const alternateHref = await page
    .locator('link[rel="alternate"][hreflang="en"]')
    .getAttribute('href')
  const currentUrl = new URL(page.url())
  expect(new URL(alternateHref ?? '', currentUrl).pathname).toBe(
    currentUrl.pathname.replace('/zh-Hans/', '/en/'),
  )

  await page.goto('zh-Hans/labs/ch01-gridworld')
  await expect(page.getByRole('heading', { level: 1, name: 'Grid World 概念实验' })).toBeVisible()
  await expect(page.getByText('风扰动引导')).toBeVisible()
  await expect(page.getByText('两个视图都会提供这个按钮')).toBeVisible()

  await context.close()
})

test('exposes the Chapter 1 transition, policy, reward, return, and audit views', async ({ page }) => {
  await page.goto('en/labs/ch01-gridworld')
  await expect(page.locator('.engine-chip')).toHaveAttribute('data-phase', 'ready')
  await expect(page.locator('input[type="range"]')).toHaveValue('0')

  await page.getByRole('button', { name: 'Transition' }).click()
  await expect(page.locator('[data-guided-wind="banner"]')).toContainText('Wind perturbation guide')
  await expect(page.locator('[data-guided-wind="banner"]')).toContainText('Both the Transition and Markov views provide')
  await expect(page.locator('.mini-table tbody tr')).toHaveCount(1)
  await expect(page.locator('.mini-table tbody tr td').nth(1)).toHaveText('1')
  await expect(page.locator('[data-guided-wind="hint"]')).toContainText('First choose a movement action and inspect its no-wind baseline row above')
  // Staying is intentionally unaffected by wind; the guided CTA should select
  // a movement action so the comparison reveals the stochastic row.
  await page.getByLabel('Requested action').selectOption('4')
  await expect(page.locator('.mini-table tbody tr')).toHaveCount(1)
  await page.locator('[data-guided-wind="button"]').click()
  await expect(page.locator('.engine-chip')).toHaveAttribute('data-phase', 'ready')
  await expect(page.getByLabel('Requested action')).toHaveValue('1')
  await expect(page.locator('.mini-table tbody tr')).toHaveCount(4)
  await expect(page.locator('.mini-table tbody')).toContainText('0.85')

  // The documented seed makes the wind lesson concrete: the requested
  // right-right-down-down sequence contains a reproducible final slip left.
  for (const action of ['Move right', 'Move right', 'Move down', 'Move down']) {
    await page.getByRole('button', { name: action }).click()
  }
  await expect(page.locator('.trajectory-panel tbody tr')).toHaveCount(4)
  await expect(page.locator('.trajectory-panel tbody tr').last()).toHaveAttribute(
    'data-actual-action',
    '3',
  )

  await page.getByRole('button', { name: 'World' }).click()
  await expect(page.locator('input[type="range"]')).toHaveValue('0.2')
  await page.locator('input[type="range"]').fill('0')
  await page.getByRole('button', { name: 'Apply and reset' }).click()
  await expect(page.locator('.engine-chip')).toHaveAttribute('data-phase', 'ready')

  await page.getByRole('button', { name: 'Policy' }).click()
  await page.getByLabel('P(up)').fill('0')
  await page.getByLabel('P(right)').fill('1')
  await page.getByLabel('P(down)').fill('0')
  await page.getByLabel('P(left)').fill('0')
  await page.getByLabel('P(stay)').fill('0')
  await page.getByRole('button', { name: 'Sample policy and step' }).click()
  await expect(page.locator('.grid-cell--active .grid-cell__state')).toHaveText('s1')

  await page.getByRole('button', { name: 'Reward' }).click()
  await page.getByLabel('Ordinary move').fill('-0.2')
  await page.getByRole('button', { name: 'Apply and reset' }).click()
  await expect(page.locator('.engine-chip')).toHaveAttribute('data-phase', 'ready')
  await page.getByRole('button', { name: 'Move right' }).click()
  await expect(page.locator('.metric-strip')).toContainText('-0.2')

  await page.getByRole('button', { name: 'Return' }).click()
  await expect(page.locator('.trajectory-panel tbody tr')).toContainText('-0.2')
  await expect(page.locator('.trajectory-panel tbody tr td').nth(5)).toHaveText('1')

  await page.getByRole('button', { name: 'Markov' }).click()
  await expect(page.locator('[data-guided-wind="hint"]')).toContainText('First note that the calm and gusty predictions match while wind is off')
  await expect(page.locator('.context-list')).toHaveCount(0)
  await page.locator('[data-guided-wind="button"]').click()
  await expect(page.locator('.engine-chip')).toHaveAttribute('data-phase', 'ready')
  await expect(page.getByRole('button', { name: 'Enable 20% wind and reset' })).toBeHidden()
  await expect(page.locator('.context-list')).toContainText('probability 0.85')

  await page.getByRole('button', { name: 'Audit' }).click()
  await expect(page.locator('.audit-list li[data-pass="true"]')).toHaveCount(5)
})

test('guides the Chinese Markov view from a calm baseline to wind', async ({ page }) => {
  await page.goto('zh-Hans/labs/ch01-gridworld')
  await expect(page.locator('.engine-chip')).toHaveAttribute('data-phase', 'ready')

  await page.getByRole('button', { name: '马尔可夫', exact: true }).click()
  await expect(page.locator('[data-guided-wind="banner"]')).toContainText('风扰动引导')
  await expect(page.locator('[data-guided-wind="hint"]')).toContainText(
    '先注意无风时平静与阵风情形的预测完全相同',
  )
  await expect(page.locator('[data-guided-wind="button"]')).toHaveText('开启 20% 风扰动并重置')
  await expect(page.locator('.context-list')).toHaveCount(0)

  await page.locator('[data-guided-wind="button"]').click()
  await expect(page.locator('.engine-chip')).toHaveAttribute('data-phase', 'ready')
  await expect(page.locator('[data-guided-wind="button"]')).toHaveCount(0)
  await expect(page.locator('.context-list')).toContainText('概率为 0.85')
})

test('distinguishes terminal, absorbing, and continuing goal semantics', async ({ page }) => {
  await page.goto('en/labs/ch01-gridworld')
  await expect(page.locator('.engine-chip')).toHaveAttribute('data-phase', 'ready')

  await page.getByRole('button', { name: 'World' }).click()
  await page.locator('input[type="range"]').fill('0')
  await page.getByRole('button', { name: 'Apply and reset' }).click()
  await page.getByRole('button', { name: 'Episode', exact: true }).click()
  await followRightEdgePath(page)
  await expect(page.locator('.episode-status')).toContainText('terminal rule fired')
  await expect(page.getByRole('button', { name: 'Move left' })).toBeDisabled()

  await page.getByLabel('Goal behavior').selectOption('1')
  await page.getByRole('button', { name: 'Apply and reset' }).click()
  await followRightEdgePath(page)
  await page.getByRole('button', { name: 'Move left' }).click()
  await expect(page.locator('.grid-cell--active .grid-cell__state')).toHaveText('s15')
  await expect(page.locator('.trajectory-panel tbody tr').last()).toContainText('0')
  await expect(page.locator('.episode-status')).toContainText('remains at the goal')

  await page.getByLabel('Goal behavior').selectOption('2')
  await page.getByRole('button', { name: 'Apply and reset' }).click()
  await followRightEdgePath(page)
  await page.getByRole('button', { name: 'Move left' }).click()
  await expect(page.locator('.grid-cell--active .grid-cell__state')).toHaveText('s14')
  await expect(page.locator('.episode-status')).toContainText('does not stop interaction')
})

test('replays policy RNG state across a locale switch', async ({ browser }) => {
  const baselineContext = await browser.newContext()
  const baselinePage = await baselineContext.newPage()
  await openPolicyView(baselinePage)
  await samplePolicy(baselinePage, 5, 'Sample policy and step')
  const baseline = await baselinePage.locator('.trajectory-panel tbody tr').evaluateAll((rows) =>
    rows.map((row) => [row.dataset.requestedAction, row.dataset.actualAction]),
  )

  const switchedContext = await browser.newContext()
  const switchedPage = await switchedContext.newPage()
  await openPolicyView(switchedPage)
  await samplePolicy(switchedPage, 2, 'Sample policy and step')
  await openLanguageMenu(switchedPage)
  await switchedPage.getByRole('link', { name: '简体中文' }).click()
  await expect(switchedPage).toHaveURL(/\/zh-Hans\/labs\/ch01-gridworld$/)
  await expect(switchedPage.locator('.engine-chip')).toHaveAttribute('data-phase', 'ready')
  await expect(switchedPage.locator('.trajectory-panel tbody tr')).toHaveCount(2)
  await samplePolicy(switchedPage, 3, '采样策略并执行一步')
  const switched = await switchedPage.locator('.trajectory-panel tbody tr').evaluateAll((rows) =>
    rows.map((row) => [row.dataset.requestedAction, row.dataset.actualAction]),
  )

  expect(switched).toEqual(baseline)
  await baselineContext.close()
  await switchedContext.close()
})
