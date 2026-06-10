// src/app/api/_shared/use-case-factories.ts
// UseCase factory layer for Route Handlers.
//
// Why this exists (draft 06 §4.1 + Wave 5-H constraint):
// Container only registers Port -> Adapter bindings as Singletons. UseCase
// classes are NOT decorated with @injectable() and have Port-typed
// constructor params, so tsyringe cannot auto-resolve them via class token.
// Route Handlers therefore use these factories which:
//   1. Ensure the DI container is bootstrapped (await ensureContainer())
//   2. Resolve required Ports / Repositories from the container by string token
//   3. Manually instantiate the UseCase with resolved deps
//
// All factory functions are async so that Route Handlers that skip an explicit
// ensureContainer() call still bootstrap the container before any resolve().
// Server Actions that already call ensureContainer() directly will simply
// await the already-memoized promise (idempotent, no extra cost).
//
// In tests, these factories are mocked via `vi.mock(...)` to return stub
// UseCases with deterministic behavior. This keeps Route Handlers as thin
// wrappers (target: < 50 lines each) without touching the real DI graph.

import { container, ensureContainer } from '@/lib/infrastructure/container'
import {
  CreateBotUseCase,
  ListBotsUseCase,
  GetBotUseCase,
  DeleteBotUseCase,
  GetRecordingsUseCase,
  GetTranscriptsUseCase,
  ListCalendarEventsUseCase,
  SyncCalendarEventsUseCase,
  HandleBotWebhookUseCase,
} from '@/lib/application/use-cases'
import { AddAllowedUserUseCase } from '@/lib/application/use-cases/add-allowed-user.use-case'
import { RemoveAllowedUserUseCase } from '@/lib/application/use-cases/remove-allowed-user.use-case'
import { ChangeUserRoleUseCase } from '@/lib/application/use-cases/change-user-role.use-case'
import { ApproveUserUseCase } from '@/lib/application/use-cases/approve-user.use-case'
import { RejectUserUseCase } from '@/lib/application/use-cases/reject-user.use-case'
import { GetAuditLogsUseCase } from '@/lib/application/use-cases/get-audit-logs.use-case'
import { ListUsersUseCase } from '@/lib/application/use-cases/list-users.use-case'
import { GetPendingUsersUseCase } from '@/lib/application/use-cases/get-pending-users.use-case'
import { GetCurrentUserUseCase } from '@/lib/application/use-cases/get-current-user.use-case'
import { SignInWithGoogleUseCase } from '@/lib/application/use-cases/sign-in-with-google.use-case'
import { SignInWithPasswordUseCase } from '@/lib/application/use-cases/sign-in-with-password.use-case'
import type { AuthPort } from '@/lib/application/ports/auth.port'
import type { BotOrchestratorPort } from '@/lib/application/ports/bot-orchestrator.port'
import type { QueuePort } from '@/lib/application/ports/queue.port'
import type { CalendarPort } from '@/lib/application/ports/calendar.port'
import type { WebhookVerifierPort } from '@/lib/application/ports/webhook-verifier.port'
import type { BotRepository } from '@/lib/application/repositories/bot.repository'
import type { RecordingRepository } from '@/lib/application/repositories/recording.repository'
import type { TranscriptRepository } from '@/lib/application/repositories/transcript.repository'
import type { CalendarEventRepository } from '@/lib/application/repositories/calendar-event.repository'
import type { WebhookEventRepository } from '@/lib/application/repositories/webhook-event.repository'
import type { AllowedUserRepository } from '@/lib/application/repositories/allowed-user.repository'
import type { AuditLogRepository } from '@/lib/application/repositories/audit-log.repository'
import type { UserRepository } from '@/lib/application/repositories/user.repository'

function r<T>(token: string): T {
  return container.resolve<T>(token)
}

export async function createBotUseCase(): Promise<CreateBotUseCase> {
  await ensureContainer()
  return new CreateBotUseCase(
    r<BotOrchestratorPort>('BotOrchestratorPort'),
    r<BotRepository>('BotRepository'),
    r<QueuePort>('QueuePort'),
  )
}

export async function listBotsUseCase(): Promise<ListBotsUseCase> {
  await ensureContainer()
  return new ListBotsUseCase(r<BotRepository>('BotRepository'))
}

export async function getBotUseCase(): Promise<GetBotUseCase> {
  await ensureContainer()
  return new GetBotUseCase(r<BotRepository>('BotRepository'))
}

export async function deleteBotUseCase(): Promise<DeleteBotUseCase> {
  await ensureContainer()
  return new DeleteBotUseCase(
    r<BotOrchestratorPort>('BotOrchestratorPort'),
    r<BotRepository>('BotRepository'),
  )
}

export async function getRecordingsUseCase(): Promise<GetRecordingsUseCase> {
  await ensureContainer()
  return new GetRecordingsUseCase(r<RecordingRepository>('RecordingRepository'))
}

export async function getTranscriptsUseCase(): Promise<GetTranscriptsUseCase> {
  await ensureContainer()
  return new GetTranscriptsUseCase(r<TranscriptRepository>('TranscriptRepository'))
}

export async function listCalendarEventsUseCase(): Promise<ListCalendarEventsUseCase> {
  await ensureContainer()
  return new ListCalendarEventsUseCase(
    r<CalendarEventRepository>('CalendarEventRepository'),
  )
}

export async function syncCalendarEventsUseCase(): Promise<SyncCalendarEventsUseCase> {
  await ensureContainer()
  return new SyncCalendarEventsUseCase(
    r<CalendarPort>('CalendarPort'),
    r<CalendarEventRepository>('CalendarEventRepository'),
  )
}

export async function handleBotWebhookUseCase(): Promise<HandleBotWebhookUseCase> {
  await ensureContainer()
  return new HandleBotWebhookUseCase(
    r<WebhookVerifierPort>('WebhookVerifierPort'),
    r<WebhookEventRepository>('WebhookEventRepository'),
    r<BotRepository>('BotRepository'),
  )
}

export async function createAddAllowedUserUseCase(): Promise<AddAllowedUserUseCase> {
  await ensureContainer()
  return new AddAllowedUserUseCase(
    r<AllowedUserRepository>('AllowedUserRepository'),
    r<AuditLogRepository>('AuditLogRepository'),
  )
}

export async function createRemoveAllowedUserUseCase(): Promise<RemoveAllowedUserUseCase> {
  await ensureContainer()
  return new RemoveAllowedUserUseCase(
    r<AllowedUserRepository>('AllowedUserRepository'),
    r<AuditLogRepository>('AuditLogRepository'),
  )
}

export async function createChangeUserRoleUseCase(): Promise<ChangeUserRoleUseCase> {
  await ensureContainer()
  return new ChangeUserRoleUseCase(
    r<UserRepository>('UserRepository'),
    r<AuditLogRepository>('AuditLogRepository'),
  )
}

export async function createGetAuditLogsUseCase(): Promise<GetAuditLogsUseCase> {
  await ensureContainer()
  return new GetAuditLogsUseCase(r<AuditLogRepository>('AuditLogRepository'))
}

export async function createListUsersUseCase(): Promise<ListUsersUseCase> {
  await ensureContainer()
  return new ListUsersUseCase(r<UserRepository>('UserRepository'))
}

export async function createGetPendingUsersUseCase(): Promise<GetPendingUsersUseCase> {
  await ensureContainer()
  return new GetPendingUsersUseCase(r<UserRepository>('UserRepository'))
}

export async function createGetCurrentUserUseCase(): Promise<GetCurrentUserUseCase> {
  await ensureContainer()
  return new GetCurrentUserUseCase(r<UserRepository>('UserRepository'))
}

export async function createApproveUserUseCase(): Promise<ApproveUserUseCase> {
  await ensureContainer()
  return new ApproveUserUseCase(
    r<UserRepository>('UserRepository'),
    r<AuditLogRepository>('AuditLogRepository'),
  )
}

export async function createRejectUserUseCase(): Promise<RejectUserUseCase> {
  await ensureContainer()
  return new RejectUserUseCase(
    r<UserRepository>('UserRepository'),
    r<AuditLogRepository>('AuditLogRepository'),
  )
}

// auth-login-strategy §Step 3 (H-R2-2 / architect M-1): sign-in UseCases are
// obtained via these factories, NOT via tsyringe `container.resolve(UseCase)`.
// The container only wires the Port -> Adapter binding (`AuthPort`); the UseCase
// is manually instantiated here so the DI graph stays Port-only. Added to the
// existing factory file (no new file) so the Server Action can import it (DRY).
export async function signInWithGoogleFactory(): Promise<SignInWithGoogleUseCase> {
  await ensureContainer()
  return new SignInWithGoogleUseCase(r<AuthPort>('AuthPort'))
}

export async function signInWithPasswordFactory(): Promise<SignInWithPasswordUseCase> {
  await ensureContainer()
  return new SignInWithPasswordUseCase(r<AuthPort>('AuthPort'))
}
