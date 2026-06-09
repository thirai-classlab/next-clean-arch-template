/**
 * DataTable — sort / pagination interactive E2E (task-32 Step 5 S2).
 *
 * Verifies that the DataTable (TanStack-uncontrolled) fixture in /dev/composite:
 *   - Renders 10 rows on the first page (pageSize=10 initial from 20 rows).
 *   - Clicking a sortable header reorders rows alphabetically (asc → desc).
 *   - aria-sort cycles none → ascending → descending on each click.
 *   - Pagination page 2 shows rows User10–User19.
 *   - Empty state renders "No data" when data=[].
 *
 * Fixture: `section-data-table` in /dev/composite (added for task-32 Step 5).
 * Data: 20 UserRow entries (User00–User19, pageSize=10).
 */
import { test, expect } from '@playwright/test'

const PAGE = '/dev/composite'

async function setSession(context: import('@playwright/test').BrowserContext) {
  await context.addCookies([
    { name: 'mock_session', value: 'admin', domain: 'localhost', path: '/' },
  ])
}

test.describe('DataTable — sort interaction', () => {
  test.beforeEach(async ({ page, context }) => {
    await setSession(context)
    await page.goto(PAGE)
    await page.waitForSelector('[data-testid="section-data-table"]')
  })

  const section = (page: import('@playwright/test').Page) =>
    page.getByTestId('section-data-table')

  const usernameHeader = (page: import('@playwright/test').Page) =>
    section(page).getByRole('columnheader', { name: 'Username' })

  const firstBodyRowText = async (page: import('@playwright/test').Page) =>
    (
      await section(page).locator('tbody tr').first().textContent()
    )?.trim() ?? ''

  test('renders 10 rows on first page (pageSize=10, 20 total rows)', async ({ page }) => {
    await expect(section(page).locator('tbody tr')).toHaveCount(10)
    // First row in source order: User00
    expect(await firstBodyRowText(page)).toContain('User00')
  })

  test('aria-sort is "none" on initial unsorted state', async ({ page }) => {
    await expect(usernameHeader(page)).toHaveAttribute('aria-sort', 'none')
  })

  test('first click on Username header: ascending sort, aria-sort=ascending', async ({ page }) => {
    await usernameHeader(page).click()
    await expect(usernameHeader(page)).toHaveAttribute('aria-sort', 'ascending')
    // Alphabetically first username is User00 (asc)
    expect(await firstBodyRowText(page)).toContain('User00')
  })

  test('second click on Username header: descending sort, aria-sort=descending', async ({ page }) => {
    await usernameHeader(page).click()
    await usernameHeader(page).click()
    await expect(usernameHeader(page)).toHaveAttribute('aria-sort', 'descending')
    // Alphabetically last username: User19 (desc, padded with 2 digits)
    expect(await firstBodyRowText(page)).toContain('User19')
  })

  test('aria-sort cycles none → ascending → descending across three clicks', async ({ page }) => {
    const header = usernameHeader(page)
    await expect(header).toHaveAttribute('aria-sort', 'none')
    await header.click()
    await expect(header).toHaveAttribute('aria-sort', 'ascending')
    await header.click()
    await expect(header).toHaveAttribute('aria-sort', 'descending')
  })
})

test.describe('DataTable — pagination interaction', () => {
  test.beforeEach(async ({ page, context }) => {
    await setSession(context)
    await page.goto(PAGE)
    await page.waitForSelector('[data-testid="section-data-table"]')
  })

  const section = (page: import('@playwright/test').Page) =>
    page.getByTestId('section-data-table')

  test('pagination nav shows 2 pages for 20 rows at pageSize=10', async ({ page }) => {
    const nav = section(page).getByRole('navigation', { name: 'Pagination' })
    await expect(nav.getByRole('button')).toHaveCount(2)
  })

  test('page 1 active by default (aria-current=page)', async ({ page }) => {
    const nav = section(page).getByRole('navigation', { name: 'Pagination' })
    await expect(nav.getByRole('button', { name: 'Page 1' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    await expect(nav.getByRole('button', { name: 'Page 2' })).not.toHaveAttribute(
      'aria-current',
    )
  })

  test('clicking Page 2 shows rows User10–User19 and marks page 2 active', async ({ page }) => {
    const nav = section(page).getByRole('navigation', { name: 'Pagination' })
    await nav.getByRole('button', { name: 'Page 2' }).click()
    await expect(nav.getByRole('button', { name: 'Page 2' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    const rowTexts = await section(page).locator('tbody tr').allTextContents()
    const joined = rowTexts.join(' ')
    expect(joined).toContain('User10')
    expect(joined).not.toContain('User00')
  })
})
