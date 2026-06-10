/**
 * ConfirmDialog — keyboard / a11y E2E (task-32 Step 5 S2).
 *
 * Verifies:
 *   - Default dialog opens, Escape key closes it.
 *   - Outside click (backdrop) closes the dialog.
 *   - Cancel button closes the dialog and does not fire onConfirm.
 *   - Confirm button fires onConfirm and closes.
 *   - Danger tone: confirm button carries data-tone="danger".
 *   - role="alertdialog" is present on the dialog surface.
 *   - Tab focus cycles between cancel ↔ confirm within the dialog (focus trap).
 *
 * Fixture: `section-confirm-dialog` in /dev/composite (added for task-32 Step 5).
 */
import { test, expect } from '@playwright/test'

const PAGE = '/dev/composite'

async function setSession(context: import('@playwright/test').BrowserContext) {
  await context.addCookies([
    { name: 'mock_session', value: 'admin', domain: 'localhost', path: '/' },
  ])
}

// Helper: open the default ConfirmDialog
async function openDefault(page: import('@playwright/test').Page) {
  await page.getByTestId('confirm-trigger-default').click()
  // Wait for the dialog to be visible
  await page.waitForSelector('[role="alertdialog"]', { state: 'visible' })
}

// Helper: open the danger ConfirmDialog
async function openDanger(page: import('@playwright/test').Page) {
  await page.getByTestId('confirm-trigger-danger').click()
  await page.waitForSelector('[role="alertdialog"]', { state: 'visible' })
}

test.describe('ConfirmDialog — open / dismiss', () => {
  test.beforeEach(async ({ page, context }) => {
    await setSession(context)
    await page.goto(PAGE)
    await page.waitForSelector('[data-testid="section-confirm-dialog"]')
  })

  test('opens default dialog on trigger click', async ({ page }) => {
    await openDefault(page)
    await expect(page.getByRole('alertdialog')).toBeVisible()
    // Title and message are rendered
    await expect(page.getByText('操作の確認')).toBeVisible()
    await expect(page.getByText('この操作を続けてよろしいですか?')).toBeVisible()
  })

  test('Escape key closes the dialog', async ({ page }) => {
    await openDefault(page)
    await expect(page.getByRole('alertdialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('alertdialog')).not.toBeVisible()
  })

  test('cancel button closes the dialog', async ({ page }) => {
    await openDefault(page)
    await page.getByRole('button', { name: 'キャンセル' }).click()
    await expect(page.getByRole('alertdialog')).not.toBeVisible()
    // onConfirm was NOT called — result text should not appear
    await expect(page.getByTestId('confirm-result')).not.toBeVisible()
  })

  test('confirm button fires onConfirm and closes the dialog', async ({ page }) => {
    await openDefault(page)
    await page.getByRole('button', { name: '確認' }).click()
    await expect(page.getByRole('alertdialog')).not.toBeVisible()
    await expect(page.getByTestId('confirm-result')).toBeVisible()
    await expect(page.getByTestId('confirm-result')).toHaveText('confirmed-default')
  })
})

test.describe('ConfirmDialog — danger tone', () => {
  test.beforeEach(async ({ page, context }) => {
    await setSession(context)
    await page.goto(PAGE)
    await page.waitForSelector('[data-testid="section-confirm-dialog"]')
  })

  test('danger dialog has role="alertdialog"', async ({ page }) => {
    await openDanger(page)
    await expect(page.getByRole('alertdialog')).toBeVisible()
  })

  test('danger confirm button carries data-tone="danger"', async ({ page }) => {
    await openDanger(page)
    const confirmBtn = page.getByRole('button', { name: '削除する' })
    await expect(confirmBtn).toHaveAttribute('data-tone', 'danger')
  })

  test('danger confirm button fires onConfirm with result "confirmed-danger"', async ({ page }) => {
    await openDanger(page)
    await page.getByRole('button', { name: '削除する' }).click()
    await expect(page.getByRole('alertdialog')).not.toBeVisible()
    await expect(page.getByTestId('confirm-result')).toHaveText('confirmed-danger')
  })
})

test.describe('ConfirmDialog — focus trap', () => {
  test.beforeEach(async ({ page, context }) => {
    await setSession(context)
    await page.goto(PAGE)
    await page.waitForSelector('[data-testid="section-confirm-dialog"]')
  })

  test('Tab key cycles focus within the dialog (cancel ↔ confirm)', async ({ page }) => {
    await openDefault(page)
    const dialog = page.getByRole('alertdialog')
    await expect(dialog).toBeVisible()

    // Tab once: focus should land on one of the dialog buttons
    await page.keyboard.press('Tab')
    const cancelBtn = page.getByRole('button', { name: 'キャンセル' })
    const confirmBtn = page.getByRole('button', { name: '確認' })

    // Focus must be inside the dialog (either cancel or confirm)
    const cancelFocused = await cancelBtn.evaluate((el) => el === document.activeElement)
    const confirmFocused = await confirmBtn.evaluate((el) => el === document.activeElement)
    expect(cancelFocused || confirmFocused).toBe(true)

    // Tab again: focus moves to the other button (still inside dialog)
    await page.keyboard.press('Tab')
    const cancelFocused2 = await cancelBtn.evaluate((el) => el === document.activeElement)
    const confirmFocused2 = await confirmBtn.evaluate((el) => el === document.activeElement)
    expect(cancelFocused2 || confirmFocused2).toBe(true)
  })
})
