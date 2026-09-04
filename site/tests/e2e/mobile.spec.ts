import { expect, test } from '@playwright/test'

const locales = ['en', 'zh-Hans'] as const
const smokeRoutes = [
  'map',
  'concepts/markov-property',
  'symbols',
  'search',
  'offline',
  'learn/ch01/',
  'learn/ch02/',
  'learn/ch03/',
  'learn/ch04/',
  'learn/ch05/',
  'learn/ch06/',
  'learn/ch07/',
  'learn/ch08/',
  'learn/ch09/',
  'learn/ch10/',
  'learn/appendix/',
  'labs/ch01-gridworld',
  'labs/ch02-policy-evaluation',
  'labs/ch04-planning-grid',
  'labs/ch05-monte-carlo',
  'labs/ch06-stochastic-approximation',
  'labs/ch07-temporal-difference',
  'labs/ch08-value-function',
  'labs/ch09-policy-gradient',
  'labs/ch10-actor-critic',
] as const

const labSelectors = [
  '.lab-shell[data-phase]',
  '.grid-lab[data-phase]',
  '.monte-carlo-lab[data-phase]',
  '.stochastic-approximation-lab[data-phase]',
  '[data-testid="temporal-difference-lab"][data-phase]',
  '[data-testid="value-function-lab"][data-phase]',
  '[data-testid="policy-gradient-lab"][data-phase]',
  '[data-testid="actor-critic-lab"][data-phase]',
].join(', ')

for (const locale of locales) {
  test(`${locale} routes reflow at a phone viewport`, async ({ page }) => {
    for (const route of smokeRoutes) {
      await page.goto(`${locale}/${route}`)
      const lab = page.locator(labSelectors).first()
      if (await lab.count()) {
        await expect(lab).toHaveAttribute('data-phase', 'ready', { timeout: 30_000 })
      }
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
        `${locale}/${route} should not create page-level horizontal overflow`,
      ).toBe(true)
    }
  })
}

test('mobile navigation exposes locale switching and appearance controls', async ({ page }) => {
  await page.goto('en/')
  const hamburger = page.getByRole('button', { name: 'mobile navigation' })
  await expect(hamburger).toBeVisible()
  await hamburger.click()
  await expect(page.locator('#VPNavScreen')).toBeVisible()
  await expect(page.locator('#VPNavScreen').getByRole('link', { name: '简体中文' })).toBeVisible()
  await expect(page.locator('#VPNavScreen').getByRole('switch')).toBeVisible()
  await page.locator('#VPNavScreen').getByRole('link', { name: '简体中文' }).click()
  await expect(page).toHaveURL(/\/zh-Hans\/$/)
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-Hans')
})

test('mobile Grid World keeps the guided wind lesson usable', async ({ page }) => {
  await page.goto('zh-Hans/labs/ch01-gridworld')
  await expect(page.locator('.engine-chip')).toHaveAttribute('data-phase', 'ready', { timeout: 30_000 })
  await page.getByRole('button', { name: '转移', exact: true }).click()
  await expect(page.locator('[data-guided-wind="button"]')).toBeVisible()
  await page.locator('[data-guided-wind="button"]').click()
  await expect(page.locator('.mini-table tbody')).toContainText('0.85')
})
