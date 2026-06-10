/**
 * Hermetic env for e2e bootstrap (CI / fresh checkout has no .env).
 *
 * Runs via jest `setupFiles` BEFORE any module import, so values are in
 * place when ConfigModule.forRoot() eagerly validates process.env.
 *
 * - LOGIN_STRATEGY=both: POST /auth/login returns 405 under the default
 *   'sso' strategy; these suites exercise both credential and SSO paths.
 */
process.env.LOGIN_STRATEGY = process.env.LOGIN_STRATEGY ?? 'both'
