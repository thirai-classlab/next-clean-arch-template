/**
 * Inline — Chakra UI v3 (Phase 4 layout migration, Batch 3)
 *
 * Re-implemented on top of Chakra v3 `HStack` (was a hand-rolled flex row with
 * inline `style` + cn() tailwind). The exported TypeScript API
 * (InlineProps: gap/wrap/align/justify/as/className) is kept identical so every
 * consumer compiles unchanged.
 *
 * Recipe convention (see Stack.tsx + theme/system.ts):
 *   1. Use Chakra `HStack` as the rendering base — no raw flex div + inline style.
 *   2. Numeric px gap (4/8/16/24…) maps to Chakra spacing token KEYS — same
 *      4px-based Linear scale from system.ts.
 *   3. `wrap` maps to Chakra's `flexWrap` shorthand; `align`/`justify` map to
 *      `alignItems`/`justifyContent`.
 *   4. `data-*` attributes (direction/wrap/align/justify) preserved verbatim.
 *   5. 'use client' is required: Chakra v3 factory components read the styling
 *      system from React context, so they must run as client components when
 *      rendered directly inside a Server Component page. Without it, Next.js 14
 *      RSC page-data collection fails with `createProxy is not a function`.
 *
 * For vertical layout prefer `Stack`. The two share most of the API.
 */
'use client'

import * as React from 'react'
import { HStack as ChakraHStack } from '@chakra-ui/react'

export type InlineGap = 4 | 8 | 12 | 16 | 24 | 32
export type InlineAlign = 'start' | 'center' | 'end' | 'baseline'
export type InlineJustify = 'start' | 'center' | 'end' | 'between'

/**
 * Numeric px gap → Chakra spacing token KEY (system.ts tokens.spacing):
 *   '1'→4px / '2'→8px / '3'→12px / '4'→16px / '6'→24px / '8'→32px
 *
 * Exported for unit testing: allows direct assertion that each px value maps
 * to the correct token key without relying on Chakra's CSS class generation.
 */
export const GAP_TOKEN: Record<InlineGap, string> = {
  4: '1',
  8: '2',
  12: '3',
  16: '4',
  24: '6',
  32: '8',
}

const ALIGN_CSS: Record<InlineAlign, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  baseline: 'baseline',
}

const JUSTIFY_CSS: Record<InlineJustify, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  between: 'space-between',
}

export interface InlineProps {
  gap?: InlineGap
  /** When true (default) the row wraps on overflow — mobile-friendly. */
  wrap?: boolean
  align?: InlineAlign
  justify?: InlineJustify
  /** Polymorphic root element. Defaults to "div". */
  as?: keyof React.JSX.IntrinsicElements
  className?: string
  children?: React.ReactNode
}

/**
 * Inline — horizontal flex layout primitive (Chakra v3 `HStack`) with sensible
 * wrap defaults.
 *
 * - default `gap=8` (token key '2' = 8px) — tighter than Stack to suit inline UI
 * - default `wrap=true` so narrow viewports break the row instead of overflowing
 * - polymorphic via `as` prop
 */
export function Inline({
  gap = 8,
  wrap = true,
  align,
  justify,
  as = 'div',
  className,
  children,
}: InlineProps): React.ReactElement {
  return (
    <ChakraHStack
      as={as as React.ElementType}
      gap={GAP_TOKEN[gap]}
      flexWrap={wrap ? 'wrap' : 'nowrap'}
      alignItems={align ? ALIGN_CSS[align] : undefined}
      justifyContent={justify ? JUSTIFY_CSS[justify] : undefined}
      data-direction="row"
      data-wrap={wrap ? 'true' : 'false'}
      data-align={align}
      data-justify={justify}
      className={className}
    >
      {children}
    </ChakraHStack>
  )
}

Inline.displayName = 'Inline'
