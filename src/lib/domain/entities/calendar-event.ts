// src/lib/domain/entities/calendar-event.ts
// CalendarEvent entity — meeting scheduled via Google Calendar / Microsoft Outlook etc.
// `autoJoin` controls whether a Recall.ai Bot will join the meeting automatically.

import type { Email } from '../value-objects/email'
import type { MeetingPlatform } from '../value-objects/meeting-platform'

export interface CalendarEvent {
  readonly id: string
  readonly externalId: string
  readonly platform: MeetingPlatform
  readonly meetingUrl: string
  readonly startAt: Date
  readonly endAt: Date
  readonly autoJoin: boolean
  readonly organizerEmail: Email
}
