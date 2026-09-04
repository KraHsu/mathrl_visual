import { expect, test } from '@playwright/test'

async function announceUpdate(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(() => {
    let activated = false
    ;(window as Window & { mathrlPwa?: unknown; __mathrlPwaActivated?: () => boolean }).mathrlPwa = {
      activateUpdate: async () => {
        activated = true
        return true
      },
    }
    ;(window as Window & { __mathrlPwaActivated?: () => boolean }).__mathrlPwaActivated = () => activated
    window.dispatchEvent(new CustomEvent('mathrl:pwa-update', { detail: {} }))
  })
  await expect(page.getByTestId('pwa-update-prompt')).toBeVisible()
}

for (const [locale, expectedAvailable, expectedActivate] of [
  ['en', 'A new version of MathRL Visual is ready.', 'Activate update'],
  ['zh-Hans', 'MathRL Visual 有新版本可以使用。', '确认启用更新'],
] as const) {
  test(`shows a ${locale} update prompt and waits for explicit confirmation`, async ({ page }) => {
    // Keep the route relative to Playwright's baseURL.  A leading slash would
    // discard the GitHub Pages sub-path (for example `/mathrl_visual/`) and
    // exercise the host root instead of the built artifact.
    await page.goto(`${locale}/`)
    const before = await page.url()
    await announceUpdate(page)
    await expect(page.getByTestId('pwa-update-prompt')).toContainText(expectedAvailable)
    await expect(page.getByTestId('pwa-update-activate')).toHaveText(expectedActivate)
    // Merely discovering a waiting worker must not navigate or refresh.
    expect(await page.url()).toBe(before)

    await page.getByTestId('pwa-update-activate').click()
    await expect(page.getByTestId('pwa-update-prompt')).toHaveAttribute('data-state', 'activated')
    await expect(page.getByTestId('pwa-update-refresh')).toBeVisible()
    expect(await page.evaluate(() => (window as Window & { __mathrlPwaActivated?: () => boolean }).__mathrlPwaActivated?.())).toBe(true)
    expect(await page.url()).toBe(before)
  })
}
