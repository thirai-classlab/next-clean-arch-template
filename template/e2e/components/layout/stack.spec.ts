/**
 * Component Gallery — Layout / Stack smoke spec (task-4 Step 4)
 */
import { test, expect } from '@playwright/test'
import { gotoGallery, cardByEntryId } from '../_helpers'

// task-4 Step 5 iter 2-F (test-automator M-02): axe-core scan は
// `components/axe-core.spec.ts` に集約。各 spec 末尾の重複 scan を削除して
// CI 実行時間を短縮する。違反が起きれば axe-core.spec.ts 側で検出される。

test.describe('Gallery — Stack card', () => {
  test.beforeEach(async ({ page }) => {
    await gotoGallery(page)
  })

  test('component card is visible', async ({ page }) => {
    await expect(cardByEntryId(page, 'stack')).toBeVisible()
  })

  test('preview renders stacked items', async ({ page }) => {
    const preview = cardByEntryId(page, 'stack').getByTestId('component-card-preview')
    await preview.scrollIntoViewIfNeeded()
    await expect(preview).toContainText('First')
    await expect(preview).toContainText('Second')
    await expect(preview).toContainText('Third')
  })
})
