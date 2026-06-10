// Shared HTTP pipeline configuration for the Nest API.
//
// Extracted from main.ts so the SAME middleware stack (helmet security
// headers, cookie-parser, CORS, validation pipe) is exercised by both the
// production bootstrap and the e2e suite — the e2e tests assert helmet
// headers against exactly what production serves.

import type { INestApplication } from '@nestjs/common'
import { ValidationPipe } from '@nestjs/common'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cookieParser = require('cookie-parser') as () => unknown
import helmet from 'helmet'

export function configureApp(app: INestApplication): INestApplication {
  // Security headers (HIGH fix): helmet sets X-Content-Type-Options: nosniff,
  // X-Frame-Options, Referrer-Policy, removes X-Powered-By, etc.
  //   - frameguard DENY (API responses must never be framed)
  //   - Referrer-Policy: strict-origin-when-cross-origin
  //   - HSTS only in production (no-op over plain http anyway; avoids
  //     polluting localhost during development)
  // Registered FIRST so every response — including errors — carries headers.
  app.use(
    helmet({
      frameguard: { action: 'deny' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      hsts: process.env.NODE_ENV === 'production' ? undefined : false,
    }),
  )

  // Cookie parser middleware — must be registered BEFORE the Nest request
  // pipeline so that req.cookies is populated when JwtStrategy extracts
  // the 'nest-session-token' cookie.
  app.use(cookieParser())

  // CORS: allow the Next.js origin to send credentials (JWT cookie).
  const nextAppUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  app.enableCors({
    origin: nextAppUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })

  // Global validation pipe: auto-strip unknown fields, transform payloads.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  )

  return app
}
