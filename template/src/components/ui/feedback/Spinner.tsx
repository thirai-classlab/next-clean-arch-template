/**
 * Spinner — Chakra UI v3 (Phase 4 feedback migration)
 *
 * Re-implemented on top of Chakra v3 `Spinner` (was a lucide `Loader2` +
 * tailwind `animate-spin`). The exported TypeScript API (SpinnerProps,
 * SpinnerSize, the `Spinner` named export) is kept identical so every consumer
 * compiles unchanged.
 *
 * Recipe convention (see primitive/Button.tsx + theme/system.ts):
 *   1. Use the Chakra `Spinner` as the rendering base — no lucide icon.
 *   2. Apply Linear-theme semantic tokens via style props (accent.default) —
 *      no hardcoded oklch/hex, no cva/className.
 *   3. a11y: role="status" + aria-label + a visually-hidden label span are
 *      preserved verbatim; the public size→px contract is mapped to Chakra's
 *      `boxSize` so the rendered diameter is identical to the old version.
 *   4. Spinner has no interactivity, so 'use client' is not required.
 */

import * as React from 'react'
import { Spinner as ChakraSpinner, VisuallyHidden } from '@chakra-ui/react'

export type SpinnerSize = 'sm' | 'md' | 'lg'

// Preserve the old rendered diameters (16 / 24 / 32 px) via Chakra boxSize.
const SIZE_PX: Record<SpinnerSize, string> = {
  sm: '16px',
  md: '24px',
  lg: '32px',
}

export interface SpinnerProps {
  size?: SpinnerSize
  /** Accessible label announced by screen readers. Defaults to "読み込み中…". */
  label?: string
  className?: string
}

/**
 * Spinner — minimal accessible loading indicator.
 *
 * - role="status" + aria-label so assistive tech can announce the state
 * - A visually-hidden span carries the label text for redundancy
 * - Compositor-friendly rotate animation provided by Chakra's Spinner
 */
export function Spinner({
  size = 'md',
  label = '読み込み中…',
  className,
}: SpinnerProps): React.ReactElement {
  return (
    <span
      role="status"
      aria-label={label}
      data-size={size}
      className={className}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <ChakraSpinner
        boxSize={SIZE_PX[size]}
        color="accent.default"
        borderWidth="2px"
        aria-hidden="true"
      />
      <VisuallyHidden>{label}</VisuallyHidden>
    </span>
  )
}

Spinner.displayName = 'Spinner'
