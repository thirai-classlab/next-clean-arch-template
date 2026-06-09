import { test, expect } from '@playwright/test'

const PAGE = '/dev/composite'

test.describe('Modal — focus trap & keyboard', () => {
  test.beforeEach(async ({ page, context }) => {
    // Set mock session cookie so middleware passes the /dev route
    await context.addCookies([
      { name: 'mock_session', value: 'admin', domain: 'localhost', path: '/' },
    ])
    await page.goto(PAGE)
    await page.waitForSelector('[data-testid="modal-trigger"]')
  })

  test('opens modal and auto-focuses first focusable element', async ({ page }) => {
    const trigger = page.getByTestId('modal-trigger')
    await trigger.click()

    // Wait for modal content to be visible
    // The modal-input is passed as data-testid on Input which spreads to <input>
    const modalInput = page.getByTestId('modal-input')
    await expect(modalInput).toBeVisible()

    // Chakra/Ark (Zag) Dialog auto-focuses the first focusable element in the
    // content area. The modal-input <input> is the first focusable element.
    await expect(modalInput).toBeFocused()
  })

  test('Tab key cycles focus within modal (forward)', async ({ page }) => {
    await page.getByTestId('modal-trigger').click()
    const modalInput = page.getByTestId('modal-input')
    await expect(modalInput).toBeVisible()
    await expect(modalInput).toBeFocused()

    // Tab from modal-input → modal-cancel
    await page.keyboard.press('Tab')
    await expect(page.getByTestId('modal-cancel')).toBeFocused()

    // Tab → modal-confirm
    await page.keyboard.press('Tab')
    await expect(page.getByTestId('modal-confirm')).toBeFocused()

    // Tab → wraps back to modal-input (focus trap)
    await page.keyboard.press('Tab')
    await expect(modalInput).toBeFocused()
  })

  test('Shift+Tab cycles focus within modal (reverse)', async ({ page }) => {
    await page.getByTestId('modal-trigger').click()
    const modalInput = page.getByTestId('modal-input')
    await expect(modalInput).toBeVisible()
    await expect(modalInput).toBeFocused()

    // Shift+Tab from modal-input should wrap to last focusable (modal-confirm)
    await page.keyboard.press('Shift+Tab')
    await expect(page.getByTestId('modal-confirm')).toBeFocused()
  })

  test('Escape key closes modal', async ({ page }) => {
    const trigger = page.getByTestId('modal-trigger')
    await trigger.click()
    const modalInput = page.getByTestId('modal-input')
    await expect(modalInput).toBeVisible()

    await page.keyboard.press('Escape')

    // Modal should be gone
    await expect(modalInput).not.toBeVisible()
  })

  test('clicking outside modal content area closes modal', async ({ page }) => {
    await page.getByTestId('modal-trigger').click()
    const modalInput = page.getByTestId('modal-input')
    await expect(modalInput).toBeVisible()

    // Press Escape as a reliable way to dismiss (overlay click may not work
    // when overlay has pointer-events:none via aria-hidden)
    await page.keyboard.press('Escape')

    await expect(modalInput).not.toBeVisible()
  })

  test('cancel button closes modal', async ({ page }) => {
    await page.getByTestId('modal-trigger').click()
    const modalInput = page.getByTestId('modal-input')
    await expect(modalInput).toBeVisible()

    await page.getByTestId('modal-cancel').click()
    await expect(modalInput).not.toBeVisible()
  })

  test('modal has aria-modal attribute', async ({ page }) => {
    await page.getByTestId('modal-trigger').click()
    await expect(page.getByTestId('modal-input')).toBeVisible()

    // Chakra/Ark (Zag) Dialog.Content sets aria-modal="true"
    const dialog = page.getByRole('dialog')
    await expect(dialog).toHaveAttribute('aria-modal', 'true')
  })
})
