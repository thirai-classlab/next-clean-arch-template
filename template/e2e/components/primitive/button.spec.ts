/**
 * Component Gallery — Primitive / Button smoke spec (task-4 Step 4)
 */
import { test, expect } from '@playwright/test'
import { gotoGallery, cardByEntryId } from '../_helpers'

// task-4 Step 5 iter 2-F (test-automator M-02): axe-core scan は
// `components/axe-core.spec.ts` に集約。各 spec 末尾の重複 scan を削除して
// CI 実行時間を短縮する。

test.describe('Gallery — Button card', () => {
  test.beforeEach(async ({ page }) => {
    await gotoGallery(page)
  })

  test('component card is visible', async ({ page }) => {
    await expect(cardByEntryId(page, 'button')).toBeVisible()
  })

  test('preview renders a button element', async ({ page }) => {
    const preview = cardByEntryId(page, 'button').getByTestId('component-card-preview')
    await expect(preview.locator('button').first()).toBeVisible()
  })

  test('button in preview is clickable', async ({ page }) => {
    const btn = cardByEntryId(page, 'button').getByTestId('component-card-preview').locator('button').first()
    await btn.scrollIntoViewIfNeeded()
    await expect(btn).toBeEnabled()
  })
})
