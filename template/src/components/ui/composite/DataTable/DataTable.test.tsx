/**
 * DataTable unit tests — Phase 6 Batch 2 (Chakra v3 + TanStack Table).
 *
 * Behaviour-level coverage: render, sortable headers expose aria-sort, click
 * toggles sort state, empty state, loading state (aria-busy), and pagination
 * footer presence. Visual styling (token resolution, dark-mode borders) is
 * covered by the agent-browser visual pass at the composite gallery.
 *
 * Additional coverage (task-32 HIGH findings):
 *   HIGH-1: onSortingChange callback fires with updated SortingState on header click
 *   HIGH-2: sort changes actual row order in the rendered table
 *   HIGH-3: onPaginationChange callback fires on page button click
 *   HIGH-4: pagination page click changes the visible rows to the correct page slice
 */
import * as React from 'react'
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, it, expect, vi } from 'vitest'
import { renderWithChakra } from '@/test-utils'
import { DataTable } from './DataTable'
import type { ColumnDef, SortingState, PaginationState } from '@tanstack/react-table'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

interface User {
  id: string
  name: string
  email: string
}

const data: User[] = [
  { id: '1', name: 'Alice', email: 'alice@example.com' },
  { id: '2', name: 'Bob', email: 'bob@example.com' },
  { id: '3', name: 'Charlie', email: 'charlie@example.com' },
]

const columns: ColumnDef<User>[] = [
  {
    id: 'name',
    accessorKey: 'name',
    header: 'Name',
    enableSorting: true,
  },
  {
    id: 'email',
    accessorKey: 'email',
    header: 'Email',
    enableSorting: false,
  },
]

describe('DataTable — Test 1: renders rows', () => {
  it('renders one row per data item with the column values', () => {
    const { getByText } = renderWithChakra(
      <DataTable<User> data={data} columns={columns} pagination={false} />,
    )

    expect(getByText('Alice')).toBeTruthy()
    expect(getByText('Bob')).toBeTruthy()
    expect(getByText('Charlie')).toBeTruthy()
    expect(getByText('alice@example.com')).toBeTruthy()
  })
})

describe('DataTable — Test 2: sortable column headers', () => {
  it('exposes aria-sort on sortable header and toggles on click', () => {
    const { getByRole } = renderWithChakra(
      <DataTable<User> data={data} columns={columns} pagination={false} />,
    )

    const nameHeader = getByRole('columnheader', { name: /name/i })
    // default unsorted → "none"
    expect(nameHeader.getAttribute('aria-sort')).toBe('none')

    fireEvent.click(nameHeader)
    expect(nameHeader.getAttribute('aria-sort')).toBe('ascending')

    fireEvent.click(nameHeader)
    expect(nameHeader.getAttribute('aria-sort')).toBe('descending')
  })

  it('non-sortable header has no aria-sort attribute', () => {
    const { getByRole } = renderWithChakra(
      <DataTable<User> data={data} columns={columns} pagination={false} />,
    )

    const emailHeader = getByRole('columnheader', { name: /email/i })
    expect(emailHeader.hasAttribute('aria-sort')).toBe(false)
  })
})

describe('DataTable — Test 3: empty state', () => {
  it('renders provided empty node when data is empty', () => {
    const { getByText } = renderWithChakra(
      <DataTable<User>
        data={[]}
        columns={columns}
        empty={<span>No users to show</span>}
      />,
    )
    expect(getByText('No users to show')).toBeTruthy()
  })

  it('renders default empty text when no empty prop given', () => {
    const { getByText } = renderWithChakra(
      <DataTable<User> data={[]} columns={columns} />,
    )
    expect(getByText('No data')).toBeTruthy()
  })

  it('always renders thead with th[scope=col] even when data is empty (R-03)', () => {
    // Arrange
    const { container } = renderWithChakra(
      <DataTable<User> data={[]} columns={columns} />,
    )

    // Act
    const thead = container.querySelector('thead')
    const colHeaders = container.querySelectorAll('th[scope="col"]')

    // Assert — thead must be present, not absent
    expect(thead).not.toBeNull()
    // Two columns defined → two th[scope="col"] must be observable
    expect(colHeaders.length).toBe(2)
  })

  it('exposes aria-sort on sortable th even in empty state (R-03)', () => {
    // Arrange
    const { container } = renderWithChakra(
      <DataTable<User> data={[]} columns={columns} />,
    )

    // Act — "name" column has enableSorting: true
    const sortableHeader = container.querySelector('th[aria-sort]')

    // Assert
    expect(sortableHeader).not.toBeNull()
    expect(sortableHeader?.getAttribute('aria-sort')).toBe('none')
  })
})

describe('DataTable — Test 4: loading state', () => {
  it('sets aria-busy on the table when loading', () => {
    const { getByRole } = renderWithChakra(
      <DataTable<User>
        data={data}
        columns={columns}
        loading
        pagination={false}
      />,
    )
    const table = getByRole('table')
    expect(table.getAttribute('aria-busy')).toBe('true')
  })
})

describe('DataTable — Test 5: pagination', () => {
  it('renders pagination footer when data > pageSize', () => {
    const many: User[] = Array.from({ length: 25 }, (_, i) => ({
      id: String(i),
      name: `User${i}`,
      email: `u${i}@example.com`,
    }))
    const { getByLabelText } = renderWithChakra(
      <DataTable<User>
        data={many}
        columns={columns}
        initialPagination={{ pageSize: 10 }}
      />,
    )
    // 25 rows / 10 page-size = 3 pages
    expect(getByLabelText('Page 1')).toBeTruthy()
    expect(getByLabelText('Page 2')).toBeTruthy()
    expect(getByLabelText('Page 3')).toBeTruthy()
  })

  it('omits pagination footer when pagination prop is false', () => {
    const { queryByLabelText } = renderWithChakra(
      <DataTable<User> data={data} columns={columns} pagination={false} />,
    )
    expect(queryByLabelText('Pagination')).toBeNull()
  })
})

describe('DataTable — Test 6: caption', () => {
  it('renders <caption> when caption prop is provided', () => {
    const { container } = renderWithChakra(
      <DataTable<User>
        data={data}
        columns={columns}
        caption="User list"
        pagination={false}
      />,
    )
    const caption = container.querySelector('caption')
    expect(caption).not.toBeNull()
    expect(caption?.textContent).toContain('User list')
  })
})

// ── HIGH-1: onSortingChange callback ──────────────────────────────────────────

describe('DataTable — Test 7: onSortingChange callback', () => {
  /**
   * DataTable calls onSortingChange via useEffect([sorting]).
   * The effect fires once on mount with initialSorting=[], then again after
   * a sort header click with the new SortingState. We use mockClear() between
   * mount and interaction to assert only the post-click invocation.
   */
  it('calls onSortingChange with ascending state after first sort click', () => {
    const onSortingChange = vi.fn<(sorting: SortingState) => void>()

    renderWithChakra(
      <DataTable<User>
        data={data}
        columns={columns}
        pagination={false}
        onSortingChange={onSortingChange}
      />,
    )

    // Clear the initial mount call (useEffect fires with initialSorting=[])
    onSortingChange.mockClear()

    const nameHeader = screen.getByRole('columnheader', { name: /name/i })
    fireEvent.click(nameHeader)

    expect(onSortingChange).toHaveBeenCalledOnce()
    const calledWith = onSortingChange.mock.calls[0][0]
    expect(calledWith).toEqual([{ id: 'name', desc: false }])
  })

  it('calls onSortingChange with descending state after second sort click', () => {
    const onSortingChange = vi.fn<(sorting: SortingState) => void>()

    renderWithChakra(
      <DataTable<User>
        data={data}
        columns={columns}
        pagination={false}
        onSortingChange={onSortingChange}
      />,
    )

    const nameHeader = screen.getByRole('columnheader', { name: /name/i })
    fireEvent.click(nameHeader) // asc
    onSortingChange.mockClear()
    fireEvent.click(nameHeader) // desc

    expect(onSortingChange).toHaveBeenCalledOnce()
    const calledWith = onSortingChange.mock.calls[0][0]
    expect(calledWith).toEqual([{ id: 'name', desc: true }])
  })
})

// ── HIGH-2: sort changes rendered row order ───────────────────────────────────

describe('DataTable — Test 8: sort changes row order in rendered table', () => {
  it('renders rows in ascending alphabetical order after clicking Name header once', () => {
    const unsortedData: User[] = [
      { id: '3', name: 'Charlie', email: 'charlie@example.com' },
      { id: '1', name: 'Alice', email: 'alice@example.com' },
      { id: '2', name: 'Bob', email: 'bob@example.com' },
    ]

    const { container } = renderWithChakra(
      <DataTable<User> data={unsortedData} columns={columns} pagination={false} />,
    )

    const nameHeader = screen.getByRole('columnheader', { name: /name/i })
    fireEvent.click(nameHeader) // sort ascending

    const cells = Array.from(container.querySelectorAll('tbody td:first-child')).map(
      (td) => td.textContent,
    )
    expect(cells).toEqual(['Alice', 'Bob', 'Charlie'])
  })

  it('renders rows in descending alphabetical order after clicking Name header twice', () => {
    const unsortedData: User[] = [
      { id: '1', name: 'Alice', email: 'alice@example.com' },
      { id: '2', name: 'Bob', email: 'bob@example.com' },
      { id: '3', name: 'Charlie', email: 'charlie@example.com' },
    ]

    const { container } = renderWithChakra(
      <DataTable<User> data={unsortedData} columns={columns} pagination={false} />,
    )

    const nameHeader = screen.getByRole('columnheader', { name: /name/i })
    fireEvent.click(nameHeader) // asc
    fireEvent.click(nameHeader) // desc

    const cells = Array.from(container.querySelectorAll('tbody td:first-child')).map(
      (td) => td.textContent,
    )
    expect(cells).toEqual(['Charlie', 'Bob', 'Alice'])
  })
})

// ── HIGH-3: onPaginationChange callback ──────────────────────────────────────

describe('DataTable — Test 9: onPaginationChange callback', () => {
  const manyUsers: User[] = Array.from({ length: 25 }, (_, i) => ({
    id: String(i),
    name: `User${i}`,
    email: `u${i}@example.com`,
  }))

  it('calls onPaginationChange with updated pageIndex when a page button is clicked', () => {
    const onPaginationChange = vi.fn<(pagination: PaginationState) => void>()

    renderWithChakra(
      <DataTable<User>
        data={manyUsers}
        columns={columns}
        initialPagination={{ pageSize: 10 }}
        onPaginationChange={onPaginationChange}
      />,
    )

    // Clear the mount-time call (useEffect fires with { pageIndex:0, pageSize:10 })
    onPaginationChange.mockClear()

    const page2Btn = screen.getByRole('button', { name: 'Page 2' })
    fireEvent.click(page2Btn)

    expect(onPaginationChange).toHaveBeenCalledOnce()
    const calledWith = onPaginationChange.mock.calls[0][0]
    expect(calledWith).toEqual({ pageIndex: 1, pageSize: 10 })
  })
})

// ── HIGH-4: pagination page click shows correct rows ─────────────────────────

describe('DataTable — Test 10: pagination page click shows correct row slice', () => {
  it('shows rows 10-19 on page 2 with pageSize=10 and 25 total rows', () => {
    const manyUsers: User[] = Array.from({ length: 25 }, (_, i) => ({
      id: String(i),
      name: `User${i}`,
      email: `u${i}@example.com`,
    }))

    const { container } = renderWithChakra(
      <DataTable<User>
        data={manyUsers}
        columns={columns}
        initialPagination={{ pageSize: 10 }}
      />,
    )

    const page2Btn = screen.getByRole('button', { name: 'Page 2' })
    fireEvent.click(page2Btn)

    const nameCell = Array.from(container.querySelectorAll('tbody td:first-child')).map(
      (td) => td.textContent,
    )
    // Page 2 = rows index 10..19
    expect(nameCell).toEqual(
      Array.from({ length: 10 }, (_, i) => `User${i + 10}`),
    )
  })

  it('shows the last partial page (rows 20-24) on page 3 with pageSize=10', () => {
    const manyUsers: User[] = Array.from({ length: 25 }, (_, i) => ({
      id: String(i),
      name: `User${i}`,
      email: `u${i}@example.com`,
    }))

    const { container } = renderWithChakra(
      <DataTable<User>
        data={manyUsers}
        columns={columns}
        initialPagination={{ pageSize: 10 }}
      />,
    )

    const page3Btn = screen.getByRole('button', { name: 'Page 3' })
    fireEvent.click(page3Btn)

    const nameCell = Array.from(container.querySelectorAll('tbody td:first-child')).map(
      (td) => td.textContent,
    )
    // Page 3 = rows index 20..24 (5 rows)
    expect(nameCell).toEqual(
      Array.from({ length: 5 }, (_, i) => `User${i + 20}`),
    )
  })
})
