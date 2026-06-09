// src/app/(admin)/admin/_lib/admin-data.ts
// task-5 Step 5 — typed data-loaders for the admin panel pages.
//
// Why these exist:
//   The admin pages are Server Components that need data to render. The real
//   data source is Supabase (RLS-applied SELECT via the Application UseCases),
//   but Supabase env is not yet configured on this branch (Step 1-4 are
//   scaffolds; Step 3 wires the DB). To keep pages rendering in dev / MOCK mode
//   WITHOUT crashing, each loader resolves the corresponding UseCase and, when
//   the Result is an error (env unset / "not implemented: Step 3" / network),
//   degrades to an empty list or a placeholder value.
//
//   This mirrors how Step 1/2 handled env-unset (middleware getSessionRole()
//   returns null → fallback) and how role-guard.ts treats env-unset as
//   safe-by-default. No fabricated rows: empty arrays + zeroed metrics.

import { container, ensureContainer, REPOSITORY_TOKENS } from '@/lib/infrastructure/container'
import { logger } from '@/lib/infrastructure/logger'
import type { AuditLog, AllowedUser } from '@/lib/domain/entities'
import type { Result } from '@/lib/application/result'
import type { DomainError } from '@/lib/domain/errors'
import type { Role } from '@/lib/domain/value-objects/role'

// ── Process-global store access (task-35 Step 2d cross-context fix) ────────────
//
// Next.js 14 App Router runs Server Actions and Server Components in separate
// webpack bundles. The tsyringe container (and variable-path dynamic imports in
// registerMockRepositories) resolve successfully in the Server Action bundle but
// fail in the RSC (Server Component) bundle because:
//   1. Module-level `_bootstrapped` differs between bundles.
//   2. Variable-path `import(modulePath)` fails in the RSC bundle with MODULE_NOT_FOUND.
//
// The InMemoryXxxRepository classes use @injectable() — a TypeScript decorator —
// which causes SyntaxError when imported (static or dynamic) from an RSC bundle,
// because Next.js SWC RSC compilation does not support emitDecoratorMetadata.
//
// Instead of importing the class, we read the process-global Map directly via the
// same GLOBAL_KEY that InMemoryAuditLogRepository uses. This is safe because:
//   - The Map is keyed by `globalThis.__recall_poc_auditLogStore__` (set by SA context).
//   - RSC reads the same Map via globalThis — no class instantiation needed.

const AUDIT_LOG_GLOBAL_KEY = '__recall_poc_auditLogStore__'
// Must match GLOBAL_KEY in in-memory-allowed-user.repository.ts (SA write context).
const ALLOWED_USER_GLOBAL_KEY = '__recall_poc_allowedUserStore__'

declare global {
  // eslint-disable-next-line no-var
  var __recall_poc_auditLogStore__: Map<string, AuditLog> | undefined
  // eslint-disable-next-line no-var
  var __recall_poc_allowedUserStore__: Map<string, AllowedUser> | undefined
}

/**
 * Read audit logs directly from the process-global store — bypasses the DI
 * container and @injectable() decorator issue in RSC bundles.
 * Returns null if the store is empty or undefined (same semantics as safeRun).
 */
function readGlobalAuditLogs(sinceDate: Date): ReadonlyArray<AuditLog> | null {
  const store = globalThis[AUDIT_LOG_GLOBAL_KEY]
  if (!store || store.size === 0) return null
  const sinceMs = sinceDate.getTime()
  return Object.freeze(
    Array.from(store.values()).filter((l) => l.createdAt.getTime() >= sinceMs),
  )
}

/**
 * Read allowed users directly from the process-global store — same RSC-bundle
 * decorator workaround as readGlobalAuditLogs (task-35 Step 2d).
 * Returns null if the store is empty or undefined (same semantics as safeRun).
 */
function readGlobalAllowedUsers(): ReadonlyArray<AllowedUser> | null {
  const store = globalThis[ALLOWED_USER_GLOBAL_KEY]
  if (!store || store.size === 0) return null
  return Object.freeze(Array.from(store.values()))
}

// ── View models (decoupled from domain entities so pages stay env-agnostic) ──

export interface AdminUserRow {
  readonly id: string
  readonly email: string
  readonly role: Role
  readonly status: string
  readonly createdAt: string
}

export interface AdminAllowedUserRow {
  readonly id: string
  readonly email: string
  readonly addedBy: string
  readonly addedAt: string
}

export interface AdminAuditLogRow {
  readonly id: string
  readonly actorId: string
  readonly action: string
  readonly targetType: string | null
  readonly targetId: string | null
  readonly createdAt: string
}

export interface AdminDashboardMetrics {
  readonly totalUsers: number
  readonly pendingUsers: number
  readonly recentAuditCount: number
  readonly roleDistribution: Readonly<Record<Role, number>>
}

export interface AdminOrgSettings {
  readonly allowedDomains: readonly string[]
  readonly sessionTimeoutMinutes: number
  readonly pendingApprovalRequired: boolean
}

/** Discriminated state every loader returns so pages can show an env hint. */
export interface AdminDataState<T> {
  readonly data: T
  /** true when data is the env-deferred placeholder (Supabase not wired yet). */
  readonly placeholder: boolean
}

/**
 * Run a UseCase factory + execute, returning `null` instead of throwing/erroring.
 * Centralizes the env-deferred fallback so every loader stays 3 lines.
 */
async function safeRun<T>(
  label: string,
  run: () => Promise<Result<T, DomainError>>,
): Promise<T | null> {
  try {
    // Ensure container is bootstrapped before resolving any token.
    // Server Components do not call ensureContainer() themselves (unlike Server
    // Actions which call it explicitly). Without this, container.resolve() throws
    // "Attempted to resolve unregistered dependency token" and safeRun degrades
    // to null (empty placeholder) even in MOCK_MODE.
    await ensureContainer()
    const result = await run()
    if (result.ok) return result.value
    // Expected on this branch: UseCases return ExternalServiceError
    // ("not implemented: Step 3") until Supabase + repositories are wired.
    logger.debug(
      { loader: label, reason: result.error.message },
      '[admin-data] loader degraded to placeholder (env-deferred)',
    )
    return null
  } catch (error: unknown) {
    const reason = error instanceof Error ? error.message : String(error)
    logger.debug(
      { loader: label, reason },
      '[admin-data] loader threw; degrading to placeholder (env-deferred)',
    )
    return null
  }
}

/**
 * Shared fallback handler for loaders that have a globalThis store backup.
 * When the DI container path returns null (RSC bundle, MODULE_NOT_FOUND, etc.),
 * reads entities directly from the process-global Map and maps them to row VMs.
 *
 * Returns `{ data: rows, placeholder: false }` when the global store contains
 * entries, or `{ data: [], placeholder: true }` when the store is absent/empty.
 */
function withGlobalStoreFallback<T, R>(
  globalReader: () => ReadonlyArray<T> | null,
  mapRow: (item: T) => R,
): AdminDataState<readonly R[]> {
  const items = globalReader()
  if (items && items.length > 0) {
    return { data: items.map(mapRow), placeholder: false }
  }
  return { data: [], placeholder: true }
}

// Re-export for the loaders below + for unit tests.
export const __testing = { safeRun, withGlobalStoreFallback }

const EMPTY_ROLE_DISTRIBUTION: Readonly<Record<Role, number>> = Object.freeze({
  admin: 0,
  member: 0,
  viewer: 0,
})

// ── Loaders ───────────────────────────────────────────────────────────────
// Each resolves the relevant admin UseCase from the container. The admin
// UseCases (ListUsersUseCase etc.) currently return err("not implemented:
// Step 3"), and the AdminRepositories are not yet registered, so safeRun()
// returns null and we fall back to the placeholder. When Step 3 wires Supabase,
// these begin returning real RLS-applied rows with no page changes.

/**
 * MOCK_MODE seed users: returned when MOCK_MODE=true and the UseCase
 * returns an error (Step 3 not implemented yet).
 * Provides at least 1 visible user-row so E2E specs can navigate to /admin/users/[id].
 */
const MOCK_SEED_USERS: readonly AdminUserRow[] = Object.freeze([
  {
    id: 'mock-user-id',
    email: 'admin@example.com',
    role: 'admin',
    status: 'active',
    createdAt: new Date('2024-01-01T00:00:00Z').toISOString(),
  },
  {
    id: 'mock-member-id',
    email: 'member@example.com',
    role: 'member',
    status: 'active',
    createdAt: new Date('2024-01-02T00:00:00Z').toISOString(),
  },
])

export async function loadUsers(): Promise<AdminDataState<readonly AdminUserRow[]>> {
  const value = await safeRun('users', async () => {
    const { ListUsersUseCase } = await import(
      '@/lib/application/use-cases/list-users.use-case'
    )
    const useCase = new ListUsersUseCase(
      container.resolve(REPOSITORY_TOKENS.UserRepository),
    )
    return useCase.execute({ page: 1, limit: 50 })
  })
  if (!value) {
    // Step 3 not implemented yet: degrade to MOCK_SEED_USERS in MOCK_MODE so E2E
    // specs can find at least one user-row (data-testid="user-row") without DB.
    if (process.env.MOCK_MODE === 'true') {
      return { data: MOCK_SEED_USERS, placeholder: true }
    }
    return { data: [], placeholder: true }
  }
  const rows: AdminUserRow[] = value.users.map((u) => ({
    id: u.id,
    email: u.email.value,
    role: u.role,
    status: u.status,
    createdAt: u.createdAt.toISOString(),
  }))
  return { data: rows, placeholder: false }
}

export async function loadPendingUsers(): Promise<
  AdminDataState<readonly AdminUserRow[]>
> {
  const value = await safeRun('pending-users', async () => {
    const { GetPendingUsersUseCase } = await import(
      '@/lib/application/use-cases/get-pending-users.use-case'
    )
    const useCase = new GetPendingUsersUseCase(
      container.resolve(REPOSITORY_TOKENS.UserRepository),
    )
    return useCase.execute()
  })
  if (!value) return { data: [], placeholder: true }
  const rows: AdminUserRow[] = value.map((u) => ({
    id: u.id,
    email: u.email.value,
    role: u.role,
    status: u.status,
    createdAt: u.createdAt.toISOString(),
  }))
  return { data: rows, placeholder: false }
}

function toAllowedUserRow(u: AllowedUser): AdminAllowedUserRow {
  return {
    id: u.id,
    email: u.email.value,
    addedBy: u.addedBy,
    addedAt: u.addedAt.toISOString(),
  }
}

function toAuditLogRow(l: AuditLog): AdminAuditLogRow {
  return {
    id: l.id,
    actorId: l.actorId,
    action: l.action,
    targetType: l.targetType,
    targetId: l.targetId,
    createdAt: l.createdAt.toISOString(),
  }
}

export async function loadAllowList(): Promise<
  AdminDataState<readonly AdminAllowedUserRow[]>
> {
  // First: try via DI container. No "list allowed users" UseCase exists yet
  // (only add/remove), so we resolve the repository directly and call findAll().
  // findAll() returns ReadonlyArray (not a Result), so wrap it in ok() for safeRun.
  const value = await safeRun('allow-list', async () => {
    const { container } = await import('@/lib/infrastructure/container')
    const repo = container.resolve<{
      findAll: () => Promise<ReadonlyArray<AllowedUser>>
    }>(REPOSITORY_TOKENS.AllowedUserRepository)
    const { ok } = await import('@/lib/application/result')
    return ok(await repo.findAll())
  })

  // Second: if the container path failed (RSC bundle, MODULE_NOT_FOUND, or the
  // @injectable() decorator SyntaxError), fall back to reading the globalThis-backed
  // Map directly — the same cross-context read path loadAuditLogs uses (task-35).
  if (!value) {
    return withGlobalStoreFallback(readGlobalAllowedUsers, toAllowedUserRow)
  }

  if (value.length === 0) return { data: [], placeholder: true }
  return { data: value.map(toAllowedUserRow), placeholder: false }
}

export async function loadAuditLogs(): Promise<
  AdminDataState<readonly AdminAuditLogRow[]>
> {
  // Last 30 days window (admin viewer default).
  const sinceDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  // First: try via DI container (works when container has AuditLogRepository registered).
  const value = await safeRun('audit-logs', async () => {
    const { GetAuditLogsUseCase } = await import(
      '@/lib/application/use-cases/get-audit-logs.use-case'
    )
    const useCase = new GetAuditLogsUseCase(
      container.resolve(REPOSITORY_TOKENS.AuditLogRepository),
    )
    return useCase.execute({ sinceDate })
  })

  // Second: if container path failed (RSC bundle, MODULE_NOT_FOUND), fall back to
  // reading the globalThis-backed Map directly (task-35 Step 2d fix).
  // This path is taken in the RSC context where the DI container does not have
  // AuditLogRepository registered, but the Map was written by the Server Action context.
  if (!value) {
    return withGlobalStoreFallback(() => readGlobalAuditLogs(sinceDate), toAuditLogRow)
  }

  return { data: value.map(toAuditLogRow), placeholder: false }
}

export async function loadOrgSettings(): Promise<
  AdminDataState<AdminOrgSettings>
> {
  const value = await safeRun('org-settings', async () => {
    const { GetOrganizationSettingsUseCase } = await import(
      '@/lib/application/use-cases/get-organization-settings.use-case'
    )
    const useCase = new GetOrganizationSettingsUseCase(
      container.resolve('DbPort'),
    )
    return useCase.execute()
  })
  if (!value) {
    return {
      data: {
        allowedDomains: ['classlab.co.jp'],
        sessionTimeoutMinutes: 60,
        pendingApprovalRequired: false,
      },
      placeholder: true,
    }
  }
  // Map the UseCase output (region/autojoin/provider) onto the settings VM
  // shape used by the page. (Step 3 will align these once the org settings
  // table lands; the page only needs a coherent placeholder for now.)
  return {
    data: {
      allowedDomains: ['classlab.co.jp'],
      sessionTimeoutMinutes: 60,
      pendingApprovalRequired: !value.autoJoinEnabled,
    },
    placeholder: false,
  }
}

/**
 * Dashboard metrics. Derived from the users + audit loaders so a single Supabase
 * wiring (Step 3) lights up every page. Until then everything reports zero.
 */
export async function loadDashboardMetrics(): Promise<
  AdminDataState<AdminDashboardMetrics>
> {
  const [users, pending, audit] = await Promise.all([
    loadUsers(),
    loadPendingUsers(),
    loadAuditLogs(),
  ])

  const placeholder =
    users.placeholder && pending.placeholder && audit.placeholder

  const roleDistribution = users.data.reduce<Record<Role, number>>(
    (acc, u) => {
      acc[u.role] = (acc[u.role] ?? 0) + 1
      return acc
    },
    { admin: 0, member: 0, viewer: 0 },
  )

  return {
    data: {
      totalUsers: users.data.length,
      pendingUsers: pending.data.length,
      recentAuditCount: audit.data.length,
      roleDistribution: users.placeholder
        ? EMPTY_ROLE_DISTRIBUTION
        : roleDistribution,
    },
    placeholder,
  }
}
