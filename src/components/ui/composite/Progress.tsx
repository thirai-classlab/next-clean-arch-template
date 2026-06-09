/**
 * Progress — Chakra UI v3 native (Batch 3b, task-32)
 *
 * A linear progress bar built on Chakra v3 `Progress.*` slot-recipe primitives
 * (ProgressRoot / ProgressTrack / ProgressRange / ProgressLabel / ProgressValueText).
 *
 * Design:
 *   - Semantic tokens only — no raw hex/oklch values.
 *   - Track: bg.sunken, rounded-full.
 *   - Range fill: accent.default (normal) → status.danger (error) → status.warning (warning).
 *   - Optional label row (left: label, right: value text).
 *   - Indeterminate animation via `value={null}` (Ark/Zag built-in).
 *
 * a11y:
 *   - Ark wires role="progressbar", aria-valuenow, aria-valuemin, aria-valuemax
 *     automatically on ProgressRoot.
 *   - ProgressLabel is wired via aria-labelledby by Ark.
 *   - indeterminate (value=null) sets aria-valuenow omitted, aria-label fallback
 *     is recommended for indeterminate use.
 *
 * No interactivity → no 'use client' required (pure presentational render).
 */

import * as React from 'react'
import {
  Progress,
  HStack,
  Text,
} from '@chakra-ui/react'

// ── Types ────────────────────────────────────────────────────────────────────

export type ProgressTone = 'default' | 'error' | 'warning'

export interface ProgressProps {
  /**
   * Current progress value (0–max).
   * Pass `null` for indeterminate animation.
   */
  value: number | null
  /** Maximum value. Default: 100. */
  max?: number
  /** Optional label rendered above the track. */
  label?: string
  /** Show the numeric percentage text (e.g. "72%"). Default: false. */
  showValue?: boolean
  /** Visual tone. error → red, warning → amber, default → accent blue. */
  tone?: ProgressTone
  /** Track height. Sizes map to Chakra size tokens. Default: "sm". */
  size?: 'xs' | 'sm' | 'md' | 'lg'
  /** Optional className for layout overrides. */
  className?: string
}

// ── Internal helpers ─────────────────────────────────────────────────────────

const TRACK_HEIGHT: Record<NonNullable<ProgressProps['size']>, string> = {
  xs: '1',
  sm: '1.5',
  md: '2.5',
  lg: '4',
}

const RANGE_COLOR: Record<ProgressTone, string> = {
  default: 'accent.default',
  error: 'status.danger',
  warning: 'status.warning',
}

// ── Component ────────────────────────────────────────────────────────────────

/**
 * Progress — linear progress bar.
 *
 * Determinate:
 *   <Progress value={72} label="Upload" showValue />
 *
 * Indeterminate:
 *   <Progress value={null} label="読み込み中…" />
 *
 * Error state:
 *   <Progress value={30} tone="error" label="エラー" />
 */
export function ProgressBar({
  value,
  max = 100,
  label,
  showValue = false,
  tone = 'default',
  size = 'sm',
  className,
}: ProgressProps): React.ReactElement {
  const trackH = TRACK_HEIGHT[size]
  const rangeColor = RANGE_COLOR[tone]

  return (
    <Progress.Root
      value={value}
      max={max}
      className={className}
      width="full"
    >
      {/* ── Optional label / value row ──────────────────────────── */}
      {(label || showValue) ? (
        <HStack justify="space-between" mb="1.5">
          {label ? (
            <Progress.Label
              fontSize="sm"
              fontWeight="medium"
              color="fg.default"
            >
              {label}
            </Progress.Label>
          ) : null}
          {showValue ? (
            <Progress.ValueText
              fontSize="xs"
              fontWeight="medium"
              color="fg.muted"
              fontVariantNumeric="tabular-nums"
            />
          ) : null}
        </HStack>
      ) : null}

      {/* ── Track + range ────────────────────────────────────────── */}
      <Progress.Track
        bg="bg.sunken"
        borderRadius="full"
        overflow="hidden"
        height={trackH}
      >
        <Progress.Range
          bg={rangeColor}
          borderRadius="full"
          transition="width 200ms ease-out"
        />
      </Progress.Track>
    </Progress.Root>
  )
}

ProgressBar.displayName = 'Progress'
