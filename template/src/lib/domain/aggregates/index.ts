// src/lib/domain/aggregates/index.ts — Barrel for the 3 Aggregate roots.

export type { UserAggregate } from './user-aggregate'
export {
  createUserAggregate,
  approveUser,
  rejectUser,
  changeUserRole,
} from './user-aggregate'

export type { BotAggregate } from './bot-aggregate'
export {
  createBotAggregate,
  updateBotStatus,
  addRecording,
  addTranscript,
} from './bot-aggregate'

export type { MeetingSessionAggregate } from './meeting-session-aggregate'
export {
  createMeetingSessionAggregate,
  scheduleBotJoin,
  cancelBotJoin,
} from './meeting-session-aggregate'
