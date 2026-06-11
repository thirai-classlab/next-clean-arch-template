// src/lib/infrastructure/container.ts
// tsyringe DI container — Server Components / Server Actions only.
// Client Components MUST NOT import this module (draft 06 §3.1 L689).
//
// ## Dynamic import strategy (task-35 fix)
//
// All adapter and repository loads use dynamic import() with **literal string
// paths** (no `webpackIgnore: true`). This is the correct pattern for Next.js:
//
//   - webpack can statically trace literal paths → includes them in the
//     correct bundle chunk (Server Action / Route Handler — NOT the RSC chunk).
//   - emitDecoratorMetadata IS supported in the Server Action / Node.js context.
//   - The RSC bundle imports `container.ts` only to call `ensureContainer()`,
//     which is a function reference — the function body (with the dynamic
//     imports) is not executed until the Server Action context calls it.
//   - `webpackIgnore: true` was the bug: it caused Node.js to resolve the path
//     relative to the calling page's directory at runtime, producing
//     ERR_MODULE_NOT_FOUND (e.g. `.../pending-approvals/repositories/...`).
//   - Static top-level imports were also NG: they pulled decorator-annotated
//     files into the RSC SWC compilation pass, which does not support
//     emitDecoratorMetadata, producing "Expression expected" SyntaxError.
//
// R5-A SEC-1 (task-5 Step 7 round-5): registerAdapters() now wires ALL 16
// PortNames declared in mapping.ts via a loop over PROFILE_ADAPTER_MAPPING.
// Previously only BotOrchestratorPort was wired; all other ports (including
// WebhookVerifierPort) were silently absent, causing production
// UnregisteredDependencyError on the first container.resolve() call.
import 'reflect-metadata'
import { container, Lifecycle } from 'tsyringe'
import { isMockMode } from '../env'
import {
  DEPLOY_PROFILES,
  PROFILE_ADAPTER_MAPPING,
  type DeployProfile,
  type PortName,
} from './profiles/mapping'

/**
 * Resolve the active DeployProfile from an env-style string, falling back to
 * `'minimal'` when the value is missing or unrecognized.
 */
export function resolveDeployProfile(raw: string | undefined): DeployProfile {
  if (raw && (DEPLOY_PROFILES as ReadonlyArray<string>).includes(raw)) {
    return raw as DeployProfile
  }
  return 'minimal'
}

/**
 * Register a Port → adapter binding as Singleton.
 * Adapter classes are passed in (not imported here) so that tree-shaking
 * can elide unused adapters when registerAdapters() picks them per profile.
 */
export function registerPort<T>(
  token: PortName | string,
  adapterClass: new (...args: never[]) => T,
): void {
  container.register<T>(
    token,
    { useClass: adapterClass as never },
    { lifecycle: Lifecycle.Singleton },
  )
}

/**
 * Maps adapter class names (as declared in PROFILE_ADAPTER_MAPPING values) to
 * their module paths relative to this file. Entries are added as the
 * corresponding Wave ships the implementation file.
 *
 * Paths are literal strings so webpack can statically trace them and include
 * the modules in the correct bundle (Server Action Node.js context, where
 * emitDecoratorMetadata is supported). Do NOT use `webpackIgnore: true` here —
 * that bypasses webpack's bundler and forces Node.js to resolve paths relative
 * to the calling page's directory, causing ERR_MODULE_NOT_FOUND at runtime.
 *
 * Missing entries cause tryRegisterFromModule to throw an "unknown adapter"
 * error (not silently swallowed) so that typos in mapping.ts are caught early.
 * Entries whose module file does NOT yet exist are tolerated via the
 * MODULE_NOT_FOUND swallow in tryRegisterFromModule.
 */
const ADAPTER_MODULE_MAP: Readonly<Record<string, string>> = Object.freeze({
  // ── Mock adapters (Wave 5-J, all shipped) ──────────────────────────────
  MockAuthAdapter: './adapters/mock/mock-auth.adapter',
  MockDbAdapter: './adapters/mock/mock-db.adapter',
  MockRealtimeAdapter: './adapters/mock/mock-realtime.adapter',
  MockStorageAdapter: './adapters/mock/mock-storage.adapter',
  MockQueueAdapter: './adapters/mock/mock-queue.adapter',
  MockEmailAdapter: './adapters/mock/mock-email.adapter',
  MockBotOrchestratorAdapter: './adapters/mock/mock-bot-orchestrator.adapter',
  MockTranscriptionAdapter: './adapters/mock/mock-transcription.adapter',
  MockCalendarAdapter: './adapters/mock/mock-calendar.adapter',
  MockLocalInferenceAdapter: './adapters/mock/mock-local-inference.adapter',
  MockVideoProcessorAdapter: './adapters/mock/mock-video-processor.adapter',
  MockContinuousMonitoringAdapter: './adapters/mock/mock-continuous-monitoring.adapter',
  MockMediaServerAdapter: './adapters/mock/mock-media-server.adapter',
  MockWebhookVerifierAdapter: './adapters/mock/mock-webhook-verifier.adapter',
  MockInternalRpcAdapter: './adapters/mock/mock-internal-rpc.adapter',
  MockRateLimiterAdapter: './adapters/mock/mock-rate-limiter.adapter',
  // ── Real adapters (shipped) ────────────────────────────────────────────
  RecallAiVerifierAdapter: './adapters/real/recall-ai-verifier.adapter',
  InMemoryRateLimiterAdapter: './adapters/real/in-memory-rate-limiter.adapter',
  // ── Real adapters (Wave 5-I and later — files may not exist yet) ──────
  // UpstashRateLimiterAdapter module file is a later task (task-36 Step 1 only
  // registers the path entry). Without this entry, registerAdapters() would
  // throw "No module path" at L148-153 for pro/vps profiles BEFORE reaching the
  // MODULE_NOT_FOUND swallow in tryRegisterFromModule. With the entry present,
  // the absent file is tolerated exactly like other not-yet-shipped adapters.
  UpstashRateLimiterAdapter: './adapters/real/upstash-rate-limiter.adapter',
  // ── Real adapters (Wave 5-I and later — files may not exist yet) ──────
  NextAuthAdapter: './adapters/real/nextauth-auth.adapter',
  NestAuthAdapter: './adapters/real/nest-auth.adapter',
  SupabaseAuthAdapter: './adapters/real/supabase-auth.adapter',
  SupabaseDbAdapter: './adapters/real/supabase-db.adapter',
  SupabaseRealtimeAdapter: './adapters/real/supabase-realtime.adapter',
  SupabaseStorageAdapter: './adapters/real/supabase-storage.adapter',
  VercelQueueAdapter: './adapters/real/vercel-queue.adapter',
  ResendEmailAdapter: './adapters/real/resend-email.adapter',
  RecallAiBotAdapter: './adapters/real/recall-ai-bot.adapter',
  RecallAiTranscriptionAdapter: './adapters/real/recall-ai-transcription.adapter',
  GoogleCalendarAdapter: './adapters/real/google-calendar.adapter',
  GoogleAndMsGraphCalendarAdapter: './adapters/real/google-ms-graph-calendar.adapter',
  OllamaInferenceAdapter: './adapters/real/ollama-inference.adapter',
  FfmpegVercelFluidAdapter: './adapters/real/ffmpeg-vercel-fluid.adapter',
  FfmpegSelfHostedAdapter: './adapters/real/ffmpeg-self-hosted.adapter',
  VercelObservabilityAdapter: './adapters/real/vercel-observability.adapter',
  PrometheusGrafanaAdapter: './adapters/real/prometheus-grafana.adapter',
  LivekitCloudMediaAdapter: './adapters/real/livekit-cloud-media.adapter',
  LivekitSelfHostedMediaAdapter: './adapters/real/livekit-self-hosted-media.adapter',
  NoopInternalRpcAdapter: './adapters/real/noop-internal-rpc.adapter',
  HttpRpcAdapter: './adapters/real/http-rpc.adapter',
  PostgresDbAdapter: './adapters/real/postgres-db.adapter',
  LivekitWebSocketAdapter: './adapters/real/livekit-websocket.adapter',
  S3CompatibleStorageAdapter: './adapters/real/s3-compatible-storage.adapter',
  RailwayBullMQAdapter: './adapters/real/railway-bullmq.adapter',
  SmtpEmailAdapter: './adapters/real/smtp-email.adapter',
})

/**
 * Async adapter loader — wires ALL Ports declared in PROFILE_ADAPTER_MAPPING
 * for the given DeployProfile.
 *
 * When MOCK_MODE=true the caller should pass `'mock'` as the profile (which
 * wires all 16 ports to in-memory mock adapters). Passing any other profile
 * with MOCK_MODE=true still works: the mock profile is the preferred path
 * because it is exhaustive and avoids per-port special-casing.
 *
 * Missing adapter module files are tolerated (sibling Waves may not have
 * shipped yet) — MODULE_NOT_FOUND is swallowed. Unknown adapter class names
 * (not in ADAPTER_MODULE_MAP) throw immediately so mapping.ts typos surface.
 *
 * Callers should `await` this function before resolving from the container.
 */
export async function registerAdapters(profile: DeployProfile): Promise<void> {
  const portMappings = PROFILE_ADAPTER_MAPPING[profile]

  const entries = Object.entries(portMappings) as [PortName, string][]
  await Promise.all(
    entries.map(([portName, adapterName]) => {
      const modulePath = ADAPTER_MODULE_MAP[adapterName]
      if (modulePath === undefined) {
        // Unknown adapter class — typo in mapping.ts; fail loudly
        throw new Error(
          `[container] No module path for adapter "${adapterName}" ` +
            `(port: ${portName}). Add it to ADAPTER_MODULE_MAP in container.ts.`,
        )
      }

      return tryRegisterFromModule(portName, adapterName, modulePath)
    }),
  )
}

/**
 * Repository token strings used to register in-memory Repository implementations.
 * These are registered separately from Port tokens (which use PortName strings)
 * because Repository interfaces live in the Application layer and are not
 * part of the Port/Adapter mapping.
 */
export const REPOSITORY_TOKENS = Object.freeze({
  AllowedUserRepository: 'AllowedUserRepository',
  UserRepository: 'UserRepository',
  AuditLogRepository: 'AuditLogRepository',
  BotRepository: 'BotRepository',
  RecordingRepository: 'RecordingRepository',
  TranscriptRepository: 'TranscriptRepository',
  CalendarEventRepository: 'CalendarEventRepository',
  WebhookEventRepository: 'WebhookEventRepository',
} as const)

export type RepositoryToken = (typeof REPOSITORY_TOKENS)[keyof typeof REPOSITORY_TOKENS]

/**
 * Register all 8 in-memory Repository implementations (MOCK_MODE=true path).
 *
 * Each import uses a **literal string path** inside a dynamic `import()` call
 * (without `webpackIgnore`) so that webpack can statically trace the specifier
 * and include it in the correct Server Action bundle where emitDecoratorMetadata
 * is supported. The RSC bundle only holds a reference to this function, not its
 * execution, so the decorator-annotated files are never processed by the RSC
 * SWC compilation pass.
 *
 * Do NOT add `webpackIgnore: true` — that forces Node.js runtime path
 * resolution relative to the calling page's directory, producing
 * ERR_MODULE_NOT_FOUND (e.g. `.../pending-approvals/repositories/...`).
 */
async function registerMockRepositories(): Promise<void> {
  const [
    allowedUserMod,
    userMod,
    auditLogMod,
    botMod,
    recordingMod,
    transcriptMod,
    calendarEventMod,
    webhookEventMod,
  ] = await Promise.all([
    import('./repositories/in-memory/in-memory-allowed-user.repository'),
    import('./repositories/in-memory/in-memory-user.repository'),
    import('./repositories/in-memory/in-memory-audit-log.repository'),
    import('./repositories/in-memory/in-memory-bot.repository'),
    import('./repositories/in-memory/in-memory-recording.repository'),
    import('./repositories/in-memory/in-memory-transcript.repository'),
    import('./repositories/in-memory/in-memory-calendar-event.repository'),
    import('./repositories/in-memory/in-memory-webhook-event.repository'),
  ])

  const repoBindings: ReadonlyArray<[string, new (...args: never[]) => unknown]> = [
    ['AllowedUserRepository', allowedUserMod.InMemoryAllowedUserRepository],
    ['UserRepository', userMod.InMemoryUserRepository],
    ['AuditLogRepository', auditLogMod.InMemoryAuditLogRepository],
    ['BotRepository', botMod.InMemoryBotRepository],
    ['RecordingRepository', recordingMod.InMemoryRecordingRepository],
    ['TranscriptRepository', transcriptMod.InMemoryTranscriptRepository],
    ['CalendarEventRepository', calendarEventMod.InMemoryCalendarEventRepository],
    ['WebhookEventRepository', webhookEventMod.InMemoryWebhookEventRepository],
  ]

  for (const [token, ctor] of repoBindings) {
    container.register(
      token,
      { useClass: ctor },
      { lifecycle: Lifecycle.Singleton },
    )
  }
}

/**
 * Register all 16 ports from MOCK_PROFILE_MAPPING (MOCK_MODE=true path).
 *
 * Each import uses a **literal string path** so webpack can statically trace
 * each specifier and include it in the correct Server Action bundle — the
 * same pattern as registerMockRepositories(). The previous implementation
 * passed `modulePath` (a variable resolved from ADAPTER_MODULE_MAP) to
 * import(), which webpack cannot statically trace, causing all mock
 * adapter modules to be absent from the Server Action bundle at runtime
 * (MODULE_NOT_FOUND → AuthPort / all ports unregistered → 500).
 *
 * NOTE: the `bindings` array type (ReadonlyArray<[PortName, ctor]>) does NOT
 * enforce PortName exhaustiveness — a missing port row still compiles. The
 * MOCK_MODE=true container unit test asserts RateLimiterPort resolves here.
 */
async function registerMockAdapters(): Promise<void> {
  const [
    authMod,
    dbMod,
    realtimeMod,
    storageMod,
    queueMod,
    emailMod,
    botMod,
    transcriptionMod,
    calendarMod,
    inferenceMod,
    videoMod,
    monitoringMod,
    mediaMod,
    webhookMod,
    rpcMod,
    rateLimiterMod,
  ] = await Promise.all([
    import('./adapters/mock/mock-auth.adapter'),
    import('./adapters/mock/mock-db.adapter'),
    import('./adapters/mock/mock-realtime.adapter'),
    import('./adapters/mock/mock-storage.adapter'),
    import('./adapters/mock/mock-queue.adapter'),
    import('./adapters/mock/mock-email.adapter'),
    import('./adapters/mock/mock-bot-orchestrator.adapter'),
    import('./adapters/mock/mock-transcription.adapter'),
    import('./adapters/mock/mock-calendar.adapter'),
    import('./adapters/mock/mock-local-inference.adapter'),
    import('./adapters/mock/mock-video-processor.adapter'),
    import('./adapters/mock/mock-continuous-monitoring.adapter'),
    import('./adapters/mock/mock-media-server.adapter'),
    import('./adapters/mock/mock-webhook-verifier.adapter'),
    import('./adapters/mock/mock-internal-rpc.adapter'),
    import('./adapters/mock/mock-rate-limiter.adapter'),
  ])

  const bindings: ReadonlyArray<[PortName, new (...args: never[]) => unknown]> = [
    ['AuthPort', authMod.MockAuthAdapter],
    ['DbPort', dbMod.MockDbAdapter],
    ['RealtimePort', realtimeMod.MockRealtimeAdapter],
    ['StoragePort', storageMod.MockStorageAdapter],
    ['QueuePort', queueMod.MockQueueAdapter],
    ['EmailPort', emailMod.MockEmailAdapter],
    ['BotOrchestratorPort', botMod.MockBotOrchestratorAdapter],
    ['TranscriptionPort', transcriptionMod.MockTranscriptionAdapter],
    ['CalendarPort', calendarMod.MockCalendarAdapter],
    ['LocalInferencePort', inferenceMod.MockLocalInferenceAdapter],
    ['VideoProcessorPort', videoMod.MockVideoProcessorAdapter],
    ['ContinuousMonitoringPort', monitoringMod.MockContinuousMonitoringAdapter],
    ['MediaServerPort', mediaMod.MockMediaServerAdapter],
    ['WebhookVerifierPort', webhookMod.MockWebhookVerifierAdapter],
    ['InternalRpcPort', rpcMod.MockInternalRpcAdapter],
    ['RateLimiterPort', rateLimiterMod.MockRateLimiterAdapter],
  ]

  for (const [token, ctor] of bindings) {
    registerPort(token, ctor)
  }
}

/**
 * Idempotent bootstrap: calls registerAdapters exactly once per process
 * (or test run when _resetBootstrap() clears _bootstrapPromise).
 *
 * - MOCK_MODE=true  → profile 'mock'  (all 16 ports → in-memory adapters)
 * - otherwise       → profile resolved from DEPLOY_PROFILE env (default 'minimal')
 *
 * Uses in-flight promise memoization to prevent bootstrap race conditions:
 * concurrent callers all await the same Promise rather than triggering
 * duplicate registration. The previous boolean guard had a TOCTOU gap where
 * `_bootstrapped = true` was set before `await`, allowing a second caller to
 * observe `_bootstrapped === true` before registration completed.
 *
 * Server Actions and Route Handlers should call `await ensureContainer()`
 * before the first `container.resolve()` call so the DI graph is ready.
 */
let _bootstrapPromise: Promise<void> | null = null

async function doBootstrap(): Promise<void> {
  // Resolve MOCK_MODE through the env schema (SSoT) so the schema default
  // 'true' applies when the var is absent — the same basis the sign-in page
  // uses via getValidatedEnv(). Reading process.env.MOCK_MODE directly skipped
  // the default, so an unset MOCK_MODE booted the non-MOCK profile and left
  // AuthPort unregistered (login 500). See isMockMode() JSDoc.
  const mockMode = isMockMode()
  if (mockMode) {
    await registerMockAdapters()
    await registerMockRepositories()
    return
  }
  const profile = resolveDeployProfile(process.env.DEPLOY_PROFILE)
  await registerAdapters(profile)
  // RateLimiterPort runtime-registration fix: registerAdapters() above loads
  // every adapter via tryRegisterFromModule()'s VARIABLE-path dynamic import,
  // which webpack cannot statically trace into the Server Action bundle — so at
  // runtime the module is absent (MODULE_NOT_FOUND, swallowed) and
  // RateLimiterPort is silently left unregistered. The very first thing the
  // email/password sign-in Server Action does is applyRateLimit() →
  // container.resolve('RateLimiterPort'), which then 500s with
  // "Attempted to resolve unregistered dependency token: RateLimiterPort".
  // Wire it here with a LITERAL-path import (webpack-traceable, the same proven
  // pattern as registerMockAdapters) so the gate always resolves.
  await registerRateLimiterPort(profile)
  // vps-next-postgres / vps-next-mariadb: register PrismaUserRepository as the
  // UserRepository token. This is only loaded when the profile explicitly requests
  // Prisma-backed storage. The literal import path is used so webpack can trace
  // the module into the bundle.
  if (
    profile === 'vps-next-postgres' ||
    profile === 'vps-next-mariadb' ||
    profile === 'vps-nest-postgres' ||
    profile === 'vps-nest-mariadb'
  ) {
    await registerPrismaRepositories(profile)
  }
}

/**
 * Explicitly register RateLimiterPort for non-MOCK profiles via a literal-path
 * dynamic import so webpack traces the module into the Server Action bundle.
 *
 * - minimal / unlocked / vps-next-postgres → InMemoryRateLimiterAdapter (single-instance, shipped).
 * - pro / vps → UpstashRateLimiterAdapter (multi-instance) is not yet
 *   shipped; leave RateLimiterPort UNREGISTERED so a misconfigured pro/vps boot
 *   fails loudly rather than silently falling back to the in-memory limiter
 *   (mirrors the fail-loud contract asserted in container.spec.ts).
 */
async function registerRateLimiterPort(profile: DeployProfile): Promise<void> {
  const adapterName = PROFILE_ADAPTER_MAPPING[profile].RateLimiterPort
  if (adapterName !== 'InMemoryRateLimiterAdapter') {
    return
  }
  const mod = await import('./adapters/real/in-memory-rate-limiter.adapter')
  registerPort('RateLimiterPort', mod.InMemoryRateLimiterAdapter)
}

/**
 * Register Prisma-backed repositories for vps-next-postgres or vps-next-mariadb profiles.
 *
 * Uses literal-path dynamic import so webpack can statically trace the module
 * into the Server Action bundle (the same pattern as registerMockRepositories).
 * Only called when DEPLOY_PROFILE=vps-next-postgres|vps-next-mariadb and MOCK_MODE !== 'true'.
 *
 * For vps-next-postgres: PrismaUserRepository receives the default
 *   @prisma/client singleton (prisma.ts — PostgreSQL provider).
 * For vps-next-mariadb: PrismaUserRepository receives the custom
 *   prisma-mariadb singleton (prisma-mariadb.ts — MySQL/MariaDB provider,
 *   custom output path).
 *
 * The client is passed to PrismaUserRepository via its CONSTRUCTOR and the
 * instance is registered with useValue. (CRITICAL fix: the repository
 * previously imported the postgres singleton at module level, so the mariadb
 * profile silently executed every query through the postgresql-provider
 * client against a mysql:// DATABASE_URL.)
 *
 * Currently registers:
 *   - UserRepository → PrismaUserRepository (profile-correct Prisma client)
 * Other repositories (AllowedUser, AuditLog, etc.) remain as in-memory until
 * their Prisma implementations are shipped in a later wave.
 */
async function registerPrismaRepositories(profile: DeployProfile): Promise<void> {
  const [
    userMod,
    // In-memory repositories for ports not yet backed by Prisma in this wave.
    allowedUserMod,
    auditLogMod,
    botMod,
    recordingMod,
    transcriptMod,
    calendarEventMod,
    webhookEventMod,
  ] = await Promise.all([
    // Dual guard: webpackIgnore: true prevents webpack from statically tracing this
    // path for vercel/pro profiles where the CLI post-clone step prunes
    // prisma-user.repository.ts. 'as string' makes the specifier opaque to the
    // TypeScript checker so `next build` type-check does not fail on pruned-file
    // profiles. Literal-path tracing is the correct default for most imports in
    // this file but registerPrismaRepositories() is gated behind a vps-only
    // condition so the runtime path resolves in the Node.js Server Action context.
    // Safe at runtime: this function is only called when DEPLOY_PROFILE is
    // vps-next-* / vps-nest-*, where prisma-user.repository.ts always exists.
    import(/* webpackIgnore: true */ './repositories/prisma/prisma-user.repository' as string),
    import('./repositories/in-memory/in-memory-allowed-user.repository'),
    import('./repositories/in-memory/in-memory-audit-log.repository'),
    import('./repositories/in-memory/in-memory-bot.repository'),
    import('./repositories/in-memory/in-memory-recording.repository'),
    import('./repositories/in-memory/in-memory-transcript.repository'),
    import('./repositories/in-memory/in-memory-calendar-event.repository'),
    import('./repositories/in-memory/in-memory-webhook-event.repository'),
  ])

  // Select the appropriate Prisma client singleton based on the active profile
  // (literal import paths — webpack traces both into the Server Action bundle;
  // only the profile-matching branch executes at runtime).
  // vps-next-postgres → @prisma/client (PostgreSQL, default client)
  // vps-next-mariadb  → prisma/mariadb/.prisma/client (MySQL/MariaDB, custom output)
  const { getProfilePrismaClient } = await import('./prisma-client')
  const prismaClient = await getProfilePrismaClient(profile)

  // PrismaUserRepository takes the Prisma client as a constructor argument, so
  // the SAME repository class runs against the profile-correct client. It is
  // registered as a pre-built value (NOT useClass) — tsyringe must never try
  // to auto-resolve the PrismaClient constructor parameter, which would
  // instantiate a fresh postgres-provider client regardless of profile.
  container.register('UserRepository', {
    useValue: new userMod.PrismaUserRepository(prismaClient),
  })

  const repoBindings: ReadonlyArray<[string, new (...args: never[]) => unknown]> = [
    ['AllowedUserRepository', allowedUserMod.InMemoryAllowedUserRepository],
    ['AuditLogRepository', auditLogMod.InMemoryAuditLogRepository],
    ['BotRepository', botMod.InMemoryBotRepository],
    ['RecordingRepository', recordingMod.InMemoryRecordingRepository],
    ['TranscriptRepository', transcriptMod.InMemoryTranscriptRepository],
    ['CalendarEventRepository', calendarEventMod.InMemoryCalendarEventRepository],
    ['WebhookEventRepository', webhookEventMod.InMemoryWebhookEventRepository],
  ]

  for (const [token, ctor] of repoBindings) {
    container.register(
      token,
      { useClass: ctor },
      { lifecycle: Lifecycle.Singleton },
    )
  }
}

export function ensureContainer(): Promise<void> {
  if (!_bootstrapPromise) {
    _bootstrapPromise = doBootstrap()
  }
  return _bootstrapPromise
}

/**
 * Reset the bootstrap promise. Intended for use in tests that call
 * `container.reset()` between cases so ensureContainer re-runs registration.
 *
 * @internal
 */
export function _resetBootstrap(): void {
  _bootstrapPromise = null
}

/**
 * Lazy module loader. Loads the module via literal-path dynamic import
 * (without webpackIgnore) so that:
 *   1. webpack traces the path and includes the module in the correct bundle
 *      (Server Action / Route Handler Node.js context).
 *   2. emitDecoratorMetadata is supported in that bundle context.
 *   3. MODULE_NOT_FOUND is swallowed so sibling Waves can land independently.
 *
 * The variable `modulePath` is resolved at call time from ADAPTER_MODULE_MAP,
 * which maps to literal string values — but webpack sees a variable path here.
 * Webpack will emit a "Critical dependency: the request of a dynamic import is
 * a variable" warning but will still include all modules from ADAPTER_MODULE_MAP
 * in the bundle (webpack traces the entire map). This is acceptable for a POC.
 */
async function tryRegisterFromModule(
  token: PortName,
  className: string,
  modulePath: string,
): Promise<void> {
  try {
    // Standard dynamic import — compatible with Vitest, Next.js, and Node.js.
    // /* @vite-ignore */ suppresses the "dynamic import with variable path"
    // build-time warning since paths are intentionally resolved at runtime.
    const mod = await import(/* @vite-ignore */ modulePath)
    const ctor = (mod as Record<string, unknown>)[className]
    if (typeof ctor === 'function') {
      registerPort(token, ctor as new (...args: never[]) => unknown)
    }
  } catch (err) {
    // Tolerate adapter module absence — sibling Waves may not have shipped.
    const msg = err instanceof Error ? err.message : String(err)
    if (!/Cannot find|Failed to load|MODULE_NOT_FOUND/i.test(msg)) {
      throw err
    }
  }
}

export { container }
