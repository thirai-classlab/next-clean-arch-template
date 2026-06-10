// src/lib/infrastructure/adapters/mock/mock-auth.seed.ts
// MOCK_MODE seed credential constants (ui-M-4, task-37 Step 7 SSoT).
//
// Extracted from mock-auth.adapter.ts so that Server Components (Home /
// sign-in pages) can read the seed defaults WITHOUT importing the
// `@injectable` MockAuthAdapter class. Importing the adapter pulls the
// tsyringe decorator graph into Next.js static page-data collection, which
// evaluates `@injectable()` before `reflect-metadata` is loaded → build error
// ("tsyringe requires a reflect polyfill"). This pure module has no tsyringe /
// node:crypto dependency, so it is safe to import from any runtime.
//
// The env override path (MOCK_SEED_EMAIL / MOCK_SEED_PASSWORD) is respected at
// import time; callers that need runtime override should also read process.env.

import type { Role } from '../../../domain/value-objects/role'

/** Default seed admin email for MOCK_MODE sign-in. */
export const SEED_EMAIL = process.env.MOCK_SEED_EMAIL ?? 'test@classlab.co.jp'
/** Default seed admin password for MOCK_MODE sign-in. */
export const SEED_PASSWORD = process.env.MOCK_SEED_PASSWORD ?? 'password123'
/** Seed user is treated as admin (matches MOCK full-admin demo DoD). */
export const SEED_ROLE: Role = 'admin'
