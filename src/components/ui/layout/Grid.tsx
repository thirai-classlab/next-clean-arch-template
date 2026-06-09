/**
 * Grid — Chakra UI v3 (Phase 4 layout migration, Batch 3)
 *
 * Re-implemented on top of Chakra v3 `Grid` (was a hand-rolled `display:grid`
 * div with inline `style` + cn() tailwind). The exported TypeScript API
 * (GridProps: cols/gap/responsive/as/className) is kept identical so every
 * consumer compiles unchanged.
 *
 * Recipe convention (see Stack.tsx + theme/system.ts):
 *   1. Use Chakra `Grid` as the rendering base; drive tracks via the
 *      `templateColumns` style prop (no inline style object).
 *   2. Numeric px gap (4/8/16…) maps to Chakra spacing token KEYS from system.ts.
 *   3. `responsive=true` (default) → auto-fill minmax so tracks collapse without
 *      overflow on narrow viewports; `responsive=false` → fixed `cols` tracks.
 *   4. `data-cols` / `data-responsive` preserved verbatim for tests + CSS hooks.
 *   5. 'use client' is required: Chakra v3 factory components read the styling
 *      system from React context, so they must run as client components when
 *      rendered directly inside a Server Component page (e.g. admin/dashboard).
 *      Without it, Next.js 14 RSC page-data collection fails with
 *      `createProxy is not a function`.
 *
 * For non-grid flex stacks prefer `Stack` (vertical) or `Inline` (horizontal).
 */
'use client'

import * as React from 'react'
import { Grid as ChakraGrid } from '@chakra-ui/react'

export type GridCols = 1 | 2 | 3 | 4 | 5 | 6 | 12
export type GridGap = 4 | 8 | 12 | 16 | 24 | 32

/**
 * Numeric px gap → Chakra spacing token KEY (system.ts tokens.spacing):
 *   '1'→4px / '2'→8px / '3'→12px / '4'→16px / '6'→24px / '8'→32px
 *
 * Exported for unit testing: allows direct assertion that each px value maps
 * to the correct token key without relying on Chakra's CSS class generation.
 */
export const GAP_TOKEN: Record<GridGap, string> = {
  4: '1',
  8: '2',
  12: '3',
  16: '4',
  24: '6',
  32: '8',
}

/** Minimum column width (px) used when `responsive=true`. Items below this width
 * collapse — preventing overflow on narrow viewports (<320px). */
export const RESPONSIVE_MIN_COL_PX = 280

/**
 * Compute the CSS `grid-template-columns` value from the Grid props.
 *
 * Exported as a pure function so unit tests can assert the exact string
 * produced by each combination of `responsive` / `cols` without depending on
 * Chakra's CSS-class generation or jsdom's style resolution.
 *
 * @param responsive - When true, uses auto-fill/minmax so tracks collapse on
 *   narrow viewports. When false, a fixed `cols` track count is applied.
 * @param cols - Number of fixed columns. Only used when `responsive=false`.
 */
export function buildTemplateColumns(
  responsive: boolean,
  cols: GridCols
): string {
  return responsive
    ? `repeat(auto-fill, minmax(min(${RESPONSIVE_MIN_COL_PX}px, 100%), 1fr))`
    : `repeat(${cols}, minmax(0, 1fr))`
}

export interface GridProps {
  cols?: GridCols
  gap?: GridGap
  /**
   * When true (default), uses `repeat(auto-fill, minmax(min(280px, 100%), 1fr))`
   * — the grid auto-collapses on narrow viewports without overflow. In this mode
   * the `cols` prop is ignored (track count is viewport-driven).
   *
   * When false, `cols` is applied at all breakpoints via
   * `repeat(cols, minmax(0, 1fr))`.
   */
  responsive?: boolean
  /** Polymorphic root element. Defaults to "div". */
  as?: keyof React.JSX.IntrinsicElements
  className?: string
  children?: React.ReactNode
}

/**
 * Grid — CSS grid layout primitive (Chakra v3 `Grid`).
 *
 * - default `cols=1`, `gap=16`, `responsive=true`
 * - `responsive=true` → auto-fill / minmax(min(280px, 100%), 1fr): tracks
 *   collapse without overflow on narrow viewports.
 * - `responsive=false` → fixed `cols` tracks at every breakpoint.
 */
export function Grid({
  cols = 1,
  gap = 16,
  responsive = true,
  as = 'div',
  className,
  children,
}: GridProps): React.ReactElement {
  const templateColumns = buildTemplateColumns(responsive, cols)

  return (
    <ChakraGrid
      as={as as React.ElementType}
      templateColumns={templateColumns}
      gap={GAP_TOKEN[gap]}
      data-cols={String(cols)}
      data-responsive={responsive ? 'true' : 'false'}
      className={className}
    >
      {children}
    </ChakraGrid>
  )
}

Grid.displayName = 'Grid'
