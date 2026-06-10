// src/components/domain/TranscriptBubble.tsx
// Chat-bubble surface for a single transcript segment.
// Shows speaker / text / timestamp / optional confidence indicator.
//
// Chakra UI v3 (Phase 5, Domain re-skin). Re-skinned on Chakra `Box`/`HStack`
// + semantic tokens (was Tailwind token classes via cn()). The public API
// (TranscriptBubbleProps, the `TranscriptBubble` export), the speaker/text/
// timestamp/confidence domain logic, the <article>/<header>/<time>/<footer>
// semantic shape, every data-testid, and the low-confidence dim threshold are
// all preserved verbatim; only the visual layer moved to Chakra primitives.
//
// Recipe convention (see feedback/Alert.tsx, theme/system.ts):
//   1. Render base = Chakra `Box`/`HStack` factory with `as` for semantic HTML.
//   2. Linear-theme surfaces via semantic tokens (bg.elevated, fg.default,
//      fg.muted, border.default, status.warning) — no hardcoded oklch/hex/var().
//   3. a11y: role="article" + aria-label (speaker + time) + the low-confidence
//      aria-label ("低信頼度の発話") preserved verbatim.
//   4. 'use client' — Chakra factory components instantiate the styled-system
//      createProxy at module scope (RSC-incompatible).
'use client'

import * as React from 'react'
import { AlertTriangle } from 'lucide-react'
import { Box, HStack } from '@chakra-ui/react'
import { cn } from '@/lib/utils/cn'

export interface TranscriptBubbleProps {
  speaker: string
  text: string
  /** ISO 8601 string or Date — rendered as HH:MM:SS */
  timestamp: Date | string
  /** 0.0 - 1.0. Values < 0.5 dim the text and surface a warning icon. */
  confidence?: number
  className?: string
}

const LOW_CONFIDENCE_THRESHOLD = 0.5

function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value)
}

function formatTimestamp(value: Date | string): string {
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) {
    return '--:--:--'
  }
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
}

/**
 * TranscriptBubble — speaker / text / timestamp surface for live transcripts.
 *
 * - role="article" so each utterance is a discrete landmark
 * - aria-label includes both speaker and timestamp for screen readers
 * - When `confidence < 0.5`, the text is visually dimmed and a warning icon
 *   is surfaced (with an explanatory aria-label).
 */
export function TranscriptBubble({
  speaker,
  text,
  timestamp,
  confidence,
  className,
}: TranscriptBubbleProps): React.ReactElement {
  const formatted = formatTimestamp(timestamp)
  const lowConfidence =
    typeof confidence === 'number' && confidence < LOW_CONFIDENCE_THRESHOLD
  const accessibleName = `${speaker} at ${formatted}`

  return (
    <Box
      as="article"
      role="article"
      aria-label={accessibleName}
      data-low-confidence={lowConfidence ? 'true' : undefined}
      className={cn(className)}
      display="flex"
      flexDirection="column"
      gap="1"
      borderRadius="md"
      borderWidth="1px"
      borderColor="border.default"
      bg="bg.elevated"
      px="3"
      py="2"
      fontSize="sm"
    >
      <HStack as="header" justify="space-between" gap="2">
        <Box
          as="span"
          data-testid="transcript-speaker"
          fontWeight="semibold"
          color="fg.default"
        >
          {speaker}
        </Box>
        <Box
          as="time"
          data-testid="transcript-timestamp"
          {...{
            dateTime:
              timestamp instanceof Date
                ? timestamp.toISOString()
                : String(timestamp),
          }}
          fontSize="xs"
          color="fg.muted"
        >
          {formatted}
        </Box>
      </HStack>
      <Box
        as="p"
        data-testid="transcript-text"
        // Dim low-confidence text via a SINGLE source of truth: the Chakra
        // `opacity` prop. Previously a Tailwind `opacity-60` class was applied
        // on the same element alongside `opacity={0.6}`, compounding to an
        // effective 0.6 × 0.6 = 0.36. `data-low-confidence` exposes the state
        // for tests/consumers without coupling to the styling implementation.
        data-low-confidence={lowConfidence ? 'true' : undefined}
        color="fg.default"
        whiteSpace="pre-wrap"
        wordBreak="break-word"
        opacity={lowConfidence ? 0.6 : 1}
      >
        {text}
      </Box>
      {lowConfidence || typeof confidence === 'number' ? (
        <HStack
          as="footer"
          justify="flex-end"
          gap="2"
          fontSize="xs"
          color="fg.muted"
        >
          {lowConfidence ? (
            <HStack
              as="span"
              data-testid="transcript-low-confidence"
              aria-label="低信頼度の発話"
              gap="1"
              color="fg.default"
            >
              <Box as="span" color="status.warning" display="inline-flex">
                <AlertTriangle size={12} aria-hidden="true" />
              </Box>
              <span>
                {typeof confidence === 'number'
                  ? `${Math.round(confidence * 100)}%`
                  : 'low'}
              </span>
            </HStack>
          ) : typeof confidence === 'number' ? (
            <Box as="span" data-testid="transcript-confidence">
              {Math.round(confidence * 100)}%
            </Box>
          ) : null}
        </HStack>
      ) : null}
    </Box>
  )
}

TranscriptBubble.displayName = 'TranscriptBubble'
