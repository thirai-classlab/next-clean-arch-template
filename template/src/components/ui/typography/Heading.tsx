/**
 * Heading — Chakra UI v3 (Phase 5 migration)
 *
 * RECIPE CONVENTION (same pattern as primitive/Button.tsx):
 *   1. Render via Chakra `Heading` factory component — never a raw <h1>–<h6>.
 *      This keeps the component compliant with the local `no-raw-heading-tag`
 *      ESLint rule (raw heading tags are only permitted inside this file, and
 *      now we emit them through Chakra rather than literal JSX, so the rule's
 *      Heading.tsx exception is no longer strictly required — but is harmless).
 *   2. Map our `level` (1–6) prop to:
 *        - the semantic HTML tag via Chakra's polymorphic `as` prop, and
 *        - a fluid `fontSize` token from system.ts (clamp() values ported from
 *          tokens.css — text-6xl..text-xl preserved verbatim).
 *      An explicit `as` prop on the consumer still overrides the tag, decoupling
 *      semantic level from visual size exactly as before.
 *   3. Apply Linear-theme color via the semantic `color` token (fg.default,
 *      fg.muted, accent.default) — no raw var() / oklch / hex.
 *   4. Keep the exported TypeScript API identical (level / as / color / id /
 *      className / children) so consumers require zero changes.
 *   5. Chakra factory components require "use client" in the App Router.
 *
 * See: apps/web/src/theme/system.ts (token definitions)
 * See: apps/web/src/components/ui/primitive/Button.tsx (canonical recipe)
 */
'use client'

import type { JSX } from 'react'
import { Heading as ChakraHeading } from '@chakra-ui/react'
import { cn } from '@/lib/utils/cn'

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6

export interface HeadingProps {
  level: HeadingLevel
  /** Visual tag override — decouples semantic level from visual size */
  as?: keyof JSX.IntrinsicElements
  color?: 'default' | 'muted' | 'accent'
  className?: string
  /** Anchor support for section headers */
  id?: string
  children: React.ReactNode
}

/** level → fluid fontSize token (clamp() ported from tokens.css via system.ts) */
const SIZE_TOKEN: Record<HeadingLevel, string> = {
  1: '6xl',
  2: '5xl',
  3: '4xl',
  4: '3xl',
  5: '2xl',
  6: 'xl',
}

const COLOR_TOKEN: Record<NonNullable<HeadingProps['color']>, string> = {
  default: 'fg.default',
  muted: 'fg.muted',
  accent: 'accent.default',
}

export function Heading({
  level,
  as,
  color = 'default',
  className,
  id,
  children,
}: HeadingProps) {
  const tag = (as ?? (`h${level}` as keyof JSX.IntrinsicElements)) as React.ElementType

  return (
    <ChakraHeading
      as={tag}
      id={id}
      className={cn(className)}
      fontFamily="sans"
      fontWeight="bold"
      lineHeight="tight"
      fontSize={SIZE_TOKEN[level]}
      color={COLOR_TOKEN[color]}
    >
      {children}
    </ChakraHeading>
  )
}
