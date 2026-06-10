/**
 * Text — Chakra UI v3 (Phase 5 migration)
 *
 * Recipe convention: same pattern as primitive/Button.tsx + Heading.tsx.
 *   1. Render via Chakra `Text` factory; consumer `as` prop selects the tag
 *      (default <p>), preserving the polymorphic API.
 *   2. Map size → fluid fontSize token (clamp() values from system.ts),
 *      weight → fontWeight token, color → semantic color token. No raw var()
 *      / oklch / hex.
 *   3. Public TypeScript API (size / weight / color / as / className /
 *      children) is unchanged so consumers need zero edits.
 *   4. Chakra factory components require "use client" in the App Router.
 */
'use client'

import type { JSX } from 'react'
import { Text as ChakraText } from '@chakra-ui/react'
import { cn } from '@/lib/utils/cn'

export interface TextProps {
  size?: 'xs' | 'sm' | 'md' | 'lg'
  weight?: 'regular' | 'medium' | 'semibold' | 'bold'
  color?: 'default' | 'muted' | 'subtle' | 'accent' | 'danger'
  /** Render as a different HTML element (default: p) */
  as?: keyof JSX.IntrinsicElements
  className?: string
  children: React.ReactNode
}

const SIZE_TOKEN: Record<NonNullable<TextProps['size']>, string> = {
  xs: 'xs',
  sm: 'sm',
  md: 'md',
  lg: 'lg',
}

const WEIGHT_TOKEN: Record<NonNullable<TextProps['weight']>, string> = {
  regular: 'regular',
  medium: 'medium',
  semibold: 'semibold',
  bold: 'bold',
}

const COLOR_TOKEN: Record<NonNullable<TextProps['color']>, string> = {
  default: 'fg.default',
  muted: 'fg.muted',
  subtle: 'fg.subtle',
  accent: 'accent.default',
  danger: 'status.danger',
}

export function Text({
  size = 'md',
  weight = 'regular',
  color = 'default',
  as,
  className,
  children,
}: TextProps) {
  const tag = (as ?? 'p') as React.ElementType

  return (
    <ChakraText
      as={tag}
      className={cn(className)}
      fontFamily="sans"
      lineHeight="normal"
      fontSize={SIZE_TOKEN[size]}
      fontWeight={WEIGHT_TOKEN[weight]}
      color={COLOR_TOKEN[color]}
    >
      {children}
    </ChakraText>
  )
}
