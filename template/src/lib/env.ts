// apps/web/src/lib/env.ts
// task #37 Step 4 (auth-login-strategy, entry #46 / E-H-01 / security M-R3-1):
// validated env accessor. Server-side コードが `process.env` を直接読まずに
// type-safe な FullEnv を取得するための単一窓口。
//
// 利用方針:
//   - **Server 専用** (Server Component / Server Action / Route Handler)。
//     `NEXT_PUBLIC_` でない env (LOGIN_STRATEGY / MOCK_SEED_* 等) を読むため、
//     Client Component から呼ばないこと。
//   - prebuild の `pnpm env:validate` が通過済みであれば parse は成功する。
//     runtime で fail した場合は設定不備として throw する (fail-loud)。
//
// scripts/ は src/ の外なので相対 path で import する (@/* alias は ./src/* のみ)。

import {
  deploymentEnvSchema,
  fullEnvSchema,
  type FullEnv,
} from '../../scripts/env-schema'

/**
 * Parse + validate `process.env` against fullEnvSchema and return the typed
 * result. Defaults declared in the schema (LOGIN_STRATEGY='sso', MOCK_MODE='true',
 * RATE_LIMIT_ENABLED='false', …) are applied here, so callers always receive a
 * fully-populated, type-safe object.
 *
 * @throws if validation fails (treated as a configuration error). Error messages
 *   never contain secret values (zod built-in messages are value-free).
 */
export function getValidatedEnv(): FullEnv {
  const result = fullEnvSchema.safeParse(process.env)
  if (!result.success) {
    const fields = Object.keys(result.error.flatten().fieldErrors).join(', ')
    throw new Error(
      `Invalid environment configuration (fields: ${fields || 'cross-field refinement'}). ` +
        'Run `pnpm env:validate` for details.',
    )
  }
  return result.data
}

/**
 * Resolve the effective `MOCK_MODE` flag through the env **schema** (the same
 * SSoT used by the sign-in page), applying the schema default `'true'` when the
 * env var is missing.
 *
 * This is the canonical accessor the DI container (`container.ts doBootstrap`)
 * must use instead of reading `process.env.MOCK_MODE` directly. Reading the raw
 * env bypasses the schema default, so an absent `MOCK_MODE` resolved to `false`
 * and the container booted the non-MOCK adapter profile — leaving `AuthPort` /
 * `RateLimiterPort` unregistered and producing a login 500. Resolving through
 * the schema fixes that two-tier inconsistency (the sign-in page already saw
 * the default via `getValidatedEnv()`).
 *
 * Only the `MOCK_MODE` field is parsed (via `deploymentEnvSchema`), NOT the full
 * `fullEnvSchema`, so the cross-field `superRefine` rules (e.g. "RECALL_API_KEY
 * required when MOCK_MODE=false") do not fire here. Bootstrap must succeed for
 * any deploy profile so the container can wire the correct adapters; field-level
 * config errors surface at request time via `getValidatedEnv()`.
 *
 * An explicit `MOCK_MODE=false` is honored (returns `false`); the default only
 * applies when the var is entirely absent.
 *
 * @returns `true` when MOCK_MODE resolves to `'true'` (schema default), else `false`.
 */
export function isMockMode(): boolean {
  const result = deploymentEnvSchema
    .pick({ MOCK_MODE: true })
    .safeParse(process.env)
  // deploymentEnvSchema.MOCK_MODE is an enum(['true','false']).default('true'),
  // so a parse failure can only mean an out-of-enum value was supplied
  // explicitly; treat that as non-mock (fail toward the production profile).
  return result.success ? result.data.MOCK_MODE === 'true' : false
}
