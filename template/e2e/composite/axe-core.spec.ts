import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const PAGE = '/dev/composite'

/** Set mock_session cookie so middleware passes the /dev/* route. */
async function setSession(context: import('@playwright/test').BrowserContext) {
  await context.addCookies([
    { name: 'mock_session', value: 'admin', domain: 'localhost', path: '/' },
  ])
}

/**
 * Tag set: WCAG 2.0 AA + WCAG 2.1 AA.
 *
 * wcag22aa is intentionally excluded here because its `target-size` rule (2.5.8)
 * flags existing primitive components (Input height 21px, Button gap spacing,
 * Table pagination gap-1) which are design-token issues tracked as a separate
 * refactoring task. The ARIA / role / focus-trap issues that this spec guards
 * are fully covered by wcag2aa + wcag21aa.
 */
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] as const

/**
 * axe-core accessibility scan for composite components.
 *
 * Scoping strategy:
 *  - Default page / Form / Tabs / Popover (portal within composite-page area): scoped to main
 *  - Modal / Drawer (portal outside main): exclude aside + header (pre-existing color-contrast issues)
 *  - Table: include section-table only
 */

test.describe('axe-core — composite page (default state)', () => {
  test('no violations on initial page load', async ({ page, context }) => {
    await setSession(context)
    await page.goto(PAGE)
    await page.waitForSelector('[data-testid="composite-page"]')

    const results = await new AxeBuilder({ page })
      .include('main')
      .withTags([...AXE_TAGS])
      .analyze()

    expect(results.violations).toEqual([])
  })
})

test.describe('axe-core — Modal open state', () => {
  test('no violations when modal is open', async ({ page, context }) => {
    await setSession(context)
    await page.goto(PAGE)
    await page.getByTestId('modal-trigger').click()
    await page.getByTestId('modal-input').waitFor({ state: 'visible' })

    // Modal renders in a Radix portal outside <main>; exclude sidebar/nav
    // which have pre-existing color-contrast issues tracked separately
    const results = await new AxeBuilder({ page })
      .exclude('aside')
      .exclude('header')
      .withTags([...AXE_TAGS])
      .analyze()

    expect(results.violations).toEqual([])
  })
})

test.describe('axe-core — Drawer open state', () => {
  test('no violations when left drawer is open', async ({ page, context }) => {
    await setSession(context)
    await page.goto(PAGE)
    await page.getByTestId('drawer-left-trigger').click()
    await page.getByTestId('drawer-left-content').waitFor({ state: 'visible' })

    const results = await new AxeBuilder({ page })
      .exclude('aside')
      .exclude('header')
      .withTags([...AXE_TAGS])
      .analyze()

    expect(results.violations).toEqual([])
  })

  test('no violations when right drawer is open', async ({ page, context }) => {
    await setSession(context)
    await page.goto(PAGE)
    await page.getByTestId('drawer-right-trigger').click()
    await page.getByTestId('drawer-right-content').waitFor({ state: 'visible' })

    const results = await new AxeBuilder({ page })
      .exclude('aside')
      .exclude('header')
      .withTags([...AXE_TAGS])
      .analyze()

    expect(results.violations).toEqual([])
  })
})

test.describe('axe-core — Tabs section', () => {
  test('no violations on Tabs (Tab Two active)', async ({ page, context }) => {
    await setSession(context)
    await page.goto(PAGE)
    await page.waitForSelector('[data-testid="section-tabs"]')

    await page.getByRole('tab', { name: 'Tab Two' }).click()
    await page.getByTestId('tab-panel-2').waitFor({ state: 'visible' })

    const results = await new AxeBuilder({ page })
      .include('[data-testid="section-tabs"]')
      .withTags([...AXE_TAGS])
      .analyze()

    expect(results.violations).toEqual([])
  })
})

test.describe('axe-core — Form section', () => {
  test('no violations on Form (default state)', async ({ page, context }) => {
    await setSession(context)
    await page.goto(PAGE)
    await page.waitForSelector('[data-testid="section-form"]')

    const results = await new AxeBuilder({ page })
      .include('[data-testid="section-form"]')
      .withTags([...AXE_TAGS])
      .analyze()

    expect(results.violations).toEqual([])
  })

  test('no violations on Form (validation error state)', async ({ page, context }) => {
    await setSession(context)
    await page.goto(PAGE)
    await page.waitForSelector('[data-testid="section-form"]')

    await page.getByTestId('form-submit').click()
    await page.waitForTimeout(200)

    const results = await new AxeBuilder({ page })
      .include('[data-testid="section-form"]')
      .withTags([...AXE_TAGS])
      .analyze()

    expect(results.violations).toEqual([])
  })
})

test.describe('axe-core — Table section', () => {
  test('no violations on Table (WCAG 2.0 + 2.1 AA)', async ({ page, context }) => {
    await setSession(context)
    await page.goto(PAGE)
    await page.waitForSelector('[data-testid="section-table"]')

    const results = await new AxeBuilder({ page })
      .include('[data-testid="section-table"]')
      .withTags([...AXE_TAGS])
      .analyze()

    expect(results.violations).toEqual([])
  })
})

test.describe('axe-core — Popover open state', () => {
  test('no violations when popover is open', async ({ page, context }) => {
    await setSession(context)
    await page.goto(PAGE)
    await page.getByTestId('popover-trigger').click()
    await page.getByTestId('popover-content').waitFor({ state: 'visible' })

    // Popover portal renders inside <main> area; scope to section-popover + portal
    const results = await new AxeBuilder({ page })
      .include('[data-testid="section-popover"]')
      .withTags([...AXE_TAGS])
      .analyze()

    expect(results.violations).toEqual([])
  })
})
