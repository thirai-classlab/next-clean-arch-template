// src/lib/infrastructure/adapters/mock/mock-continuous-monitoring.adapter.ts
// Captures logs + metrics in-memory for inspection.

import { injectable } from 'tsyringe'
import type {
  ContinuousMonitoringPort,
  LogSeverity,
} from '../../../application/ports/continuous-monitoring.port'
import { ok, type Result } from '../../../application/result'
import type { ExternalServiceError } from '../../../domain/errors'

interface LogEntry {
  readonly severity: LogSeverity
  readonly message: string
  readonly context?: Readonly<Record<string, unknown>>
}

interface MetricEntry {
  readonly name: string
  readonly value: number
  readonly tags?: Readonly<Record<string, string>>
}

@injectable()
export class MockContinuousMonitoringAdapter implements ContinuousMonitoringPort {
  readonly logs: LogEntry[] = []
  readonly metrics: MetricEntry[] = []

  log(
    severity: LogSeverity,
    message: string,
    context?: Readonly<Record<string, unknown>>,
  ): void {
    this.logs.push({ severity, message, context })
  }

  async recordMetric(input: {
    name: string
    value: number
    tags?: Readonly<Record<string, string>>
  }): Promise<Result<void, ExternalServiceError>> {
    this.metrics.push(input)
    return ok(undefined as void)
  }
}
