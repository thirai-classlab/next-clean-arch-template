/**
 * Container — Chakra UI v3 (Phase 4 layout migration, Batch 3)
 *
 * Re-implemented on top of Chakra v3 `Container` (was a hand-rolled centered
 * wrapper with inline `style` + cn() tailwind). The exported TypeScript API
 * (ContainerProps: maxWidth/padding/as/className) is kept identical so every
 * consumer compiles unchanged.
 *
 * Recipe convention (see Stack.tsx + theme/system.ts):
 *   1. Use Chakra `Container` as the rendering base. We drive the layout via
 *      explicit `maxW` + `paddingInline` style props (rather than the Container
 *      recipe's `fluid`/`centerContent` variants) to preserve the exact
 *      maxWidth breakpoints + padding token scale the old component exposed.
 *   2. `padding` maps to Chakra spacing token KEYS from system.ts.
 *   3. Centering (`marginInline:auto`, `width:100%`) is Chakra Container's
 *      default base style — no override needed.
 *   4. `data-max-width` / `data-padding` preserved verbatim for tests + CSS hooks.
 *   5. 'use client' is required: Chakra v3 factory components read the styling
 *      system from React context, so they must run as client components when
 *      rendered directly inside a Server Component page. Without it, Next.js 14
 *      RSC page-data collection fails with `createProxy is not a function`.
 *
 * Use as the outermost wrapper for page surfaces and modal bodies.
 */
'use client'

import * as React from 'react'
import { Container as ChakraContainer } from '@chakra-ui/react'

export type ContainerMaxWidth = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
export type ContainerPadding = 'none' | 'sm' | 'md' | 'lg'

/**
 * Exported for unit testing: allows direct assertion that each maxWidth key
 * maps to the correct pixel value without relying on Chakra's CSS generation.
 */
export const MAX_WIDTH_PX: Record<ContainerMaxWidth, string> = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
  full: '100%',
}

/**
 * `padding` → Chakra spacing token KEY (system.ts tokens.spacing).
 * `none` → undefined (no inline padding).
 */
const PADDING_TOKEN: Record<ContainerPadding, string | undefined> = {
  none: undefined,
  sm: '3', // 12px
  md: '4', // 16px
  lg: '6', // 24px
}

export interface ContainerProps {
  maxWidth?: ContainerMaxWidth
  padding?: ContainerPadding
  /** Polymorphic root element. Defaults to "div". */
  as?: keyof React.JSX.IntrinsicElements
  className?: string
  children?: React.ReactNode
}

/**
 * Container — max-width centered wrapper (Chakra v3 `Container`).
 *
 * - default `maxWidth="lg"` (1024px), `padding="md"` (token key '4' = 16px)
 * - centered via Chakra Container's default `marginInline: auto`
 * - polymorphic via `as` (semantic element selection — `main`, `section`, …)
 */
export function Container({
  maxWidth = 'lg',
  padding = 'md',
  as = 'div',
  className,
  children,
}: ContainerProps): React.ReactElement {
  return (
    <ChakraContainer
      as={as as React.ElementType}
      maxW={MAX_WIDTH_PX[maxWidth]}
      paddingInline={PADDING_TOKEN[padding]}
      data-max-width={maxWidth}
      data-padding={padding}
      className={className}
    >
      {children}
    </ChakraContainer>
  )
}

Container.displayName = 'Container'
