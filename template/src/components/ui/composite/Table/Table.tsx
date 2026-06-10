/**
 * Table — Chakra UI v3 + TanStack Table (Phase 3 composite migration, Batch 3)
 *
 * Re-implemented on top of Chakra v3 `Table.*` compound parts (was a raw
 * <table>/<thead>/<tbody> + cva-style className lists) with the row / header
 * model driven by TanStack Table (`@tanstack/react-table`). The exported
 * TypeScript API (TableProps, Column, PaginationProps, TableContext,
 * useTableContext, and the `Table` named export) is kept identical so every
 * consumer (admin tables, dev/composite gallery) compiles unchanged.
 *
 * Controlled-component contract (unchanged from the radix/cva version):
 *   - Sort is fully controlled: the parent owns sortColumn/sortDirection and is
 *     notified via onSort(column.key). The Table never re-sorts `data`.
 *   - Pagination is fully controlled: the parent passes already-paginated rows
 *     in `data` and owns the current page; the Table only emits onPageChange.
 *   Therefore TanStack runs in `manualSorting` + `manualPagination` mode — it
 *   models columns/rows/headers and renders them; it does not mutate `data`.
 *
 * Recipe convention (see composite/Tabs.tsx + theme/system.ts):
 *   1. Render Chakra Table parts — no raw HTML, no radix.
 *   2. Style props reference semantic tokens (fg.muted, border.default,
 *      accent.default, …) — no cva/className, no hardcoded oklch/hex.
 *   3. a11y (scope="col", aria-sort, aria-busy, <caption>) is preserved.
 *   4. Interactive → 'use client'.
 */
'use client'

import * as React from 'react'
import { Table as ChakraTable, Box, Button as ChakraButton } from '@chakra-ui/react'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table'
import { TableHead } from './TableHead'
import { TableRow } from './TableRow'
import { TableCell } from './TableCell'

// ---- Column / Pagination / Table types ----

export interface Column<T> {
  key: keyof T
  header: string
  sortable?: boolean
  width?: string
  render?: (value: T[keyof T], row: T) => React.ReactNode
  align?: 'left' | 'center' | 'right'
}

export interface PaginationProps {
  current: number
  total: number
  pageSize: number
  onPageChange: (page: number) => void
}

export interface TableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyExtractor: (row: T) => string
  sortColumn?: keyof T
  sortDirection?: 'asc' | 'desc'
  onSort?: (column: keyof T) => void
  pagination?: PaginationProps
  empty?: React.ReactNode
  loading?: boolean
  caption?: string
  /** Optional function to derive data-testid for each tbody row. */
  getRowTestId?: (row: T, index: number) => string
}

// ---- Context ----

export interface TableContextValue<T = unknown> {
  columns: Column<T>[]
  sortColumn?: keyof T
  sortDirection?: 'asc' | 'desc'
  onSort?: (column: keyof T) => void
}

export const TableContext = React.createContext<TableContextValue<unknown> | null>(null)

export function useTableContext<T = unknown>(): TableContextValue<T> {
  const ctx = React.useContext(TableContext)
  if (!ctx) throw new Error('useTableContext must be used within <Table>')
  return ctx as TableContextValue<T>
}

// ---- Pagination subcomponent (internal) ----

interface PaginationNavProps {
  pageCount: number
  current: number
  onPageChange: (page: number) => void
}

function PaginationNav({ pageCount, current, onPageChange }: PaginationNavProps): React.ReactElement {
  // Render every page button so screen readers and tests can find each by name.
  // For very large tables a windowed pagination strategy would be preferred,
  // but the contract (Test 5) expects an aria-current="page" button labeled
  // "Page N" for every page.
  const pages = React.useMemo(
    () => Array.from({ length: pageCount }, (_, index) => index + 1),
    [pageCount],
  )

  return (
    <Box
      as="nav"
      aria-label="Pagination"
      mt="3"
      display="flex"
      alignItems="center"
      justifyContent="flex-end"
      gap="1"
    >
      {pages.map((page) => {
        const isCurrent = page === current
        return (
          <ChakraButton
            key={page}
            type="button"
            aria-label={`Page ${page}`}
            aria-current={isCurrent ? 'page' : undefined}
            onClick={() => onPageChange(page)}
            h="8"
            minW="8"
            px="2"
            borderRadius="sm"
            fontSize="sm"
            fontWeight="regular"
            transition="background-color {durations.fast}, color {durations.fast}"
            bg={isCurrent ? 'accent.default' : 'transparent'}
            color={isCurrent ? 'white' : 'fg.default'}
            _hover={isCurrent ? undefined : { bg: 'bg.sunken' }}
          >
            {page}
          </ChakraButton>
        )
      })}
    </Box>
  )
}

// ---- Table root ----

export function Table<T>({
  columns,
  data,
  keyExtractor,
  sortColumn,
  sortDirection,
  onSort,
  pagination,
  empty,
  loading,
  caption,
  getRowTestId,
}: TableProps<T>): React.ReactElement {
  const isEmpty = data.length === 0

  // Build a stable Context value (re-created only when sort/columns change).
  // TableHead reads sort state from here, keeping the controlled sort contract.
  const ctxValue = React.useMemo<TableContextValue<T>>(
    () => ({ columns, sortColumn, sortDirection, onSort }),
    [columns, sortColumn, sortDirection, onSort],
  )

  // Map our Column<T>[] to TanStack ColumnDef<T>[]. We use the row object as the
  // accessor (id = column.key) and resolve the rendered value in `cell` so that
  // Column.render is honoured exactly as before. TanStack runs in manual mode,
  // so it never re-orders or paginates `data` — it only models headers/rows.
  const tanstackColumns = React.useMemo<ColumnDef<T>[]>(
    () =>
      columns.map((column) => ({
        id: String(column.key),
        accessorFn: (row: T) => row[column.key],
        header: column.header,
        enableSorting: Boolean(column.sortable),
        cell: (info) => {
          const row = info.row.original
          const value = row[column.key]
          return column.render ? column.render(value, row) : (value as React.ReactNode)
        },
      })),
    [columns],
  )

  const table = useReactTable<T>({
    data,
    columns: tanstackColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: keyExtractor,
    manualSorting: true,
    manualPagination: true,
    // Reflect the externally-controlled sort state into TanStack's model.
    state: {
      sorting: sortColumn
        ? [{ id: String(sortColumn), desc: sortDirection === 'desc' }]
        : [],
    },
  })

  const pageCount = pagination
    ? Math.max(1, Math.ceil(pagination.total / pagination.pageSize))
    : 0

  return (
    <TableContext.Provider value={ctxValue as TableContextValue<unknown>}>
      <Box w="full">
        <ChakraTable.ScrollArea>
          <ChakraTable.Root
            variant="line"
            size="sm"
            width="full"
            textAlign="start"
            aria-busy={loading || undefined}
          >
            {caption ? (
              <ChakraTable.Caption captionSide="top" pb="2" fontSize="sm" color="fg.muted">
                {caption}
              </ChakraTable.Caption>
            ) : null}
            {isEmpty ? (
              // In the empty state we intentionally omit the column headers
              // so screen readers focus on the empty-state message.
              <ChakraTable.Body>
                <ChakraTable.Row>
                  <ChakraTable.Cell colSpan={columns.length || 1} borderColor="border.default">
                    {empty}
                  </ChakraTable.Cell>
                </ChakraTable.Row>
              </ChakraTable.Body>
            ) : (
              <>
                <ChakraTable.Header>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <ChakraTable.Row key={headerGroup.id}>
                      {headerGroup.headers.map((header) => {
                        const column = columns.find((col) => String(col.key) === header.column.id)
                        // column is always found: tanstackColumns is derived 1:1 from columns.
                        return column ? (
                          <TableHead<T> key={header.id} column={column} />
                        ) : null
                      })}
                    </ChakraTable.Row>
                  ))}
                </ChakraTable.Header>
                <ChakraTable.Body>
                  {table.getRowModel().rows.map((row, rowIndex) => (
                    <TableRow
                      key={row.id}
                      data-testid={getRowTestId ? getRowTestId(row.original, rowIndex) : undefined}
                    >
                      {row.getVisibleCells().map((cell) => {
                        const column = columns.find((col) => String(col.key) === cell.column.id)
                        return (
                          <TableCell key={cell.id} align={column?.align}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  ))}
                </ChakraTable.Body>
              </>
            )}
          </ChakraTable.Root>
        </ChakraTable.ScrollArea>
        {pagination ? (
          <PaginationNav
            pageCount={pageCount}
            current={pagination.current}
            onPageChange={pagination.onPageChange}
          />
        ) : null}
      </Box>
    </TableContext.Provider>
  )
}

Table.displayName = 'Table'
