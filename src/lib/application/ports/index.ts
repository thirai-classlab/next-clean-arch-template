// src/lib/application/ports/index.ts
// Barrel for the 16 Application-layer Ports (draft 06 §1.4 + task-36).
// Adapters live in the Infrastructure layer (added in a later task).

export type { AuthPort } from './auth.port'
export type { DbPort } from './db.port'
export type { RealtimePort } from './realtime.port'
export type { StoragePort } from './storage.port'
export type { QueuePort } from './queue.port'
export type { EmailPort } from './email.port'
export type { BotOrchestratorPort } from './bot-orchestrator.port'
export type { TranscriptionPort } from './transcription.port'
export type { CalendarPort } from './calendar.port'
export type { LocalInferencePort } from './local-inference.port'
export type { VideoProcessorPort } from './video-processor.port'
export type { ContinuousMonitoringPort, LogSeverity } from './continuous-monitoring.port'
export type { MediaServerPort } from './media-server.port'
export type { WebhookVerifierPort } from './webhook-verifier.port'
export type { InternalRpcPort } from './internal-rpc.port'
export type {
  RateLimiterPort,
  RateLimitResult,
  RateLimitOptions,
} from './rate-limiter.port'
