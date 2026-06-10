// src/lib/infrastructure/adapters/mock/index.ts
// Barrel for the 16 in-memory Mock Port adapters (task-1 Wave 5-J + task-36).
// Used by the Mock DI profile (registered in Wave 5-H container).

export { MockAuthAdapter } from './mock-auth.adapter'
export { MockDbAdapter } from './mock-db.adapter'
export { MockRealtimeAdapter } from './mock-realtime.adapter'
export { MockStorageAdapter } from './mock-storage.adapter'
export { MockQueueAdapter } from './mock-queue.adapter'
export { MockEmailAdapter } from './mock-email.adapter'
export { MockBotOrchestratorAdapter } from './mock-bot-orchestrator.adapter'
export { MockTranscriptionAdapter } from './mock-transcription.adapter'
export { MockCalendarAdapter } from './mock-calendar.adapter'
export { MockLocalInferenceAdapter } from './mock-local-inference.adapter'
export { MockVideoProcessorAdapter } from './mock-video-processor.adapter'
export { MockContinuousMonitoringAdapter } from './mock-continuous-monitoring.adapter'
export { MockMediaServerAdapter } from './mock-media-server.adapter'
export { MockWebhookVerifierAdapter } from './mock-webhook-verifier.adapter'
export { MockInternalRpcAdapter } from './mock-internal-rpc.adapter'
export { MockRateLimiterAdapter } from './mock-rate-limiter.adapter'
