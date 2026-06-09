// src/components/domain/BotStatusBadge.tsx
// Domain semantic badge for Recall.ai bot lifecycle (7 states).
// Aligns with `BotStatus` value object at @/lib/domain/value-objects/bot-status.
//
// Chakra UI v3 (Phase 5, Domain re-skin). Re-skinned on the Chakra `Badge`
// factory + semantic tokens (was Tailwind token classes via cn()). The public
// API (BotStatusBadgeProps, BotStatusTone, the `BotStatusBadge` export) and the
// Recall.ai domain semantics (the 7-status → tone/icon/label/pulse mapping) are
// kept byte-for-byte; only the visual layer moved to Chakra primitives.
//
// Recipe convention (see primitive/Button.tsx, feedback/Alert.tsx, theme/system.ts):
//   1. Render base = Chakra `Badge` factory (semantic <span>) — no raw <span>/cn.
//   2. Linear-theme surfaces via semantic tokens (bg.sunken, accent.subtle,
//      status.*, fg.*, border.*) — no hardcoded oklch/hex/var().
//   3. a11y: role="status" + descriptive aria-label + data-status/data-tone are
//      preserved verbatim. Icon-only mode still announces the status.
//   4. 'use client' — Chakra factory components instantiate the styled-system
//      createProxy at module scope (RSC-incompatible).
'use client'

import * as React from 'react'
import {
  Circle,
  Loader2,
  Video,
  VideoOff,
  CheckCircle2,
  AlertTriangle,
  PhoneOff,
  type LucideIcon,
} from 'lucide-react'
import { Badge as ChakraBadge } from '@chakra-ui/react'
import { cn } from '@/lib/utils/cn'
import type { BotStatus } from '@/lib/domain/value-objects/bot-status'

export type BotStatusTone = 'neutral' | 'info' | 'warn' | 'live' | 'ok' | 'err'

interface BotStatusMeta {
  tone: BotStatusTone
  /** lucide-react icon component */
  Icon: LucideIcon
  /** Human-readable label rendered in the pill body */
  label: string
  /** Accessible description appended to aria-label */
  description: string
  /** When true the icon pulses (joining / recording / fatal) */
  pulse: boolean
}

const STATUS_META: Record<BotStatus, BotStatusMeta> = {
  ready: {
    tone: 'neutral',
    Icon: Circle,
    label: 'Ready',
    description: 'ready, waiting to join',
    pulse: false,
  },
  joining_call: {
    tone: 'info',
    Icon: Loader2,
    label: 'Joining',
    description: 'joining call',
    pulse: true,
  },
  in_call_not_recording: {
    tone: 'warn',
    Icon: VideoOff,
    label: 'In call',
    description: 'in call, not recording',
    pulse: false,
  },
  in_call_recording: {
    tone: 'live',
    Icon: Video,
    label: 'Recording',
    description: 'in call, recording',
    pulse: true,
  },
  call_ended: {
    tone: 'neutral',
    Icon: PhoneOff,
    label: 'Ended',
    description: 'call ended',
    pulse: false,
  },
  done: {
    tone: 'ok',
    Icon: CheckCircle2,
    label: 'Done',
    description: 'done',
    pulse: false,
  },
  fatal: {
    tone: 'err',
    Icon: AlertTriangle,
    label: 'Fatal',
    description: 'fatal error',
    pulse: false,
  },
}

interface ToneStyle {
  bg: string
  color: string
  borderColor: string
}

// live (録音中) と err (致命的) の差別化:
//   - live: success-subtle 背景 + border.strong (icon が pulse で「録音中」を強調)
//   - err:  danger-subtle 背景 + border.strong (致命的状態)
// 同色 (danger-subtle) を border の強弱で分けることで a11y / visual の両面で状態を区別。
// Linear-theme semantic tokens に移植 (旧 var(--color-*) class マッピングと等価)。
const TONE_STYLE: Record<BotStatusTone, ToneStyle> = {
  neutral: { bg: 'bg.sunken',            color: 'fg.muted',    borderColor: 'border.default' },
  info:    { bg: 'accent.subtle',        color: 'accent.text', borderColor: 'border.default' },
  warn:    { bg: 'status.warningSubtle', color: 'fg.default',  borderColor: 'border.default' },
  live:    { bg: 'status.successSubtle', color: 'fg.default',  borderColor: 'border.strong' },
  ok:      { bg: 'status.successSubtle', color: 'fg.default',  borderColor: 'border.default' },
  err:     { bg: 'status.dangerSubtle',  color: 'fg.default',  borderColor: 'border.strong' },
}

export interface BotStatusBadgeProps {
  status: BotStatus
  /** When false, render icon only. The accessible label still includes the status text. */
  showLabel?: boolean
  className?: string
}

/**
 * BotStatusBadge — pill rendering one of the 7 BotStatus values.
 *
 * - Each status maps to a tone (color), an icon, and a screen-reader description.
 * - `joining_call` and `in_call_recording` pulse to convey "live" state.
 * - The accessible name always includes the status (icon-only mode still announces it).
 */
export function BotStatusBadge({
  status,
  showLabel = true,
  className,
}: BotStatusBadgeProps): React.ReactElement {
  const meta = STATUS_META[status]
  const { Icon, label, description, tone, pulse } = meta
  const accessibleName = `Bot status: ${description}`
  const toneStyle = TONE_STYLE[tone]

  return (
    <ChakraBadge
      role="status"
      aria-label={accessibleName}
      data-status={status}
      data-tone={tone}
      className={cn(className)}
      // override Chakra's default variant styling so our tokens take effect
      variant="plain"
      display="inline-flex"
      alignItems="center"
      gap="1.5"
      borderRadius="full"
      borderWidth="1px"
      borderColor={toneStyle.borderColor}
      bg={toneStyle.bg}
      color={toneStyle.color}
      px="2.5"
      py="0.5"
      fontSize="xs"
      fontWeight="medium"
      lineHeight="none"
      whiteSpace="nowrap"
    >
      <Icon
        size={12}
        aria-hidden="true"
        className={cn('shrink-0', pulse ? 'animate-pulse' : undefined)}
      />
      {showLabel ? <span>{label}</span> : null}
    </ChakraBadge>
  )
}

BotStatusBadge.displayName = 'BotStatusBadge'
