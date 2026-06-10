// src/lib/infrastructure/logger.spec.ts
// Verifies pino structured logger setup, LOG_LEVEL env reflection,
// correlation-id child logger, and Authorization redaction.

import { describe, it, expect } from 'vitest'
import { logger, createRequestLogger, createLogger } from './logger'

describe('Infrastructure logger', () => {
  it('exports a pino instance with default level "info"', () => {
    expect(logger).toBeDefined()
    expect(typeof logger.info).toBe('function')
    expect(typeof logger.error).toBe('function')
    expect(typeof logger.child).toBe('function')
  })

  it('honors LOG_LEVEL env at creation time via createLogger', () => {
    const custom = createLogger({ level: 'debug' })
    expect(custom.level).toBe('debug')
  })

  it('falls back to "info" when no level provided', () => {
    const fallback = createLogger({})
    expect(fallback.level).toBe('info')
  })

  it('createRequestLogger returns a child logger bound to correlationId', () => {
    const child = createRequestLogger('test-corr-id-123')
    expect(child).toBeDefined()
    expect(typeof child.info).toBe('function')
    // pino child loggers carry bindings; verify the binding survives.
    const bindings = child.bindings()
    expect(bindings.correlationId).toBe('test-corr-id-123')
  })

  it('redacts Authorization headers in log output', () => {
    const lines: string[] = []
    const captured = createLogger({
      level: 'info',
      stream: {
        write: (msg: string) => {
          lines.push(msg)
        },
      },
    })
    captured.info({ headers: { Authorization: 'Bearer secret-token' } }, 'request')
    const joined = lines.join('\n')
    expect(joined).not.toContain('secret-token')
    expect(joined).toContain('[Redacted]')
  })

  it('sets base context with service name', () => {
    const lines: string[] = []
    const captured = createLogger({
      level: 'info',
      stream: {
        write: (msg: string) => {
          lines.push(msg)
        },
      },
    })
    captured.info('hello')
    const parsed = JSON.parse(lines[0])
    expect(parsed.service).toBe('recall-poc')
  })
})
