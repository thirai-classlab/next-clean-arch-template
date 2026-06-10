// src/lib/domain/value-objects/meeting-platform.ts
// MeetingPlatform VO — supported video / audio meeting platforms.

export const MEETING_PLATFORMS = Object.freeze([
  'zoom',
  'google_meet',
  'microsoft_teams',
  'webex',
  'slack_huddles',
  'goto',
] as const)
export type MeetingPlatform = (typeof MEETING_PLATFORMS)[number]
