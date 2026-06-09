// src/lib/application/ports/continuous-monitoring.port.ts
// ContinuousMonitoringPort — abstracts log + metric emission.
// `severity` aligns with RFC 5424; adapters map to vendor levels.

import type { Result } from '../result'
import type { ExternalServiceError } from '../../domain/errors'

export type LogSeverity =
  | 'debug'
  | 'info'
  | 'warn'
  | 'error'
  | 'fatal'

export interface ContinuousMonitoringPort {
  log(
    severity: LogSeverity,
    message: string,
    context?: Readonly<Record<string, unknown>>,
  ): void

  recordMetric(input: {
    name: string
    value: number
    tags?: Readonly<Record<string, string>>
  }): Promise<Result<void, ExternalServiceError>>
}
