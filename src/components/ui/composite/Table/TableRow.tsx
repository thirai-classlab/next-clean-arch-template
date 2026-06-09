/**
 * TableRow — Chakra UI v3 (Phase 3 composite migration, Batch 3)
 *
 * Re-implemented on top of Chakra v3 `Table.Row` (was a raw <tr> + cva-style
 * className list). The exported `TableRow` / `TableRowProps` API
 * (children / data-testid / onClick / selected) is preserved verbatim.
 *
 * Recipe convention (see composite/Tabs.tsx + theme/system.ts):
 *   - Render Chakra Table.Row, no raw HTML, no cva/className lists.
 *   - interactive (onClick) + selected map to style props using semantic
 *     tokens (bg.sunken) — no hardcoded oklch/hex.
 *   - aria-selected is kept on selected rows for assistive tech.
 */
'use client'

import * as React from 'react'
import { Table as ChakraTable } from '@chakra-ui/react'

export interface TableRowProps {
  children: React.ReactNode
  'data-testid'?: string
  onClick?: () => void
  selected?: boolean
}

export function TableRow({
  children,
  'data-testid': dataTestid,
  onClick,
  selected,
}: TableRowProps): React.ReactElement {
  const isInteractive = typeof onClick === 'function'

  return (
    <ChakraTable.Row
      data-testid={dataTestid}
      aria-selected={selected || undefined}
      onClick={onClick}
      transition="background-color {durations.fast}"
      bg={selected ? 'bg.sunken' : undefined}
      cursor={isInteractive ? 'pointer' : undefined}
      _hover={isInteractive ? { bg: 'bg.sunken' } : undefined}
    >
      {children}
    </ChakraTable.Row>
  )
}

TableRow.displayName = 'TableRow'
