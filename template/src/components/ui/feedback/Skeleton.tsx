/**
 * Skeleton — Chakra UI v3 (Phase 4 feedback migration, Batch 2)
 *
 * NOTE: there was no prior Skeleton component in this codebase — this is a new
 * Chakra v3 wrapper added as part of the feedback batch. It exposes a small,
 * explicit public API (width/height/variant + className) on top of Chakra v3's
 * `Skeleton`, and re-exports `SkeletonText` / `SkeletonCircle` for the text and
 * avatar placeholder cases.
 *
 * Recipe convention (see feedback/Alert.tsx + theme/system.ts):
 *   1. Use Chakra Skeleton as the rendering base — no raw <div>/cn.
 *   2. Pass through width/height as style props; `variant` maps directly to
 *      Chakra's `pulse | shine | none` skeleton variants.
 *   3. No hardcoded oklch/hex — colors come from Chakra's skeleton recipe which
 *      reads the active color mode via semantic tokens.
 *   4. No hooks/effects → no 'use client' directive required.
 */

import * as React from 'react'
import type { SkeletonProps as ChakraSkeletonProps } from '@chakra-ui/react'
import {
  Skeleton as ChakraSkeleton,
  SkeletonCircle as ChakraSkeletonCircle,
  SkeletonText as ChakraSkeletonText,
} from '@chakra-ui/react'

/** Animation style for the loading placeholder. */
export type SkeletonVariant = 'pulse' | 'shine' | 'none'

export interface SkeletonProps
  extends Omit<ChakraSkeletonProps, 'variant' | 'width' | 'height'> {
  /** CSS width (e.g. '100%', '12rem', 200). */
  width?: string | number
  /** CSS height (e.g. '1rem', 200). */
  height?: string | number
  /** Animation style. Defaults to 'pulse'. */
  variant?: SkeletonVariant
  className?: string
  children?: React.ReactNode
}

/**
 * Skeleton — a single rectangular loading placeholder.
 *
 * For multi-line text use `SkeletonText`, for circular (avatar) placeholders
 * use `SkeletonCircle`.
 */
export function Skeleton({
  width,
  height,
  variant = 'pulse',
  className,
  children,
  ...rest
}: SkeletonProps): React.ReactElement {
  return (
    <ChakraSkeleton
      variant={variant}
      width={width}
      height={height}
      className={className}
      {...rest}
    >
      {children}
    </ChakraSkeleton>
  )
}

Skeleton.displayName = 'Skeleton'

// Re-export the text + circle placeholders directly — they already carry the
// Chakra v3 public API (noOfLines / size etc.) and need no wrapping.
export const SkeletonText = ChakraSkeletonText
export const SkeletonCircle = ChakraSkeletonCircle
