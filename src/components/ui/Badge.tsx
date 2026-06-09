/**
 * Badge — Chakra UI v3 (Phase 2 migration)
 * Recipe convention: same pattern as Button.tsx.
 *
 * BadgeTone maps to semantic token color pairs:
 *   neutral → fg.muted / bg.sunken
 *   accent  → accent.text / accent.subtle
 *   ok      → status.success / status.successSubtle
 *   warn    → status.warning / status.warningSubtle
 *   err     → status.danger / status.dangerSubtle
 *   outline → fg.muted / transparent with border
 *
 * Public API preserved: tone, children, dot, mono
 * StatusBadge (BotStatus → tone mapping) also preserved below.
 */
'use client'

import type { ReactNode } from 'react'
import { Badge as ChakraBadge, Box } from '@chakra-ui/react'
import type { BotStatus } from '@/types/recall'

export type BadgeTone = 'neutral' | 'accent' | 'ok' | 'warn' | 'err' | 'outline'

export interface BadgeProps {
  tone?: BadgeTone
  children: ReactNode
  dot?: boolean
  mono?: boolean
}

// Semantic token pairs per tone (bg / color / border)
const TONE_TOKENS: Record<
  BadgeTone,
  { bg: string; color: string; borderColor?: string }
> = {
  neutral: { bg: 'bg.sunken',           color: 'fg.muted' },
  accent:  { bg: 'accent.subtle',       color: 'accent.text' },
  ok:      { bg: 'status.successSubtle', color: 'status.success' },
  warn:    { bg: 'status.warningSubtle', color: 'status.warning' },
  err:     { bg: 'status.dangerSubtle',  color: 'status.danger' },
  outline: { bg: 'transparent',          color: 'fg.muted', borderColor: 'border.default' },
}

export function Badge({ tone = 'neutral', children, dot, mono = true }: BadgeProps) {
  const tokens = TONE_TOKENS[tone]

  return (
    <ChakraBadge
      display="inline-flex"
      alignItems="center"
      gap="1"
      px="2"
      py="0.5"
      borderRadius="full"
      bg={tokens.bg}
      color={tokens.color}
      borderWidth={tokens.borderColor ? '1px' : undefined}
      borderColor={tokens.borderColor}
      fontSize="10.5px"
      fontWeight="semibold"
      letterSpacing="0.02em"
      fontFamily={mono ? 'mono' : 'sans'}
      whiteSpace="nowrap"
      // override Chakra default variant styles
      variant="plain"
    >
      {dot && (
        <Box
          as="span"
          display="inline-block"
          width="1.5"
          height="1.5"
          borderRadius="full"
          bg="currentColor"
          flexShrink={0}
        />
      )}
      {children}
    </ChakraBadge>
  )
}

// ─── StatusBadge ────────────────────────────────────────────

const STATUS_TONE: Record<BotStatus, BadgeTone> = {
  joining:               'warn',
  in_call:               'ok',
  recording_done:        'accent',
  transcript_processing: 'accent',
  done:                  'neutral',
  fatal_error:           'err',
}

export interface StatusBadgeProps {
  status: BotStatus
  live?: boolean
}

export function StatusBadge({ status, live }: StatusBadgeProps) {
  return (
    <Badge tone={STATUS_TONE[status] ?? 'neutral'} dot={!live}>
      {live && status === 'in_call' && (
        <Box
          as="span"
          className="recall-live-dot"
          display="inline-block"
          width="1.5"
          height="1.5"
        />
      )}
      {status}
    </Badge>
  )
}
