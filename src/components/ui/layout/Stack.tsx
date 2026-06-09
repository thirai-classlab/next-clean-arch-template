/**
 * Stack — Chakra UI v3 (Phase 4 layout migration, Batch 3)
 *
 * Re-implemented on top of Chakra v3 `Stack` (was a hand-rolled flex container
 * with inline `style` + cn() tailwind). The exported TypeScript API
 * (StackProps: gap/direction/align/justify/as/className) is kept identical so
 * every consumer (admin pages, gallery) compiles unchanged.
 *
 * Recipe convention (see primitive/Button.tsx + theme/system.ts):
 *   1. Use Chakra `Stack` as the rendering base — no raw flex div + inline style.
 *   2. Our numeric px gap (4/8/16/24…) maps to Chakra's spacing token KEYS
 *      ('1'/'2'/'4'/'6'…) defined in system.ts `tokens.spacing`. This keeps the
 *      4px-based Linear spacing scale as the single source of truth — no
 *      hardcoded px / CSS-var strings.
 *   3. `align`/`justify` map to Chakra's `alignItems`/`justifyContent` shorthand
 *      style props; the friendly union values (start/center/between…) map to the
 *      CSS keywords Chakra/flexbox expect.
 *   4. `data-*` attributes (direction/align/justify) are preserved verbatim so
 *      behaviour-level tests and any CSS hooks keep working.
 *   5. 'use client' is required: Chakra v3 factory components read the styling
 *      system from React context, so they must run as client components when
 *      rendered directly inside a Server Component page (e.g. admin/dashboard).
 *      Without it, Next.js 14 RSC page-data collection fails with
 *      `createProxy is not a function`.
 *
 * For horizontal-first stacks prefer `Inline` (defaults to wrap=true + tighter
 * gap). The two share most of the API.
 */
'use client'

import * as React from 'react'
import { Stack as ChakraStack } from '@chakra-ui/react'

export type StackGap = 4 | 8 | 12 | 16 | 24 | 32 | 48 | 64
export type StackDirection = 'column' | 'row'
export type StackAlign = 'start' | 'center' | 'end' | 'stretch'
export type StackJustify = 'start' | 'center' | 'end' | 'between' | 'around'

/**
 * Map a numeric spacing prop (px) to the matching Chakra spacing token KEY.
 * The token values live in `apps/web/src/theme/system.ts` (tokens.spacing):
 *   '1'→4px / '2'→8px / '3'→12px / '4'→16px
 *   '6'→24px / '8'→32px / '12'→48px / '16'→64px
 *
 * Exported for unit testing: allows direct assertion that each px value maps
 * to the correct token key without relying on Chakra's CSS class generation.
 */
export const GAP_TOKEN: Record<StackGap, string> = {
  4: '1',
  8: '2',
  12: '3',
  16: '4',
  24: '6',
  32: '8',
  48: '12',
  64: '16',
}

const ALIGN_CSS: Record<StackAlign, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
}

const JUSTIFY_CSS: Record<StackJustify, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  between: 'space-between',
  around: 'space-around',
}

export interface StackProps {
  gap?: StackGap
  direction?: StackDirection
  align?: StackAlign
  justify?: StackJustify
  /** Polymorphic root element. Defaults to "div". */
  as?: keyof React.JSX.IntrinsicElements
  className?: string
  children?: React.ReactNode
}

/**
 * Stack — vertical-first flex layout primitive (Chakra v3 `Stack`).
 *
 * - default `direction="column"` and `gap=16` (token key '4' = 16px)
 * - `gap` accepts a fixed set of token-aligned values to avoid one-off spacing
 * - polymorphic via `as` prop (semantic element selection — `section`, `nav`, …)
 */
export function Stack({
  gap = 16,
  direction = 'column',
  align,
  justify,
  as = 'div',
  className,
  children,
}: StackProps): React.ReactElement {
  return (
    <ChakraStack
      as={as as React.ElementType}
      direction={direction}
      gap={GAP_TOKEN[gap]}
      alignItems={align ? ALIGN_CSS[align] : undefined}
      justifyContent={justify ? JUSTIFY_CSS[justify] : undefined}
      data-direction={direction}
      data-align={align}
      data-justify={justify}
      className={className}
    >
      {children}
    </ChakraStack>
  )
}

Stack.displayName = 'Stack'
