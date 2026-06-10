/**
 * TableCell — Chakra UI v3 (Phase 3 composite migration, Batch 3)
 *
 * Re-implemented on top of Chakra v3 `Table.Cell` / `Table.ColumnHeader`
 * (was a raw <td>/<th> + cva-style className list). The exported
 * `TableCell` / `TableCellProps` API (align / header / truncate / children)
 * is preserved verbatim so every consumer compiles unchanged.
 *
 * Recipe convention (see composite/Tabs.tsx + theme/system.ts):
 *   - Render Chakra Table parts, no raw HTML, no cva/className lists.
 *   - align / truncate map to style props (textAlign, truncate) using
 *     semantic tokens (fg.default) — no hardcoded oklch/hex.
 *
 * Border note: the `variant="line"` recipe sets `borderBottomWidth: 1px` on
 * cells / column headers but leaves the color to Chakra's default `border`
 * token (raw rgb(228,228,231)). We pin `borderColor="border.default"` so row
 * separators match the Linear token (oklch(88% 0 0)). Only the color is
 * overridden; the recipe's border width / position are untouched.
 */
'use client'

import * as React from 'react'
import { Table as ChakraTable } from '@chakra-ui/react'

export interface TableCellProps {
  children?: React.ReactNode
  align?: 'left' | 'center' | 'right'
  header?: boolean
  truncate?: boolean
}

const ALIGN_TO_TEXT_ALIGN: Record<NonNullable<TableCellProps['align']>, 'start' | 'center' | 'end'> = {
  left: 'start',
  center: 'center',
  right: 'end',
}

export function TableCell({
  children,
  align = 'left',
  header = false,
  truncate = false,
}: TableCellProps): React.ReactElement {
  const textAlign = ALIGN_TO_TEXT_ALIGN[align]

  // Shared style props for cell / header (semantic tokens, no hardcoded colors).
  const shared = {
    px: '3',
    py: '2',
    fontSize: 'sm',
    textAlign,
    borderColor: 'border.default',
    ...(truncate
      ? { truncate: true as const, maxW: '0' }
      : {}),
  }

  if (header) {
    return (
      <ChakraTable.ColumnHeader scope="col" color="fg.default" {...shared}>
        {children}
      </ChakraTable.ColumnHeader>
    )
  }
  return (
    <ChakraTable.Cell color="fg.default" {...shared}>
      {children}
    </ChakraTable.Cell>
  )
}

TableCell.displayName = 'TableCell'
