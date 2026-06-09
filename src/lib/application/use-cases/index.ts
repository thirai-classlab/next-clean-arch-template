// src/lib/application/use-cases/index.ts
// Barrel for all 25 UseCases (draft 06 §1.4). Bodies stubbed (throw "not
// implemented: Step 3"); Infrastructure adapters wire concrete impls.

// --- Auth (8) ---
export {
  SignInWithGoogleUseCase,
  type SignInWithGoogleOutput,
} from './sign-in-with-google.use-case'
export {
  SignInWithPasswordUseCase,
  type SignInWithPasswordInput,
  type SignInWithPasswordOutput,
} from './sign-in-with-password.use-case'
export {
  HandleOAuthCallbackUseCase,
  type HandleOAuthCallbackInput,
  type HandleOAuthCallbackOutput,
} from './handle-oauth-callback.use-case'
export { SignOutUseCase, type SignOutInput } from './sign-out.use-case'
export {
  GetCurrentUserUseCase,
  type GetCurrentUserInput,
} from './get-current-user.use-case'
export {
  CheckDomainAllowedUseCase,
  type CheckDomainAllowedInput,
} from './check-domain-allowed.use-case'
export { GetPendingUsersUseCase } from './get-pending-users.use-case'
export {
  ApproveUserUseCase,
  type ApproveUserInput,
} from './approve-user.use-case'
export { RejectUserUseCase, type RejectUserInput } from './reject-user.use-case'

// --- Admin (6) ---
export {
  ListUsersUseCase,
  type ListUsersInput,
  type ListUsersOutput,
} from './list-users.use-case'
export {
  ChangeUserRoleUseCase,
  type ChangeUserRoleInput,
} from './change-user-role.use-case'
export {
  GetAuditLogsUseCase,
  type GetAuditLogsInput,
} from './get-audit-logs.use-case'
export {
  AddAllowedUserUseCase,
  type AddAllowedUserInput,
} from './add-allowed-user.use-case'
export {
  RemoveAllowedUserUseCase,
  type RemoveAllowedUserInput,
} from './remove-allowed-user.use-case'
export {
  GetOrganizationSettingsUseCase,
  type OrganizationSettings,
} from './get-organization-settings.use-case'

// --- Bot (5) ---
export { CreateBotUseCase, type CreateBotInput } from './create-bot.use-case'
export {
  ListBotsUseCase,
  type ListBotsInput,
  type ListBotsOutput,
} from './list-bots.use-case'
export { GetBotUseCase, type GetBotInput } from './get-bot.use-case'
export { DeleteBotUseCase, type DeleteBotInput } from './delete-bot.use-case'
export {
  HandleBotWebhookUseCase,
  type HandleBotWebhookInput,
} from './handle-bot-webhook.use-case'

// --- Recording / Transcript (3) ---
export {
  GetRecordingsUseCase,
  type GetRecordingsInput,
} from './get-recordings.use-case'
export {
  GetTranscriptsUseCase,
  type GetTranscriptsInput,
} from './get-transcripts.use-case'
export {
  RefreshRecordingUrlUseCase,
  type RefreshRecordingUrlInput,
} from './refresh-recording-url.use-case'

// --- Calendar (3) ---
export {
  ListCalendarEventsUseCase,
  type ListCalendarEventsInput,
} from './list-calendar-events.use-case'
export {
  ScheduleBotForEventUseCase,
  type ScheduleBotForEventInput,
} from './schedule-bot-for-event.use-case'
export {
  SyncCalendarEventsUseCase,
  type SyncCalendarEventsOutput,
} from './sync-calendar-events.use-case'
