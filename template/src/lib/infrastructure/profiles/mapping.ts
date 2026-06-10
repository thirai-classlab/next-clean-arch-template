// src/lib/infrastructure/profiles/mapping.ts
// 4 Deploy Profile × 16 Port adapter mapping table (draft 06 §3.2 + task-36).
// Adapter values are class-name strings — the actual modules are loaded
// lazily via dynamic import in container.ts to keep tree-shake intact.
//
// IMPORTANT: values must match the exported class name in the adapter file
// exactly. container.ts uses these strings as property keys on the dynamic
// import result (mod[className]). A mismatch silently skips registration.

export const DEPLOY_PROFILES = ['minimal', 'unlocked', 'pro', 'vps', 'vps-next-postgres', 'vps-next-mariadb', 'vps-nest-postgres', 'vps-nest-mariadb'] as const
export type DeployProfile = (typeof DEPLOY_PROFILES)[number]

export const PORT_NAMES = [
  'AuthPort',
  'DbPort',
  'RealtimePort',
  'StoragePort',
  'QueuePort',
  'EmailPort',
  'BotOrchestratorPort',
  'TranscriptionPort',
  'CalendarPort',
  'LocalInferencePort',
  'VideoProcessorPort',
  'ContinuousMonitoringPort',
  'MediaServerPort',
  'WebhookVerifierPort',
  'InternalRpcPort',
  'RateLimiterPort',
] as const
export type PortName = (typeof PORT_NAMES)[number]

export type ProfileMapping = Readonly<Record<PortName, string>>

/**
 * Mapping for MOCK_MODE=true — all 16 ports → in-memory mock adapters.
 * Kept separate from PROFILE_ADAPTER_MAPPING (which only covers the 4
 * deploy profiles).
 *
 * NOTE: this table is for tsc type enforcement (`Record<PortName, string>`)
 * and test reference only. At container runtime the mock bindings are wired by
 * the literal imports in registerMockAdapters() — doBootstrap() calls
 * registerMockAdapters() directly when MOCK_MODE=true, never
 * registerAdapters('mock').
 */
export const MOCK_PROFILE_MAPPING: Readonly<ProfileMapping> = Object.freeze({
  AuthPort: 'MockAuthAdapter',
  DbPort: 'MockDbAdapter',
  RealtimePort: 'MockRealtimeAdapter',
  StoragePort: 'MockStorageAdapter',
  QueuePort: 'MockQueueAdapter',
  EmailPort: 'MockEmailAdapter',
  BotOrchestratorPort: 'MockBotOrchestratorAdapter',
  TranscriptionPort: 'MockTranscriptionAdapter',
  CalendarPort: 'MockCalendarAdapter',
  LocalInferencePort: 'MockLocalInferenceAdapter',
  VideoProcessorPort: 'MockVideoProcessorAdapter',
  ContinuousMonitoringPort: 'MockContinuousMonitoringAdapter',
  MediaServerPort: 'MockMediaServerAdapter',
  WebhookVerifierPort: 'MockWebhookVerifierAdapter',
  InternalRpcPort: 'MockInternalRpcAdapter',
  RateLimiterPort: 'MockRateLimiterAdapter',
})

export const PROFILE_ADAPTER_MAPPING: Readonly<
  Record<DeployProfile, ProfileMapping>
> = Object.freeze({
  minimal: Object.freeze({
    AuthPort: 'SupabaseAuthAdapter',
    DbPort: 'SupabaseDbAdapter',
    RealtimePort: 'SupabaseRealtimeAdapter',
    StoragePort: 'SupabaseStorageAdapter',
    QueuePort: 'VercelQueueAdapter',
    EmailPort: 'ResendEmailAdapter',
    BotOrchestratorPort: 'MockBotOrchestratorAdapter',
    TranscriptionPort: 'MockTranscriptionAdapter',
    CalendarPort: 'MockCalendarAdapter',
    LocalInferencePort: 'MockLocalInferenceAdapter',
    VideoProcessorPort: 'MockVideoProcessorAdapter',
    ContinuousMonitoringPort: 'VercelObservabilityAdapter',
    MediaServerPort: 'MockMediaServerAdapter',
    WebhookVerifierPort: 'RecallAiVerifierAdapter',
    InternalRpcPort: 'MockInternalRpcAdapter',
    RateLimiterPort: 'InMemoryRateLimiterAdapter',
  }),
  unlocked: Object.freeze({
    AuthPort: 'SupabaseAuthAdapter',
    DbPort: 'SupabaseDbAdapter',
    RealtimePort: 'SupabaseRealtimeAdapter',
    StoragePort: 'SupabaseStorageAdapter',
    QueuePort: 'VercelQueueAdapter',
    EmailPort: 'ResendEmailAdapter',
    BotOrchestratorPort: 'RecallAiBotAdapter',
    TranscriptionPort: 'RecallAiTranscriptionAdapter',
    CalendarPort: 'GoogleCalendarAdapter',
    LocalInferencePort: 'MockLocalInferenceAdapter',
    VideoProcessorPort: 'MockVideoProcessorAdapter',
    ContinuousMonitoringPort: 'VercelObservabilityAdapter',
    MediaServerPort: 'MockMediaServerAdapter',
    WebhookVerifierPort: 'RecallAiVerifierAdapter',
    InternalRpcPort: 'MockInternalRpcAdapter',
    RateLimiterPort: 'InMemoryRateLimiterAdapter',
  }),
  pro: Object.freeze({
    AuthPort: 'SupabaseAuthAdapter',
    DbPort: 'SupabaseDbAdapter',
    RealtimePort: 'SupabaseRealtimeAdapter',
    StoragePort: 'SupabaseStorageAdapter',
    QueuePort: 'VercelQueueAdapter',
    EmailPort: 'ResendEmailAdapter',
    BotOrchestratorPort: 'RecallAiBotAdapter',
    TranscriptionPort: 'RecallAiTranscriptionAdapter',
    CalendarPort: 'GoogleAndMsGraphCalendarAdapter',
    LocalInferencePort: 'OllamaInferenceAdapter',
    VideoProcessorPort: 'FfmpegVercelFluidAdapter',
    ContinuousMonitoringPort: 'VercelObservabilityAdapter',
    MediaServerPort: 'LivekitCloudMediaAdapter',
    WebhookVerifierPort: 'RecallAiVerifierAdapter',
    InternalRpcPort: 'MockInternalRpcAdapter',
    RateLimiterPort: 'UpstashRateLimiterAdapter',
  }),
  vps: Object.freeze({
    AuthPort: 'SupabaseAuthAdapter',
    DbPort: 'PostgresDbAdapter',
    RealtimePort: 'LivekitWebSocketAdapter',
    StoragePort: 'S3CompatibleStorageAdapter',
    QueuePort: 'RailwayBullMQAdapter',
    EmailPort: 'SmtpEmailAdapter',
    BotOrchestratorPort: 'RecallAiBotAdapter',
    TranscriptionPort: 'RecallAiTranscriptionAdapter',
    CalendarPort: 'GoogleAndMsGraphCalendarAdapter',
    LocalInferencePort: 'OllamaInferenceAdapter',
    VideoProcessorPort: 'FfmpegSelfHostedAdapter',
    ContinuousMonitoringPort: 'PrometheusGrafanaAdapter',
    MediaServerPort: 'LivekitSelfHostedMediaAdapter',
    WebhookVerifierPort: 'RecallAiVerifierAdapter',
    InternalRpcPort: 'HttpRpcAdapter',
    RateLimiterPort: 'UpstashRateLimiterAdapter',
  }),
  // vps-next-postgres: Self-hosted VPS with PostgreSQL + NextAuth v5 (no Supabase).
  // AuthPort: NextAuthAdapter (NextAuth v5 JWT strategy + PrismaAdapter + bcrypt).
  // DbPort: PostgresDbAdapter (same as vps — direct Postgres connection via Prisma).
  // All non-auth ports mirror the vps profile (self-hosted infrastructure stack).
  // RateLimiterPort: InMemoryRateLimiterAdapter (Upstash upgrade path available later).
  'vps-next-postgres': Object.freeze({
    AuthPort: 'NextAuthAdapter',
    DbPort: 'PostgresDbAdapter',
    RealtimePort: 'LivekitWebSocketAdapter',
    StoragePort: 'S3CompatibleStorageAdapter',
    QueuePort: 'RailwayBullMQAdapter',
    EmailPort: 'SmtpEmailAdapter',
    BotOrchestratorPort: 'RecallAiBotAdapter',
    TranscriptionPort: 'RecallAiTranscriptionAdapter',
    CalendarPort: 'GoogleAndMsGraphCalendarAdapter',
    LocalInferencePort: 'OllamaInferenceAdapter',
    VideoProcessorPort: 'FfmpegSelfHostedAdapter',
    ContinuousMonitoringPort: 'PrometheusGrafanaAdapter',
    MediaServerPort: 'LivekitSelfHostedMediaAdapter',
    WebhookVerifierPort: 'RecallAiVerifierAdapter',
    InternalRpcPort: 'HttpRpcAdapter',
    RateLimiterPort: 'InMemoryRateLimiterAdapter',
  }),
  // vps-next-mariadb: Self-hosted VPS with MariaDB 11 + NextAuth v5 (no Supabase).
  // Identical auth stack to vps-next-postgres (NextAuth v5 JWT strategy + bcrypt).
  // DbPort: PostgresDbAdapter — naming artifact; the actual database is MariaDB
  // but the adapter class is shared since Prisma abstracts the provider.
  // The key differentiator is the Prisma client: prisma-mariadb.ts imports from
  // prisma/mariadb/.prisma/client (mysql provider) rather than @prisma/client.
  // RateLimiterPort: InMemoryRateLimiterAdapter (same as vps-next-postgres).
  'vps-next-mariadb': Object.freeze({
    AuthPort: 'NextAuthAdapter',
    DbPort: 'PostgresDbAdapter',
    RealtimePort: 'LivekitWebSocketAdapter',
    StoragePort: 'S3CompatibleStorageAdapter',
    QueuePort: 'RailwayBullMQAdapter',
    EmailPort: 'SmtpEmailAdapter',
    BotOrchestratorPort: 'RecallAiBotAdapter',
    TranscriptionPort: 'RecallAiTranscriptionAdapter',
    CalendarPort: 'GoogleAndMsGraphCalendarAdapter',
    LocalInferencePort: 'OllamaInferenceAdapter',
    VideoProcessorPort: 'FfmpegSelfHostedAdapter',
    ContinuousMonitoringPort: 'PrometheusGrafanaAdapter',
    MediaServerPort: 'LivekitSelfHostedMediaAdapter',
    WebhookVerifierPort: 'RecallAiVerifierAdapter',
    InternalRpcPort: 'HttpRpcAdapter',
    RateLimiterPort: 'InMemoryRateLimiterAdapter',
  }),
  // vps-nest-postgres: Self-hosted VPS with PostgreSQL + NestJS auth (no Supabase, no NextAuth).
  // AuthPort: NestAuthAdapter — thin pass-through that delegates auth calls to Nest REST API.
  // DbPort: PostgresDbAdapter (same as vps-next-postgres — direct Postgres via Prisma).
  // All non-auth ports mirror the vps-next-postgres profile.
  // RateLimiterPort: InMemoryRateLimiterAdapter (single-instance; Upstash upgrade path available).
  'vps-nest-postgres': Object.freeze({
    AuthPort: 'NestAuthAdapter',
    DbPort: 'PostgresDbAdapter',
    RealtimePort: 'LivekitWebSocketAdapter',
    StoragePort: 'S3CompatibleStorageAdapter',
    QueuePort: 'RailwayBullMQAdapter',
    EmailPort: 'SmtpEmailAdapter',
    BotOrchestratorPort: 'RecallAiBotAdapter',
    TranscriptionPort: 'RecallAiTranscriptionAdapter',
    CalendarPort: 'GoogleAndMsGraphCalendarAdapter',
    LocalInferencePort: 'OllamaInferenceAdapter',
    VideoProcessorPort: 'FfmpegSelfHostedAdapter',
    ContinuousMonitoringPort: 'PrometheusGrafanaAdapter',
    MediaServerPort: 'LivekitSelfHostedMediaAdapter',
    WebhookVerifierPort: 'RecallAiVerifierAdapter',
    InternalRpcPort: 'HttpRpcAdapter',
    RateLimiterPort: 'InMemoryRateLimiterAdapter',
  }),
  // vps-nest-mariadb: Self-hosted VPS with MariaDB 11 + NestJS auth (no Supabase, no NextAuth).
  // Identical auth stack to vps-nest-postgres (Nest JWT HS256), only database provider differs.
  // DbPort: PostgresDbAdapter — naming artifact; Prisma abstracts the provider.
  // DATABASE_URL uses mysql:// scheme; getProfilePrismaClient() selects the mysql-generated client.
  'vps-nest-mariadb': Object.freeze({
    AuthPort: 'NestAuthAdapter',
    DbPort: 'PostgresDbAdapter',
    RealtimePort: 'LivekitWebSocketAdapter',
    StoragePort: 'S3CompatibleStorageAdapter',
    QueuePort: 'RailwayBullMQAdapter',
    EmailPort: 'SmtpEmailAdapter',
    BotOrchestratorPort: 'RecallAiBotAdapter',
    TranscriptionPort: 'RecallAiTranscriptionAdapter',
    CalendarPort: 'GoogleAndMsGraphCalendarAdapter',
    LocalInferencePort: 'OllamaInferenceAdapter',
    VideoProcessorPort: 'FfmpegSelfHostedAdapter',
    ContinuousMonitoringPort: 'PrometheusGrafanaAdapter',
    MediaServerPort: 'LivekitSelfHostedMediaAdapter',
    WebhookVerifierPort: 'RecallAiVerifierAdapter',
    InternalRpcPort: 'HttpRpcAdapter',
    RateLimiterPort: 'InMemoryRateLimiterAdapter',
  }),
})
