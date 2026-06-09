/**
 * Table — interactive sort / pagination / empty-state E2E (task-29 Step 4b-2).
 *
 * Closes the Step 3 test-design-review HIGH: the Table component runs in
 * manualSorting + manualPagination mode (parent owns the sort/page math), so
 * the prior smoke spec only proved static rows rendered. The /dev/composite
 * demo now feeds the Table sorted-and-sliced data, letting us assert that
 * clicking a sortable header actually reorders rows, that aria-sort cycles
 * none → ascending → descending, that pagination changes page content with
 * correct first/last-page boundaries, and that the empty state renders.
 */
import { test, expect } from '@playwright/test'

const PAGE = '/dev/composite'

test.describe('Table — interactive sort / pagination', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.addCookies([
      { name: 'mock_session', value: 'admin', domain: 'localhost', path: '/' },
    ])
    await page.goto(PAGE)
    await page.waitForSelector('[data-testid="section-table"]')
  })

  // The first data table on the page is the populated demo (the empty-state
  // table is in section-table-empty, asserted separately below).
  const dataTable = (page: import('@playwright/test').Page) =>
    page.getByTestId('section-table').locator('table')

  const firstBodyRowText = async (page: import('@playwright/test').Page) =>
    (await dataTable(page).locator('tbody tr').first().textContent())?.trim() ?? ''

  const nameHeader = (page: import('@playwright/test').Page) =>
    dataTable(page).getByRole('columnheader', { name: 'Name' })

  test('initial state: unsorted, first row is the source-order first row', async ({ page }) => {
    // Source order page 1 (pageSize 3) = Alice, Bob, Carol.
    await expect(dataTable(page).locator('tbody tr')).toHaveCount(3)
    expect(await firstBodyRowText(page)).toContain('Alice')
    await expect(nameHeader(page)).toHaveAttribute('aria-sort', 'none')
  })

  test('clicking a sortable header reorders rows and cycles aria-sort none → ascending → descending', async ({
    page,
  }) => {
    const header = nameHeader(page)
    await expect(header).toHaveAttribute('aria-sort', 'none')

    // First click → ascending. Names asc page 1 = Alice, Bob, Carol → Alice first.
    await header.click()
    await expect(header).toHaveAttribute('aria-sort', 'ascending')
    expect(await firstBodyRowText(page)).toContain('Alice')

    // Second click → descending. Names desc = Eve, Dave, Carol → Eve first.
    await header.click()
    await expect(header).toHaveAttribute('aria-sort', 'descending')
    expect(await firstBodyRowText(page)).toContain('Eve')
  })

  test('sortable header is keyboard operable (Enter triggers sort)', async ({ page }) => {
    const header = nameHeader(page)
    await header.focus()
    await expect(header).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(header).toHaveAttribute('aria-sort', 'ascending')
    expect(await firstBodyRowText(page)).toContain('Alice')
  })

  test('pagination changes page content', async ({ page }) => {
    const pagination = page.getByTestId('section-table').getByRole('navigation', {
      name: 'Pagination',
    })
    // Page 1 (source order) = Alice, Bob, Carol.
    expect(await firstBodyRowText(page)).toContain('Alice')

    // Go to page 2 → Dave, Eve.
    await pagination.getByRole('button', { name: 'Page 2' }).click()
    await expect(pagination.getByRole('button', { name: 'Page 2' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    const rowsTextPage2 = await dataTable(page).locator('tbody tr').allTextContents()
    expect(rowsTextPage2.join(' ')).toContain('Dave')
    expect(rowsTextPage2.join(' ')).toContain('Eve')
    expect(rowsTextPage2.join(' ')).not.toContain('Alice')

    // Back to page 1 → Alice reappears.
    await pagination.getByRole('button', { name: 'Page 1' }).click()
    await expect(pagination.getByRole('button', { name: 'Page 1' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(await firstBodyRowText(page)).toContain('Alice')
  })

  test('pagination boundaries: 2 pages for 5 rows at pageSize 3, aria-current marks active page', async ({
    page,
  }) => {
    const pagination = page.getByTestId('section-table').getByRole('navigation', {
      name: 'Pagination',
    })
    // 5 rows / pageSize 3 = ceil(5/3) = 2 pages.
    await expect(pagination.getByRole('button')).toHaveCount(2)

    // First page active by default; only one button is aria-current.
    await expect(
      pagination.locator('button[aria-current="page"]'),
    ).toHaveCount(1)
    await expect(pagination.getByRole('button', { name: 'Page 1' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    await expect(pagination.getByRole('button', { name: 'Page 2' })).not.toHaveAttribute(
      'aria-current',
      'page',
    )
  })
})

test.describe('Table — empty state', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.addCookies([
      { name: 'mock_session', value: 'admin', domain: 'localhost', path: '/' },
    ])
    await page.goto(PAGE)
    await page.waitForSelector('[data-testid="section-table-empty"]')
  })

  test('empty table renders the empty-state message and no data rows', async ({ page }) => {
    const emptySection = page.getByTestId('section-table-empty')
    await expect(emptySection.getByTestId('table-empty-message')).toBeVisible()
    await expect(emptySection.getByTestId('table-empty-message')).toHaveText('No records found')
    // Empty table intentionally omits the header (Table.tsx contract), so the
    // only body row is the empty-state cell — no person rows are present.
    await expect(emptySection.locator('tbody')).not.toContainText('Alice')
    await expect(emptySection.locator('tbody')).not.toContainText('Bob')
  })
})
