/**
 * Spacer — Chakra UI v3 (Phase 4 layout migration, Batch 3)
 *
 * NOTE: Chakra v3's own `Spacer` is a *flex-grow* spacer that expands to fill
 * available space along the major axis — semantically different from this
 * component, which is a fixed-size decorative gap (x/y axis). We therefore
 * render on the `chakra.span` factory (NOT Chakra's `<Spacer>`) so the fixed
 * `aria-hidden` spacer API is preserved exactly while still flowing through
 * Chakra's styling system + spacing tokens.
 *
 * Recipe convention (see Stack.tsx + theme/system.ts):
 *   1. Use the `chakra.span` factory element — no raw <span> + inline style.
 *   2. Numeric px size (4/8/16…) maps to Chakra spacing token KEYS from
 *      system.ts (tokens.spacing); applied to `height` (y) or `width` (x).
 *   3. `flexShrink: 0` keeps the spacer from collapsing inside flex containers.
 *   4. a11y: `aria-hidden="true"` + no role preserved verbatim.
 *   5. `data-axis` preserved verbatim for tests + CSS hooks.
 *   6. 'use client' is required: the `chakra.span` factory reads the styling
 *      system from React context, so it must run as a client component when
 *      rendered directly inside a Server Component page. Without it, Next.js 14
 *      RSC page-data collection fails with `createProxy is not a function`.
 *
 * Prefer `gap` on the parent (Stack / Inline / Grid) when possible. Reach for
 * Spacer only when you need a single, asymmetric gap that can't be expressed
 * by the parent's uniform `gap`.
 */
'use client'

import * as React from 'react'
import { chakra } from '@chakra-ui/react'

export type SpacerSize = 4 | 8 | 12 | 16 | 24 | 32 | 48 | 64
export type SpacerAxis = 'x' | 'y'

/**
 * Numeric px size → Chakra spacing token KEY (system.ts tokens.spacing):
 *   '1'→4px / '2'→8px / '3'→12px / '4'→16px
 *   '6'→24px / '8'→32px / '12'→48px / '16'→64px
 *
 * Exported for unit testing: allows direct assertion that each px value maps
 * to the correct token key without relying on Chakra's CSS class generation.
 */
export const SIZE_TOKEN: Record<SpacerSize, string> = {
  4: '1',
  8: '2',
  12: '3',
  16: '4',
  24: '6',
  32: '8',
  48: '12',
  64: '16',
}

export interface SpacerProps {
  size: SpacerSize
  /** Default "y" — inserts vertical gap. Use "x" for inline horizontal gap. */
  axis?: SpacerAxis
  className?: string
}

const ChakraSpan = chakra('span')

/**
 * Spacer — purely decorative spacing element.
 *
 * - non-interactive, `aria-hidden="true"`
 * - `axis="y"` (default) sets `height` to the spacing token, `width: 100%`
 * - `axis="x"` sets `width` to the spacing token, `height: 100%`
 * - `flex-shrink: 0` so Spacer keeps its size inside flex containers
 */
export function Spacer({
  size,
  axis = 'y',
  className,
}: SpacerProps): React.ReactElement {
  const token = SIZE_TOKEN[size]
  const sizeProps =
    axis === 'y'
      ? { height: token, width: 'full' }
      : { width: token, height: 'full' }

  return (
    <ChakraSpan
      aria-hidden="true"
      data-axis={axis}
      flexShrink={0}
      className={className}
      {...sizeProps}
    />
  )
}

Spacer.displayName = 'Spacer'
