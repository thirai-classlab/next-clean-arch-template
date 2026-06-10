import { test, expect } from '@playwright/test'

const PAGE = '/dev/composite'

test.describe('Tabs — keyboard navigation', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.addCookies([
      { name: 'mock_session', value: 'admin', domain: 'localhost', path: '/' },
    ])
    await page.goto(PAGE)
    await page.waitForSelector('[data-testid="section-tabs"]')
  })

  test('first tab panel is visible by default', async ({ page }) => {
    await expect(page.getByTestId('tab-panel-1')).toBeVisible()
    await expect(page.getByTestId('tab-panel-2')).not.toBeVisible()
  })

  test('ArrowRight moves to next tab', async ({ page }) => {
    // Focus the first tab trigger via keyboard
    const tabSection = page.getByTestId('section-tabs')
    // Click first tab trigger to focus it
    const firstTab = tabSection.getByRole('tab', { name: 'Tab One' })
    await firstTab.click()
    await expect(firstTab).toBeFocused()

    // ArrowRight → Tab Two
    await page.keyboard.press('ArrowRight')
    const secondTab = tabSection.getByRole('tab', { name: 'Tab Two' })
    await expect(secondTab).toBeFocused()
    await expect(page.getByTestId('tab-panel-2')).toBeVisible()
  })

  test('ArrowLeft moves to previous tab', async ({ page }) => {
    const tabSection = page.getByTestId('section-tabs')
    const secondTab = tabSection.getByRole('tab', { name: 'Tab Two' })
    await secondTab.click()
    await expect(secondTab).toBeFocused()

    // ArrowLeft → Tab One
    await page.keyboard.press('ArrowLeft')
    const firstTab = tabSection.getByRole('tab', { name: 'Tab One' })
    await expect(firstTab).toBeFocused()
    await expect(page.getByTestId('tab-panel-1')).toBeVisible()
  })

  test('Home key moves focus to first tab', async ({ page }) => {
    const tabSection = page.getByTestId('section-tabs')
    const secondTab = tabSection.getByRole('tab', { name: 'Tab Two' })
    await secondTab.click()
    await expect(secondTab).toBeFocused()

    await page.keyboard.press('Home')
    const firstTab = tabSection.getByRole('tab', { name: 'Tab One' })
    await expect(firstTab).toBeFocused()
  })

  test('End key moves focus to last enabled tab', async ({ page }) => {
    const tabSection = page.getByTestId('section-tabs')
    const firstTab = tabSection.getByRole('tab', { name: 'Tab One' })
    await firstTab.click()
    await expect(firstTab).toBeFocused()

    await page.keyboard.press('End')
    // Tab Three is disabled — Chakra/Ark (Zag) skips disabled; last active is Tab Two
    const secondTab = tabSection.getByRole('tab', { name: 'Tab Two' })
    await expect(secondTab).toBeFocused()
  })

  test('disabled tab is skipped during arrow navigation', async ({ page }) => {
    const tabSection = page.getByTestId('section-tabs')
    const secondTab = tabSection.getByRole('tab', { name: 'Tab Two' })
    await secondTab.click()
    await expect(secondTab).toBeFocused()

    // ArrowRight from Tab Two should wrap or stop — not land on disabled Tab Three
    await page.keyboard.press('ArrowRight')
    // Chakra/Ark (Zag) wraps to first enabled tab (Tab One)
    const firstTab = tabSection.getByRole('tab', { name: 'Tab One' })
    await expect(firstTab).toBeFocused()

    // Confirm disabled tab has aria-disabled / data-disabled (Ark convention)
    const disabledTab = tabSection.getByRole('tab', { name: 'Tab Three (disabled)' })
    await expect(disabledTab).toBeDisabled()
  })

  test('Tab key exits tab list to next focusable element', async ({ page }) => {
    const tabSection = page.getByTestId('section-tabs')
    const firstTab = tabSection.getByRole('tab', { name: 'Tab One' })
    await firstTab.click()
    await expect(firstTab).toBeFocused()

    // Tab key should exit the tablist
    await page.keyboard.press('Tab')
    // Focus should leave the tab triggers
    await expect(firstTab).not.toBeFocused()
  })
})
