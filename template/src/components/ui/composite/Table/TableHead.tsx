/**
 * TableHead — Chakra UI v3 (Phase 3 composite migration, Batch 3)
 *
 * Re-implemented on top of Chakra v3 `Table.ColumnHeader` (was a raw <th> +
 * cva-style className list). The exported `TableHead` / `TableHeadProps` API is
 * preserved verbatim, and it still reads sort state from `TableContext` (so
 * `useTableContext` throws when rendered outside `<Table>`).
 *
 * Sort interaction contract (kept identical to the radix/cva version):
 *   - sortable headers are focusable (tabIndex 0), clickable, and respond to
 *     Enter / Space, calling `onSort(column.key)`.
 *   - aria-sort reports WAI-ARIA values: ascending / descending / none.
 *
 * Recipe convention: Chakra Table.ColumnHeader + style props on semantic
 * tokens (fg.muted, fg.default, border.default) — no cva/className, no
 * hardcoded oklch/hex.
 *
 * Border note: the `variant="line"` recipe sets `borderBottomWidth: 1px` on
 * the header but leaves the color to Chakra's default `border` token (which
 * renders as raw rgb(228,228,231)). We pin `borderColor="border.default"` so
 * the rail matches the Linear token used by Tabs (oklch(88% 0 0)). Only the
 * color is overridden; the recipe's border width / position are untouched.
 */
'use client'

import * as React from 'react'
import { Table as ChakraTable } from '@chakra-ui/react'
import { useTableContext, type Column } from './Table'

export interface TableHeadProps<T> {
  column: Column<T>
}

type AriaSort = 'ascending' | 'descending' | 'none'

function ariaSortFor<T>(
  column: Column<T>,
  sortColumn: keyof T | undefined,
  sortDirection: 'asc' | 'desc' | undefined,
): AriaSort | undefined {
  if (!column.sortable) return undefined
  if (sortColumn !== column.key) return 'none'
  return sortDirection === 'desc' ? 'descending' : 'ascending'
}

const ALIGN_TO_TEXT_ALIGN: Record<'left' | 'center' | 'right', 'start' | 'center' | 'end'> = {
  left: 'start',
  center: 'center',
  right: 'end',
}

export function TableHead<T>({ column }: TableHeadProps<T>): React.ReactElement {
  const { sortColumn, sortDirection, onSort } = useTableContext<T>()

  const isSortable = Boolean(column.sortable && onSort)
  const ariaSort = ariaSortFor<T>(column, sortColumn, sortDirection)

  const handleClick = () => {
    if (isSortable) onSort?.(column.key)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTableCellElement>) => {
    if (!isSortable) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSort?.(column.key)
    }
  }

  const textAlign = ALIGN_TO_TEXT_ALIGN[column.align ?? 'left']

  return (
    <ChakraTable.ColumnHeader
      scope="col"
      aria-sort={ariaSort}
      tabIndex={isSortable ? 0 : undefined}
      onClick={isSortable ? handleClick : undefined}
      onKeyDown={isSortable ? handleKeyDown : undefined}
      // Per-column pixel width is a one-off layout value (not a design token),
      // kept as an inline style so it lands on `th.style.width` exactly as the
      // pre-migration component did (Column.width contract).
      style={column.width ? { width: column.width } : undefined}
      textAlign={textAlign}
      borderColor="border.default"
      px="3"
      py="2"
      fontSize="xs"
      fontWeight="semibold"
      color="fg.muted"
      textTransform="uppercase"
      letterSpacing="wide"
      cursor={isSortable ? 'pointer' : undefined}
      userSelect={isSortable ? 'none' : undefined}
      _hover={isSortable ? { color: 'fg.default' } : undefined}
    >
      {column.header}
    </ChakraTable.ColumnHeader>
  )
}

TableHead.displayName = 'TableHead'
