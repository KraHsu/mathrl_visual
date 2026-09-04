import { expect, test } from '@playwright/test'

test.describe('visible page evidence', () => {
  test('shows both locale review states and pinned topic provenance', async ({ page }) => {
    await page.goto('en/concepts/markov-property')
    const evidence = page.getByTestId('page-evidence')
    await expect(evidence).toBeVisible()
    await expect(evidence).toContainText('Current locale')
    await expect(evidence).toContainText('Paired locale')
    await expect(evidence.locator('[data-review-field="content"]')).toHaveCount(2)
    await expect(evidence.locator('[data-review-status="draft"]')).toHaveCount(8)
    await expect(evidence.locator('summary')).toContainText('Provenance and errata')
    await evidence.locator('summary').click()
    await expect(evidence).toContainText('PDF SHA-256')
    await expect(evidence).toContainText(/errata/i)
    await expect(evidence.locator('.page-evidence__pair')).toHaveAttribute(
      'href',
      /\/zh-Hans\/concepts\/markov-property$/,
    )
  })

  test('marks navigation pages as not applicable for mathematics', async ({ page }) => {
    await page.goto('zh-Hans/map')
    const evidence = page.getByTestId('page-evidence')
    await expect(evidence).toContainText('当前语言')
    await expect(evidence.locator('[data-review-status="not_applicable"]')).toHaveCount(2)
  })

  test('keeps the localized home page auditable', async ({ page }) => {
    await page.goto('en/')
    const evidence = page.getByTestId('page-evidence')
    await expect(evidence).toBeVisible()
    await expect(evidence.locator('[data-review-status]')).toHaveCount(8)
    await expect(evidence).toContainText('content-')
  })
})
