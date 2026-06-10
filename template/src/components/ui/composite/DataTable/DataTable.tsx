/**
 * DataTable — Chakra UI v3 + TanStack Table (Phase 6 Batch 2 baseline)
 *
 * A generic, uncontrolled-by-default data table built on Chakra v3
 * `Table.*` compound parts and `@tanstack/react-table`. Designed for admin
 * surfaces (task-5 admin UI and forward) where the caller passes an
 * already-shaped dataset and column definitions and gets sort + pagination +
 * loading + empty handling "for free".
 *
 * Key differences vs `composite/Table/Table.tsx` (P3 composite, controlled):
 *   - Table.tsx is FULLY controlled: parent owns sortColumn/sortDirection,
 *     parent slices `data` per page, parent owns `pagination.current`.
 *   - DataTable is UNCONTROLLED by default: TanStack manages sorting and
 *     pagination internally (`getSortedRowModel` + `getPaginationRowModel`).
 *     Initial state and (optional) `onStateChange` give the caller visibility
 *     without forcing it to own state.
 *
 * Recipe convention (matches Alert.tsx / Modal.tsx / Table.tsx):
 *   1. Render Chakra Table parts — no raw HTML, no cva.
 *   2. Style props reference semantic tokens (fg.muted, border.default,
 *      accent.default, bg.sunken, …) — no oklch/hex hardcode.
 *   3. a11y: scope="col" via Chakra `ColumnHeader`, aria-sort on sortable
 *      headers, aria-busy on the root when `loading`, aria-label on
 *      pagination nav, aria-current="page" on the active page button.
 *   4. Interactive → 'use client'.
 *
 * The exported API is intentionally minimal — sort/pagination prop bags are
 * optional and default to sensible behaviour. For a fully controlled table
 * (server-side data, manual sort/page), consumers should reach for
 * `composite/Table/Table.tsx` directly.
 */
'use client'

import * as React from 'react'
import {
  Table as ChakraTable,
  Box,
  Button as ChakraButton,
  Spinner,
} from '@chakra-ui/react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type PaginationState,
} from '@tanstack/react-table'
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────────────────────────────────────

export interface DataTableProps<TData> {
  /** Already-shaped row data. */
  data: TData[]
  /** TanStack `ColumnDef<TData>` array — see TanStack docs. */
  columns: ColumnDef<TData, unknown>[]
  /** Optional initial sort state (uncontrolled). */
  initialSorting?: SortingState
  /** Optional initial pagination state (uncontrolled). Default page size: 10. */
  initialPagination?: Partial<PaginationState>
  /** When true, show a spinner overlay and set aria-busy. */
  loading?: boolean
  /** Rendered inside a single full-span cell when `data.length === 0`. */
  empty?: React.ReactNode
  /** Optional caption rendered above the table (for screen readers + sighted users). */
  caption?: string
  /**
   * If false, hide the pagination footer (still applies row windowing).
   * Default true. Pass false when you know all rows fit on one page.
   */
  pagination?: boolean
  /** Fired when the sort state changes — useful for analytics/persistence. */
  onSortingChange?: (sorting: SortingState) => void
  /** Fired when the pagination state changes — useful for analytics/persistence. */
  onPaginationChange?: (pagination: PaginationState) => void
  /** Optional function to derive data-testid for each tbody row. */
  getRowTestId?: (row: TData, index: number) => string
}

// ─────────────────────────────────────────────────────────────────────────────
// Pagination footer (internal)
// ─────────────────────────────────────────────────────────────────────────────

interface PaginationNavProps {
  pageCount: number
  pageIndex: number
  onPageChange: (pageIndex: number) => void
}

function PaginationNav({
  pageCount,
  pageIndex,
  onPageChange,
}: PaginationNavProps): React.ReactElement | null {
  // Hooks must run unconditionally (react-hooks/rules-of-hooks): compute the page
  // list first, then short-circuit the render for single-page tables.
  const pages = React.useMemo(
    () => Array.from({ length: pageCount }, (_, i) => i),
    [pageCount],
  )

  if (pageCount <= 1) return null

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
      {pages.map((idx) => {
        const isCurrent = idx === pageIndex
        return (
          <ChakraButton
            key={idx}
            type="button"
            aria-label={`Page ${idx + 1}`}
            aria-current={isCurrent ? 'page' : undefined}
            onClick={() => onPageChange(idx)}
            h="8"
            minW="8"
            px="2"
            borderRadius="sm"
            fontSize="sm"
            fontWeight="regular"
            bg={isCurrent ? 'accent.default' : 'transparent'}
            color={isCurrent ? 'white' : 'fg.default'}
            _hover={isCurrent ? undefined : { bg: 'bg.sunken' }}
          >
            {idx + 1}
          </ChakraButton>
        )
      })}
    </Box>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// DataTable root
// ─────────────────────────────────────────────────────────────────────────────

export function DataTable<TData>({
  data,
  columns,
  initialSorting = [],
  initialPagination,
  loading = false,
  empty,
  caption,
  pagination = true,
  onSortingChange,
  onPaginationChange,
  getRowTestId,
}: DataTableProps<TData>): React.ReactElement {
  const [sorting, setSorting] = React.useState<SortingState>(initialSorting)
  const [paginationState, setPaginationState] = React.useState<PaginationState>(
    {
      pageIndex: initialPagination?.pageIndex ?? 0,
      pageSize: initialPagination?.pageSize ?? 10,
    },
  )

  // Notify caller on state changes (without taking ownership away).
  React.useEffect(() => {
    onSortingChange?.(sorting)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sorting])
  React.useEffect(() => {
    onPaginationChange?.(paginationState)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginationState])

  const table = useReactTable<TData>({
    data,
    columns,
    state: { sorting, pagination: paginationState },
    onSortingChange: setSorting,
    onPaginationChange: setPaginationState,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: pagination ? getPaginationRowModel() : undefined,
  })

  const isEmpty = data.length === 0
  const colCount = columns.length || 1

  return (
    <Box w="full" position="relative">
      {loading ? (
        <Box
          position="absolute"
          inset="0"
          display="flex"
          alignItems="center"
          justifyContent="center"
          bg="bg.overlay"
          zIndex="1"
          borderRadius="md"
        >
          <Spinner size="md" color="accent.default" />
        </Box>
      ) : null}

      <ChakraTable.ScrollArea>
        <ChakraTable.Root
          variant="line"
          size="sm"
          width="full"
          textAlign="start"
          aria-busy={loading || undefined}
        >
          {caption ? (
            <ChakraTable.Caption
              captionSide="top"
              pb="2"
              fontSize="sm"
              color="fg.muted"
            >
              {caption}
            </ChakraTable.Caption>
          ) : null}

          <ChakraTable.Header>
            {table.getHeaderGroups().map((headerGroup) => (
              <ChakraTable.Row key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort()
                  const sortDir = header.column.getIsSorted()
                  const ariaSort: 'ascending' | 'descending' | 'none' =
                    sortDir === 'asc'
                      ? 'ascending'
                      : sortDir === 'desc'
                        ? 'descending'
                        : 'none'

                  return (
                    <ChakraTable.ColumnHeader
                      key={header.id}
                      scope="col"
                      aria-sort={canSort ? ariaSort : undefined}
                      borderColor="border.default"
                      color="fg.muted"
                      fontWeight="semibold"
                      fontSize="xs"
                      textTransform="uppercase"
                      letterSpacing="wider"
                      cursor={canSort ? 'pointer' : 'default'}
                      userSelect="none"
                      _hover={canSort ? { color: 'fg.default' } : undefined}
                      onClick={
                        canSort
                          ? header.column.getToggleSortingHandler()
                          : undefined
                      }
                    >
                      <Box display="inline-flex" alignItems="center" gap="1">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        {canSort ? (
                          sortDir === 'asc' ? (
                            <ChevronUp size={14} aria-hidden="true" />
                          ) : sortDir === 'desc' ? (
                            <ChevronDown size={14} aria-hidden="true" />
                          ) : (
                            <ChevronsUpDown
                              size={14}
                              aria-hidden="true"
                              style={{ opacity: 0.4 }}
                            />
                          )
                        ) : null}
                      </Box>
                    </ChakraTable.ColumnHeader>
                  )
                })}
              </ChakraTable.Row>
            ))}
          </ChakraTable.Header>

          <ChakraTable.Body>
            {isEmpty ? (
              <ChakraTable.Row>
                <ChakraTable.Cell
                  colSpan={colCount}
                  borderColor="border.default"
                  textAlign="center"
                  py="8"
                  color="fg.muted"
                >
                  {empty ?? 'No data'}
                </ChakraTable.Cell>
              </ChakraTable.Row>
            ) : (
              table.getRowModel().rows.map((row, rowIndex) => (
                <ChakraTable.Row
                  key={row.id}
                  {...(getRowTestId
                    ? { 'data-testid': getRowTestId(row.original, rowIndex) }
                    : {})}
                >
                  {row.getVisibleCells().map((cell) => (
                    <ChakraTable.Cell
                      key={cell.id}
                      borderColor="border.default"
                      color="fg.default"
                      fontSize="sm"
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </ChakraTable.Cell>
                  ))}
                </ChakraTable.Row>
              ))
            )}
          </ChakraTable.Body>
        </ChakraTable.Root>
      </ChakraTable.ScrollArea>

      {pagination ? (
        <PaginationNav
          pageCount={table.getPageCount()}
          pageIndex={paginationState.pageIndex}
          onPageChange={(idx) =>
            setPaginationState((prev) => ({ ...prev, pageIndex: idx }))
          }
        />
      ) : null}
    </Box>
  )
}

DataTable.displayName = 'DataTable'
