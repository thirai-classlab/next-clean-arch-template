import { describe, it, expectTypeOf } from 'vitest'
import type {
  ContinuousMonitoringPort,
  LogSeverity,
} from './continuous-monitoring.port'
import type { Result } from '../result'
import type { ExternalServiceError } from '../../domain/errors'

describe('ContinuousMonitoringPort (type-level)', () => {
  it('LogSeverity union: debug|info|warn|error|fatal', () => {
    expectTypeOf<LogSeverity>().toEqualTypeOf<
      'debug' | 'info' | 'warn' | 'error' | 'fatal'
    >()
  })

  it('log: (severity, message, context?) => void', () => {
    expectTypeOf<ContinuousMonitoringPort['log']>().toEqualTypeOf<
      (
        severity: LogSeverity,
        message: string,
        context?: Readonly<Record<string, unknown>>,
      ) => void
    >()
  })

  it('recordMetric: (input) => Promise<Result<void, ExternalServiceError>>', () => {
    expectTypeOf<ContinuousMonitoringPort['recordMetric']>().toEqualTypeOf<
      (input: {
        name: string
        value: number
        tags?: Readonly<Record<string, string>>
      }) => Promise<Result<void, ExternalServiceError>>
    >()
  })
})
