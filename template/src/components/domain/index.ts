// Domain semantic components (Phase C — Step 2-B). Composed from primitive +
// feedback layers; encapsulate recall-poc-specific business shapes so feature
// surfaces do not duplicate status/icon/format logic.

export { BotStatusBadge } from './BotStatusBadge'
export type { BotStatusBadgeProps, BotStatusTone } from './BotStatusBadge'

export { TranscriptBubble } from './TranscriptBubble'
export type { TranscriptBubbleProps } from './TranscriptBubble'

export { RecallEventCard } from './RecallEventCard'
export type { RecallEventCardProps, RecallEvent } from './RecallEventCard'
