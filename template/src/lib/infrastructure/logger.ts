// src/lib/infrastructure/logger.ts
// Pino structured logger (draft 06 §3.4).
// Honors LOG_LEVEL env, adds service/env base context, redacts auth headers,
// and exposes createRequestLogger() for per-request correlation-id binding.

import pino, { type Logger, type LoggerOptions } from 'pino'

export interface CreateLoggerOptions {
  readonly level?: string
  readonly stream?: { write: (msg: string) => void }
}

/**
 * Build a fresh pino logger. Used by the module-level `logger` default and by
 * tests that need to capture output via a custom stream.
 */
export function createLogger(opts: CreateLoggerOptions = {}): Logger {
  const options: LoggerOptions = {
    level: opts.level ?? 'info',
    formatters: {
      level: (label) => ({ level: label }),
    },
    base: {
      service: 'recall-poc',
      env: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'local',
    },
    redact: {
      paths: [
        'headers.Authorization',
        'headers.authorization',
        'req.headers.Authorization',
        'req.headers.authorization',
        '*.Authorization',
        '*.authorization',
      ],
      censor: '[Redacted]',
    },
  }
  return opts.stream ? pino(options, opts.stream) : pino(options)
}

/** Module-level default logger. Honors LOG_LEVEL at import time. */
export const logger: Logger = createLogger({ level: process.env.LOG_LEVEL })

/** Per-request child logger carrying a correlation id binding. */
export function createRequestLogger(correlationId: string): Logger {
  return logger.child({ correlationId })
}
