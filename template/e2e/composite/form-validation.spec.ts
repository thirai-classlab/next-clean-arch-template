/**
 * Form — interactive validation-error E2E (task-29 Step 4b-2).
 *
 * Closes the Step 3 test-design-review HIGH: the prior smoke spec only proved a
 * form + input rendered. The /dev/composite demo wires zod + RHF + FormField
 * (Pattern B) so this asserts the live error lifecycle — an empty submit marks
 * the controls aria-invalid and surfaces Field.ErrorText (role=alert); filling
 * valid values and resubmitting clears the errors and shows the success message.
 */
import { test, expect } from '@playwright/test'

const PAGE = '/dev/composite'

test.describe('Form — validation errors', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.addCookies([
      { name: 'mock_session', value: 'admin', domain: 'localhost', path: '/' },
    ])
    await page.goto(PAGE)
    await page.waitForSelector('[data-testid="section-form"]')
  })

  const formSection = (page: import('@playwright/test').Page) =>
    page.getByTestId('section-form')

  test('empty submit marks both fields aria-invalid and shows error alerts', async ({ page }) => {
    const section = formSection(page)
    const nameInput = section.getByTestId('form-name-input')
    const emailInput = section.getByTestId('form-email-input')

    // Before submit: not invalid.
    await expect(nameInput).not.toHaveAttribute('aria-invalid', 'true')
    await expect(emailInput).not.toHaveAttribute('aria-invalid', 'true')

    await section.getByTestId('form-submit').click()

    // After empty submit: zod validation fails → aria-invalid + role=alert.
    await expect(nameInput).toHaveAttribute('aria-invalid', 'true')
    await expect(emailInput).toHaveAttribute('aria-invalid', 'true')

    const alerts = section.getByRole('alert')
    await expect(alerts.first()).toBeVisible()
    // The schema messages are the source of truth for the rendered errors.
    await expect(section).toContainText('Name is required')
    await expect(section).toContainText('Valid email required')

    // Success message must NOT be present while invalid.
    await expect(page.getByTestId('form-success')).toHaveCount(0)
  })

  test('invalid email (non-empty) surfaces only the email error', async ({ page }) => {
    const section = formSection(page)
    await section.getByTestId('form-name-input').fill('Ada Lovelace')
    await section.getByTestId('form-email-input').fill('not-an-email')
    await section.getByTestId('form-submit').click()

    await expect(section.getByTestId('form-email-input')).toHaveAttribute('aria-invalid', 'true')
    await expect(section.getByTestId('form-name-input')).not.toHaveAttribute('aria-invalid', 'true')
    await expect(section).toContainText('Valid email required')
    await expect(section).not.toContainText('Name is required')
  })

  test('errors clear and success appears after a valid submit', async ({ page }) => {
    const section = formSection(page)
    const nameInput = section.getByTestId('form-name-input')
    const emailInput = section.getByTestId('form-email-input')

    // Trigger errors first.
    await section.getByTestId('form-submit').click()
    await expect(nameInput).toHaveAttribute('aria-invalid', 'true')
    await expect(emailInput).toHaveAttribute('aria-invalid', 'true')

    // Provide valid values and resubmit.
    await nameInput.fill('Ada Lovelace')
    await emailInput.fill('ada@example.com')
    await section.getByTestId('form-submit').click()

    // Errors cleared.
    await expect(nameInput).not.toHaveAttribute('aria-invalid', 'true')
    await expect(emailInput).not.toHaveAttribute('aria-invalid', 'true')
    await expect(section).not.toContainText('Name is required')
    await expect(section).not.toContainText('Valid email required')
    await expect(section.getByRole('alert')).toHaveCount(0)

    // Success message shown.
    await expect(page.getByTestId('form-success')).toBeVisible()
  })
})
