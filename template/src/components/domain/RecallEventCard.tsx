// src/components/domain/RecallEventCard.tsx
// Card surface for a single Recall.ai webhook / domain event.
// Inline RecallEvent type — packages/contracts への正式移行は別 task。
//
// Chakra UI v3 (Phase 5, Domain re-skin). Re-skinned on Chakra
// `Card.Root`/`Box`/`HStack`/`Button` + semantic tokens (was Tailwind token
// classes via cn()). The public API (RecallEvent, RecallEventCardProps, the
// `RecallEventCard` export), the event.type → icon/label mapping (with raw-type
// fallback), the timestamp formatting, the <article>/<header>/<time>/<footer>
// semantic shape, every data-* attribute / data-testid, and the onAction
// contract ('retry' / 'dismiss') are preserved verbatim; only the visual layer
// moved to Chakra primitives.
//
// Recipe convention (see Card.tsx, feedback/Alert.tsx, theme/system.ts):
//   1. Render base = Chakra `Card.Root` + `Box`/`HStack` factory with `as` for
//      semantic HTML (<article>, <header>, <time>, <footer>).
//   2. Linear-theme surfaces via semantic tokens (bg.elevated, fg.default,
//      fg.muted, accent.default, border.default, bg.sunken) — no oklch/hex/var().
//   3. Actions = Chakra `Button` (outline) preserving the onAction callbacks.
//   4. 'use client' — Chakra factory components instantiate the styled-system
//      createProxy at module scope (RSC-incompatible).
'use client'

import * as React from 'react'
import {
  Activity,
  Video,
  VideoOff,
  FileText,
  Calendar,
  Webhook,
  AlertOctagon,
  type LucideIcon,
} from 'lucide-react'
import { Box, Button, Card, HStack } from '@chakra-ui/react'
import { cn } from '@/lib/utils/cn'

export interface RecallEvent {
  id: string
  /** event.type — e.g. 'bot.joined', 'recording.started', 'transcript.data' */
  type: string
  timestamp: Date | string
  payload?: unknown
}

export interface RecallEventCardProps {
  event: RecallEvent
  /** When provided, render an actions row (Retry / Dismiss). */
  onAction?: (action: string) => void
  className?: string
}

interface EventMeta {
  Icon: LucideIcon
  label: string
}

const TYPE_META: Record<string, EventMeta> = {
  'bot.joined': { Icon: Video, label: 'Bot joined' },
  'bot.left': { Icon: VideoOff, label: 'Bot left' },
  'recording.started': { Icon: Video, label: 'Recording started' },
  'recording.done': { Icon: FileText, label: 'Recording done' },
  'transcript.data': { Icon: FileText, label: 'Transcript chunk' },
  'transcript.partial': { Icon: FileText, label: 'Partial transcript' },
  'calendar.scheduled': { Icon: Calendar, label: 'Calendar scheduled' },
  'webhook.received': { Icon: Webhook, label: 'Webhook received' },
  'bot.permission_denied': { Icon: AlertOctagon, label: 'Permission denied' },
}

const FALLBACK_META: EventMeta = { Icon: Activity, label: 'Event' }

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
 * RecallEventCard — render a single Recall event.
 *
 * - Known event types resolve to an icon + label, unknown types fall back to
 *   the raw type string + a generic Activity icon (no crash on new event kinds).
 * - When `onAction` is provided the card renders Retry / Dismiss buttons; when
 *   omitted the card is purely read-only.
 */
export function RecallEventCard({
  event,
  onAction,
  className,
}: RecallEventCardProps): React.ReactElement {
  const meta = TYPE_META[event.type] ?? { ...FALLBACK_META, label: event.type }
  const { Icon, label } = meta
  const formatted = formatTimestamp(event.timestamp)
  const interactive = typeof onAction === 'function'

  return (
    <Card.Root
      as="article"
      data-event-type={event.type}
      data-event-id={event.id}
      aria-label={`Event: ${label} at ${formatted}`}
      className={cn(className)}
      variant="outline"
      display="flex"
      flexDirection="column"
      gap="2"
      borderRadius="md"
      borderWidth="1px"
      borderColor="border.default"
      bg="bg.elevated"
      px="3"
      py="2"
      fontSize="sm"
    >
      <HStack as="header" justify="space-between" gap="2">
        <HStack as="span" gap="2" color="fg.default">
          <Box as="span" color="accent.default" display="inline-flex">
            <Icon size={14} aria-hidden="true" />
          </Box>
          <Box as="span" fontWeight="semibold">
            {label}
          </Box>
        </HStack>
        <Box
          as="time"
          data-testid="recall-event-timestamp"
          {...{
            dateTime:
              event.timestamp instanceof Date
                ? event.timestamp.toISOString()
                : String(event.timestamp),
          }}
          fontSize="xs"
          color="fg.muted"
        >
          {formatted}
        </Box>
      </HStack>
      <Box
        as="p"
        data-testid="recall-event-id"
        fontSize="xs"
        color="fg.muted"
        wordBreak="break-all"
      >
        {event.id}
      </Box>
      {interactive ? (
        <HStack
          as="footer"
          data-testid="recall-event-actions"
          justify="flex-end"
          gap="2"
        >
          <Button
            type="button"
            onClick={() => onAction!('retry')}
            variant="outline"
            size="xs"
            borderRadius="sm"
            borderColor="border.default"
            color="fg.default"
            bg="transparent"
            fontWeight="medium"
            _hover={{ bg: 'bg.sunken' }}
          >
            Retry
          </Button>
          <Button
            type="button"
            onClick={() => onAction!('dismiss')}
            variant="outline"
            size="xs"
            borderRadius="sm"
            borderColor="border.default"
            color="fg.muted"
            bg="transparent"
            fontWeight="medium"
            _hover={{ bg: 'bg.sunken' }}
          >
            Dismiss
          </Button>
        </HStack>
      ) : null}
    </Card.Root>
  )
}

RecallEventCard.displayName = 'RecallEventCard'
