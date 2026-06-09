/**
 * apps/web/e2e/template-iso/_helpers/open-allow-list-modal.ts
 *
 * Helper: openAllowListModal
 *
 * Extracted from full-flow.spec.ts (task-7 Step 5 refactor):
 *   - test 1b used `openModalButton` / `chakraEmailInput` variable names
 *   - test 4a used `openBtn` with inline `page.getByTestId(...)` calls
 *   Both shared the same retry loop pattern — unified here.
 *
 * Behavior:
 *   1. Locates the "Allow list に追加" button and asserts it is enabled.
 *   2. Clicks the button up to 5 times until the email input becomes visible,
 *      handling Chakra Portal async mount and Next.js 14 dev-server hydration lag.
 *   3. Asserts the email input is visible (real assertion — no defensive branch).
 *
 * Callers pass `page` only; all locator constants are encapsulated here.
 */

import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

/** data-testid of the email input inside the Allow-list dialog. */
const ALLOW_LIST_EMAIL_INPUT_TESTID = 'allow-list-email-input'

/**
 * Open the Allow-list modal on the /admin/allow-list page.
 *
 * Pre-conditions:
 *   - Page is already navigated to /admin/allow-list.
 *   - `page.waitForLoadState('networkidle')` has already been called by the caller.
 *
 * Post-conditions:
 *   - The email input (data-testid="allow-list-email-input") is visible.
 *
 * @param page Playwright Page object.
 */
export async function openAllowListModal(page: Page): Promise<void> {
  const openModalButton = page.getByRole('button', { name: 'Allow list に追加' })
  await expect(openModalButton).toBeEnabled()

  const emailInput = page.getByTestId(ALLOW_LIST_EMAIL_INPUT_TESTID)

  // Retry click loop: handles Chakra Portal async mount and hydration lag in
  // Next.js 14 dev server. onClick may not be attached on the first click.
  for (let attempt = 0; attempt < 5; attempt++) {
    await openModalButton.click()
    const visible = await emailInput.isVisible({ timeout: 3000 }).catch(() => false)
    if (visible) break
  }

  // Real assertion: email input inside Chakra dialog must be visible.
  await expect(emailInput).toBeVisible()
}
