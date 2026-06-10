import { renderWithChakra, fireEvent } from '@/test-utils'

// Use renderWithChakra directly (no alias) — keeps the import explicit and
// avoids silent coupling to whatever `render` is aliased to in test-utils.
const render = renderWithChakra
import { describe, it, expect, vi } from 'vitest'
import { Table } from './Table'
import { TableHead } from './TableHead'
import type { Column, PaginationProps } from './Table'

/**
 * Table unit tests — Chakra v3 + TanStack Table (Batch 3 migration).
 *
 * Behaviour-level coverage kept stable across the radix/cva → Chakra/TanStack
 * swap (controlled sort + controlled pagination contract, a11y semantics,
 * Column.render, empty/loading states). All renders go through
 * `renderWithChakra` because Chakra v3 components read the design-token system
 * from React context (a bare `render` throws a ContextError).
 *
 * Unchanged: the public TS API (TableProps, Column, PaginationProps) and the
 * external state contract — the parent still owns sort/pagination state and
 * passes already-sorted, already-paginated rows in `data`.
 *
 * Removed vs the old radix/cva suite: assertions on cva/Tailwind class strings.
 * Styling moved to Chakra style props (semantic tokens), so class assertions no
 * longer apply; visual regression is covered separately by the agent-browser
 * pass at the composite gallery.
 */

// ---- shared fixture ----

interface User {
  id: string
  name: string
  email: string
}

const columns: Column<User>[] = [
  { key: 'name', header: 'Name', sortable: true },
  { key: 'email', header: 'Email' },
]

const data: User[] = [
  { id: '1', name: 'Alice', email: 'alice@example.com' },
  { id: '2', name: 'Bob', email: 'bob@example.com' },
]

const keyExtractor = (row: User) => row.id

// ---- Test 1: sort state Context propagation ----

describe('Table', () => {
  describe('Test 1 — sort state Context propagation', () => {
    it('onSort callback updates parent state; TableHead receives sortColumn/sortDirection', () => {
      // Arrange
      const onSort = vi.fn()

      // Act
      const { getByRole } = render(
        <Table
          columns={columns}
          data={data}
          keyExtractor={keyExtractor}
          sortColumn="name"
          sortDirection="asc"
          onSort={onSort}
        />,
      )

      // Assert — a sortable column header exists and clicking it calls onSort
      const nameHeader = getByRole('columnheader', { name: /name/i })
      fireEvent.click(nameHeader)
      expect(onSort).toHaveBeenCalledWith('name')
    })
  })

  // ---- Test 2: caption a11y semantics ----

  describe('Test 2 — caption a11y semantics', () => {
    it('renders <caption> as first child of <table> for screen-reader accessibility', () => {
      // Arrange
      const captionText = 'List of users'

      // Act
      const { container } = render(
        <Table
          columns={columns}
          data={data}
          keyExtractor={keyExtractor}
          caption={captionText}
        />,
      )

      // Assert — <caption> element exists with the correct text
      const table = container.querySelector('table')
      expect(table).not.toBeNull()
      const caption = table?.querySelector('caption')
      expect(caption).not.toBeNull()
      expect(caption?.textContent).toBe(captionText)

      // <caption> must be the first child of <table>
      expect(table?.firstElementChild?.tagName.toLowerCase()).toBe('caption')
    })
  })

  // ---- Test 3: keyboard sort (Enter / Space) ----

  describe('Test 3 — keyboard sort (Enter/Space) + aria-sort', () => {
    it('pressing Enter on a sortable <th> calls onSort and the header has correct aria-sort', () => {
      // Arrange
      const onSort = vi.fn()

      const { getByRole } = render(
        <Table
          columns={columns}
          data={data}
          keyExtractor={keyExtractor}
          sortColumn="name"
          sortDirection="asc"
          onSort={onSort}
        />,
      )

      // Act — keyboard Enter on sortable header
      const nameHeader = getByRole('columnheader', { name: /name/i })
      fireEvent.keyDown(nameHeader, { key: 'Enter', code: 'Enter' })

      // Assert — onSort called + aria-sort attribute (WAI-ARIA uses "ascending"/"descending")
      expect(onSort).toHaveBeenCalledWith('name')
      expect(nameHeader.getAttribute('aria-sort')).toBe('ascending')
    })

    it('pressing Space on a sortable <th> calls onSort', () => {
      // Arrange
      const onSort = vi.fn()

      const { getByRole } = render(
        <Table
          columns={columns}
          data={data}
          keyExtractor={keyExtractor}
          sortColumn="name"
          sortDirection="desc"
          onSort={onSort}
        />,
      )

      // Act — keyboard Space on sortable header
      const nameHeader = getByRole('columnheader', { name: /name/i })
      fireEvent.keyDown(nameHeader, { key: ' ', code: 'Space' })

      // Assert
      expect(onSort).toHaveBeenCalledWith('name')
      // WAI-ARIA uses "descending" for aria-sort value even though our prop is "desc"
      expect(nameHeader.getAttribute('aria-sort')).toBe('descending')
    })
  })

  // ---- Test 4: empty state render ----

  describe('Test 4 — empty state render', () => {
    it('renders empty prop when data is empty, hides column headers, and sets colSpan to columns.length', () => {
      // Arrange
      const EmptyMessage = <p data-testid="empty-msg">No records found.</p>

      // Act
      const { getByTestId, queryByRole, container } = render(
        <Table
          columns={columns}
          data={[]}
          keyExtractor={keyExtractor}
          empty={EmptyMessage}
        />,
      )

      // Assert — empty node visible (M-4: toBeTruthy → toBeInTheDocument)
      expect(getByTestId('empty-msg')).toBeInTheDocument()

      // column headers should NOT be visible in the empty state
      expect(queryByRole('columnheader', { name: /name/i })).toBeNull()

      // colSpan check (M-4 strengthened): the single empty-state <td> must span all columns
      const td = container.querySelector('tbody td')
      expect(td).not.toBeNull()
      expect(td?.getAttribute('colspan')).toBe(String(columns.length))
    })
  })

  // ---- Test 5: pagination state lift ----

  describe('Test 5 — pagination state lift (fully controlled)', () => {
    it('pagination.onPageChange is called with correct page number on page change', () => {
      // Arrange
      const onPageChange = vi.fn()
      const pagination: PaginationProps = {
        current: 1,
        total: 30,
        pageSize: 10,
        onPageChange,
      }

      const { getByRole } = render(
        <Table
          columns={columns}
          data={data}
          keyExtractor={keyExtractor}
          pagination={pagination}
        />,
      )

      // Act — click the "Page 2" button (M-5: strict 'Page 2' match, no regex)
      const page2Button = getByRole('button', { name: 'Page 2' })
      fireEvent.click(page2Button)

      // Assert — callback received the correct page index
      expect(onPageChange).toHaveBeenCalledWith(2)
    })

    it('renders current page indicator reflecting pagination.current', () => {
      // Arrange
      const onPageChange = vi.fn()
      const pagination: PaginationProps = {
        current: 3,
        total: 50,
        pageSize: 10,
        onPageChange,
      }

      const { getByRole } = render(
        <Table
          columns={columns}
          data={data}
          keyExtractor={keyExtractor}
          pagination={pagination}
        />,
      )

      // Assert — current page button is marked aria-current="page" (M-5: strict 'Page 3')
      const currentPageBtn = getByRole('button', { name: 'Page 3' })
      expect(currentPageBtn.getAttribute('aria-current')).toBe('page')
    })
  })

  // ---- Tests 6, 7: (skipped) ----
  // These test numbers were allocated during the original Radix-era test suite
  // but the corresponding assertions were removed during the Chakra v3 migration
  // (they covered cva/Tailwind class strings that no longer apply). Test numbers
  // 6 and 7 are intentionally left vacant to preserve traceability. Functional
  // coverage for those areas (loading skeleton + focus-within highlight) is
  // carried by the Playwright E2E suite at e2e/components/composite/table.spec.ts.

  // ---- Test 8: loading aria-busy (H-1) ----

  describe('Test 8 — loading aria-busy attribute', () => {
    it('renders <table aria-busy="true"> when loading={true}', () => {
      // Arrange / Act
      const { container } = render(
        <Table
          columns={columns}
          data={data}
          keyExtractor={keyExtractor}
          loading={true}
        />,
      )

      // Assert
      const table = container.querySelector('table')
      expect(table).not.toBeNull()
      expect(table?.getAttribute('aria-busy')).toBe('true')
    })

    it('omits aria-busy when loading={false} (renders as null/undefined attribute)', () => {
      // Arrange / Act
      const { container } = render(
        <Table
          columns={columns}
          data={data}
          keyExtractor={keyExtractor}
          loading={false}
        />,
      )

      // Assert — `loading || undefined` evaluates to undefined → React omits the attribute
      const table = container.querySelector('table')
      expect(table).not.toBeNull()
      expect(table?.getAttribute('aria-busy')).toBeNull()
    })

    it('omits aria-busy when loading is undefined', () => {
      // Arrange / Act — loading prop not passed
      const { container } = render(
        <Table columns={columns} data={data} keyExtractor={keyExtractor} />,
      )

      // Assert
      const table = container.querySelector('table')
      expect(table).not.toBeNull()
      expect(table?.getAttribute('aria-busy')).toBeNull()
    })
  })

  // ---- Test 9: Column.render custom renderer (H-2) ----

  describe('Test 9 — Column.render custom renderer', () => {
    it('uses Column.render to produce cell content when provided', () => {
      // Arrange — render returns a styled <strong> wrapping the value
      const renderColumns: Column<User>[] = [
        {
          key: 'name',
          header: 'Name',
          render: (value, row) => (
            <strong data-testid={`rendered-${row.id}`}>{String(value)}</strong>
          ),
        },
        { key: 'email', header: 'Email' },
      ]

      // Act
      const { getByTestId } = render(
        <Table
          columns={renderColumns}
          data={data}
          keyExtractor={keyExtractor}
        />,
      )

      // Assert — render fn output present for each row
      const aliceCell = getByTestId('rendered-1')
      expect(aliceCell).toBeInTheDocument()
      expect(aliceCell.tagName.toLowerCase()).toBe('strong')
      expect(aliceCell.textContent).toBe('Alice')

      const bobCell = getByTestId('rendered-2')
      expect(bobCell).toBeInTheDocument()
      expect(bobCell.textContent).toBe('Bob')
    })
  })

  // ---- Test 10: <th scope="col"> (H-3) ----

  describe('Test 10 — <th scope="col"> for screen-reader header association', () => {
    it('every <th> in the table header row has scope="col"', () => {
      // Arrange / Act
      const { container } = render(
        <Table columns={columns} data={data} keyExtractor={keyExtractor} />,
      )

      // Assert
      const ths = container.querySelectorAll('thead th')
      expect(ths.length).toBe(columns.length)
      ths.forEach((th) => {
        expect(th.getAttribute('scope')).toBe('col')
      })
    })
  })

  // ---- Test 11: useTableContext throw outside <Table> (M-1) ----

  describe('Test 11 — useTableContext throws outside <Table>', () => {
    it('rendering TableHead without TableContext provider throws an error', () => {
      // Arrange — capture console.error noise from React when the boundary throws
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const col: Column<User> = { key: 'name', header: 'Name' }

      try {
        // Act + Assert — render must throw because useTableContext() guards against null
        expect(() =>
          render(
            <table>
              <thead>
                <tr>
                  <TableHead<User> column={col} />
                </tr>
              </thead>
            </table>,
          ),
        ).toThrow(/useTableContext must be used within <Table>/)
      } finally {
        errSpy.mockRestore()
      }
    })
  })

  // ---- Test 12: Column.width applies style (M-2) ----

  describe('Test 12 — Column.width applies inline style', () => {
    it('<th> has style.width === "200px" when Column.width is set, and no width when undefined', () => {
      // Arrange — first column has explicit width, second column has none
      const widthColumns: Column<User>[] = [
        { key: 'name', header: 'Name', width: '200px' },
        { key: 'email', header: 'Email' },
      ]

      // Act
      const { container } = render(
        <Table
          columns={widthColumns}
          data={data}
          keyExtractor={keyExtractor}
        />,
      )

      // Assert — width applied via inline style on first th
      const ths = container.querySelectorAll('thead th')
      expect(ths.length).toBe(2)
      const firstTh = ths[0] as HTMLTableCellElement
      expect(firstTh.style.width).toBe('200px')

      // Second column has no inline width
      const secondTh = ths[1] as HTMLTableCellElement
      expect(secondTh.style.width).toBe('')
    })
  })

  // ---- Test 13: sort direction transitions asc → desc (M-3) ----

  describe('Test 13 — sort direction state transition (asc → desc)', () => {
    it('aria-sort updates from "ascending" to "descending" when sortDirection prop changes', () => {
      // Arrange — initial render with asc
      const onSort = vi.fn()
      const { getByRole, rerender } = render(
        <Table
          columns={columns}
          data={data}
          keyExtractor={keyExtractor}
          sortColumn="name"
          sortDirection="asc"
          onSort={onSort}
        />,
      )

      const headerInitial = getByRole('columnheader', { name: /name/i })
      expect(headerInitial.getAttribute('aria-sort')).toBe('ascending')

      // Act — parent flips sortDirection to desc
      rerender(
        <Table
          columns={columns}
          data={data}
          keyExtractor={keyExtractor}
          sortColumn="name"
          sortDirection="desc"
          onSort={onSort}
        />,
      )

      // Assert — same header now reports descending
      const headerAfter = getByRole('columnheader', { name: /name/i })
      expect(headerAfter.getAttribute('aria-sort')).toBe('descending')
    })
  })
})
