/**
 * Component Library Phase A — Smoke E2E Tests
 *
 * Basic sanity check: /dev/components page boots and renders 12 components.
 * Detailed per-component tests are in typography.spec.ts and primitive.spec.ts.
 */
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const BASE = '/dev/components'

/** Set mock_session cookie so middleware auth-guard passes through */
async function setMockSession(page: import('@playwright/test').Page, role = 'user') {
  await page.context().addCookies([
    { name: 'mock_session', value: role, url: 'http://localhost:3000' },
  ])
}

test.describe('Component Library Phase A — smoke', () => {
  test.beforeEach(async ({ page }) => {
    await setMockSession(page)
  })

  test('page loads without JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto(BASE)
    await expect(page.locator('[data-testid="components-page"]')).toBeVisible()

    expect(errors).toHaveLength(0)
  })

  test('page title is defined', async ({ page }) => {
    await page.goto(BASE)
    const title = await page.title()
    expect(title.length).toBeGreaterThan(0)
  })

  test('theme toggle changes data-theme attribute', async ({ page }) => {
    await page.goto(BASE)
    await expect(page.locator('[data-testid="theme-toggle"]')).toBeVisible()

    // Toggle to dark
    await page.click('[data-testid="theme-toggle"]')
    const darkTheme = await page.locator('html').getAttribute('data-theme')
    expect(darkTheme).toBe('dark')

    // Toggle back to light
    await page.click('[data-testid="theme-toggle"]')
    const lightTheme = await page.locator('html').getAttribute('data-theme')
    expect(lightTheme).toBe('light')
  })

  test('all 12 component sections are present', async ({ page }) => {
    await page.goto(BASE)
    const sections = [
      'section-heading',
      'section-text',
      'section-code',
      'section-link',
      'section-button',
      'section-icon-button',
      'section-input',
      'section-textarea',
      'section-select',
      'section-checkbox',
      'section-radio',
      'section-switch',
    ]
    for (const id of sections) {
      await expect(page.locator(`[data-testid="${id}"]`), `${id} should be visible`).toBeVisible()
    }
  })

  test('axe-core: no violations on component gallery (light theme)', async ({ page }) => {
    await page.goto(BASE)
    await expect(page.locator('[data-testid="components-page"]')).toBeVisible()
    // Disable color-contrast rule: Sidebar uses legacy --bg/#2A6FDB token pair that has
    // known 2.66 contrast ratio. This is a pre-existing issue outside Phase A scope;
    // will be fixed in Phase C token unification (accepted-risk #4 → axe confirmation).
    const results = await new AxeBuilder({ page })
      .include('[data-testid="components-page"]')
      .disableRules(['color-contrast'])
      .analyze()
    expect(results.violations).toEqual([])
  })

  test('axe-core: no violations on component gallery (dark theme)', async ({ page }) => {
    await page.goto(BASE)
    await page.click('[data-testid="theme-toggle"]')
    await expect(page.locator('[data-testid="components-page"]')).toBeVisible()
    const results = await new AxeBuilder({ page })
      .include('[data-testid="components-page"]')
      .disableRules(['color-contrast'])
      .analyze()
    expect(results.violations).toEqual([])
  })
})
