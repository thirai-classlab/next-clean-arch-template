/**
 * env-validate.ts + env-schema.ts の単体テスト
 *
 * TDD: これらのテストを先に書き (RED)、schema/validator を実装して GREEN にする
 * 環境: node (jsdom 不要)
 */
import { execSync } from 'node:child_process'
import path from 'node:path'
import { describe, it, expect } from 'vitest'
import {
  supabaseEnvSchema,
  oauthEnvSchema,
  adminEnvSchema,
  deploymentEnvSchema,
  recallEnvSchema,
  vercelEnvSchema,
  fullEnvSchema,
} from '../env-schema'

// ── テスト用ヘルパー ──────────────────────────────────────────────

/** 全 env を揃えた valid なベース値 */
const validEnv = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://abcdefghijklm.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'a'.repeat(32),
  SUPABASE_SERVICE_ROLE_KEY: 'b'.repeat(32),
  GOOGLE_OAUTH_CLIENT_ID: '1234567890-abc.apps.googleusercontent.com',
  GOOGLE_OAUTH_CLIENT_SECRET: 'x'.repeat(20),
  INITIAL_ADMIN_EMAIL: 'admin@classlab.co.jp',
  ALLOWED_ADMIN_EMAIL_DOMAIN: undefined,
  DEPLOY_PROFILE: 'minimal',
  MOCK_MODE: 'true',
  RECALL_API_KEY: undefined,
  WEBHOOK_PUBLIC_URL: undefined,
  VERCEL_PROJECT_ID: undefined,
  VERCEL_ORG_ID: undefined,
  SUPABASE_DB_URL: undefined,
}

// ── supabaseEnvSchema ─────────────────────────────────────────────

describe('supabaseEnvSchema', () => {
  it('valid な Supabase env を accept する', () => {
    const result = supabaseEnvSchema.safeParse({
      NEXT_PUBLIC_SUPABASE_URL: 'https://abcdefghijklm.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'a'.repeat(32),
      SUPABASE_SERVICE_ROLE_KEY: 'b'.repeat(32),
    })
    expect(result.success).toBe(true)
  })

  it('SUPABASE_DB_URL が optional のため未指定でも accept する (D-M-04)', () => {
    const result = supabaseEnvSchema.safeParse({
      NEXT_PUBLIC_SUPABASE_URL: 'https://abcdefghijklm.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'a'.repeat(32),
      SUPABASE_SERVICE_ROLE_KEY: 'b'.repeat(32),
    })
    expect(result.success).toBe(true)
  })

  it('SUPABASE_DB_URL が valid URL の場合 accept する (D-M-04)', () => {
    const result = supabaseEnvSchema.safeParse({
      NEXT_PUBLIC_SUPABASE_URL: 'https://abcdefghijklm.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'a'.repeat(32),
      SUPABASE_SERVICE_ROLE_KEY: 'b'.repeat(32),
      SUPABASE_DB_URL: 'postgresql://postgres:password@db.example.supabase.co:5432/postgres',
    })
    expect(result.success).toBe(true)
  })

  it('SUPABASE_DB_URL が URL でない場合 error を返す (D-M-04)', () => {
    const result = supabaseEnvSchema.safeParse({
      NEXT_PUBLIC_SUPABASE_URL: 'https://abcdefghijklm.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'a'.repeat(32),
      SUPABASE_SERVICE_ROLE_KEY: 'b'.repeat(32),
      SUPABASE_DB_URL: 'not-a-url',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.errors.map((e) => e.path[0])
      expect(paths).toContain('SUPABASE_DB_URL')
    }
  })

  it('NEXT_PUBLIC_SUPABASE_URL が URL でない場合 error を返す', () => {
    const result = supabaseEnvSchema.safeParse({
      NEXT_PUBLIC_SUPABASE_URL: 'not-a-url',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'a'.repeat(32),
      SUPABASE_SERVICE_ROLE_KEY: 'b'.repeat(32),
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.errors.map((e) => e.path[0])
      expect(paths).toContain('NEXT_PUBLIC_SUPABASE_URL')
    }
  })

  it('NEXT_PUBLIC_SUPABASE_ANON_KEY が 32 文字未満の場合 error を返す', () => {
    const result = supabaseEnvSchema.safeParse({
      NEXT_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'short',
      SUPABASE_SERVICE_ROLE_KEY: 'b'.repeat(32),
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.errors.map((e) => e.path[0])
      expect(paths).toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    }
  })

  it('SUPABASE_SERVICE_ROLE_KEY が unset でも category schema 単体では accept する (P0: optional 化、必須化は fullEnvSchema.superRefine が担う)', () => {
    // P0 fix: 3 var は MOCK_MODE=true (fresh checkout demo) を許すため category 単体では
    // optional。MOCK_MODE !== 'true' 時の必須化は fullEnvSchema (P0-b/c) で検証する。
    const result = supabaseEnvSchema.safeParse({
      NEXT_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'a'.repeat(32),
      // SUPABASE_SERVICE_ROLE_KEY なし
    })
    expect(result.success).toBe(true)
  })
})

// ── oauthEnvSchema ────────────────────────────────────────────────

describe('oauthEnvSchema', () => {
  it('valid な OAuth env を accept する', () => {
    const result = oauthEnvSchema.safeParse({
      GOOGLE_OAUTH_CLIENT_ID: '1234567890-abc.apps.googleusercontent.com',
      GOOGLE_OAUTH_CLIENT_SECRET: 'x'.repeat(20),
    })
    expect(result.success).toBe(true)
  })

  it('GOOGLE_OAUTH_CLIENT_ID が .apps.googleusercontent.com で終わらない場合 error を返す', () => {
    const result = oauthEnvSchema.safeParse({
      GOOGLE_OAUTH_CLIENT_ID: 'invalid-client-id',
      GOOGLE_OAUTH_CLIENT_SECRET: 'x'.repeat(20),
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.errors.map((e) => e.path[0])
      expect(paths).toContain('GOOGLE_OAUTH_CLIENT_ID')
    }
  })

  it('GOOGLE_OAUTH_CLIENT_SECRET が 20 文字未満の場合 error を返す', () => {
    const result = oauthEnvSchema.safeParse({
      GOOGLE_OAUTH_CLIENT_ID: '1234.apps.googleusercontent.com',
      GOOGLE_OAUTH_CLIENT_SECRET: 'short',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.errors.map((e) => e.path[0])
      expect(paths).toContain('GOOGLE_OAUTH_CLIENT_SECRET')
    }
  })

  // task #37 Step 4: 各フィールド個別 optional 化 (code HIGH-R3-1)
  it('両フィールド未指定でも accept する (個別 optional 化)', () => {
    const result = oauthEnvSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('optional でも invalid な値 (.googleusercontent.com で終わらない) は error', () => {
    // optional 化後も「値あり + format 不正」は依然 error (code MEDIUM-R4-1)
    const result = oauthEnvSchema.safeParse({
      GOOGLE_OAUTH_CLIENT_ID: 'invalid',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.errors.map((e) => e.path[0])
      expect(paths).toContain('GOOGLE_OAUTH_CLIENT_ID')
    }
  })
})

// ── adminEnvSchema ────────────────────────────────────────────────

describe('adminEnvSchema', () => {
  it('valid な email アドレスを accept する (domain 制約なし)', () => {
    // D-H-01 fix: ALLOWED_ADMIN_EMAIL_DOMAIN 未指定なら domain 制約なし
    const result = adminEnvSchema.safeParse({
      INITIAL_ADMIN_EMAIL: 'admin@classlab.co.jp',
    })
    expect(result.success).toBe(true)
  })

  it('ALLOWED_ADMIN_EMAIL_DOMAIN 未指定なら他 domain の email も accept する', () => {
    // D-H-01 fix: template 横展開時に他 domain でも fresh install 成功
    const result = adminEnvSchema.safeParse({
      INITIAL_ADMIN_EMAIL: 'admin@example.com',
    })
    expect(result.success).toBe(true)
  })

  it('ALLOWED_ADMIN_EMAIL_DOMAIN 指定 + 一致する domain は accept する', () => {
    const result = adminEnvSchema.safeParse({
      INITIAL_ADMIN_EMAIL: 'admin@classlab.co.jp',
      ALLOWED_ADMIN_EMAIL_DOMAIN: '@classlab.co.jp',
    })
    expect(result.success).toBe(true)
  })

  it('email format でない値で error を返す', () => {
    const result = adminEnvSchema.safeParse({
      INITIAL_ADMIN_EMAIL: 'not-an-email',
    })
    expect(result.success).toBe(false)
  })
})

// ── deploymentEnvSchema ───────────────────────────────────────────

describe('deploymentEnvSchema', () => {
  it('valid な enum 値を accept する', () => {
    for (const profile of ['minimal', 'unlocked', 'pro', 'vps', 'vps-next-postgres', 'vps-next-mariadb'] as const) {
      const result = deploymentEnvSchema.safeParse({
        DEPLOY_PROFILE: profile,
        MOCK_MODE: 'true',
      })
      expect(result.success).toBe(true)
    }
  })

  it('DEPLOY_PROFILE のデフォルト値は minimal', () => {
    const result = deploymentEnvSchema.safeParse({
      MOCK_MODE: 'true',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.DEPLOY_PROFILE).toBe('minimal')
    }
  })

  it('MOCK_MODE のデフォルト値は true', () => {
    const result = deploymentEnvSchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.MOCK_MODE).toBe('true')
    }
  })

  it('DEPLOY_PROFILE に無効な enum 値を与えると error を返す', () => {
    const result = deploymentEnvSchema.safeParse({
      DEPLOY_PROFILE: 'invalid',
      MOCK_MODE: 'true',
    })
    expect(result.success).toBe(false)
  })

  // ── RATE_LIMIT_* (task #36 Step 3, OWASP A07) regression ───────────
  // Field 定義のみ (superRefine guard 本体は login task #37 Step 4)。新 field は
  // 全て .default() 付きの optional 扱いで、既存 valid env は通過継続する。

  it('RATE_LIMIT_ENABLED は "true" / "false" を accept する', () => {
    for (const enabled of ['true', 'false'] as const) {
      const result = deploymentEnvSchema.safeParse({
        MOCK_MODE: 'true',
        RATE_LIMIT_ENABLED: enabled,
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.RATE_LIMIT_ENABLED).toBe(enabled)
      }
    }
  })

  it('RATE_LIMIT_ENABLED に無効な値を与えると error を返す', () => {
    const result = deploymentEnvSchema.safeParse({
      MOCK_MODE: 'true',
      RATE_LIMIT_ENABLED: 'yes',
    })
    expect(result.success).toBe(false)
  })

  it('RATE_LIMIT_MAX_ATTEMPTS / RATE_LIMIT_WINDOW_SEC は正整数を accept する', () => {
    const result = deploymentEnvSchema.safeParse({
      MOCK_MODE: 'true',
      RATE_LIMIT_MAX_ATTEMPTS: '3',
      RATE_LIMIT_WINDOW_SEC: '60',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      // coerce.number で string → number 化される。
      expect(result.data.RATE_LIMIT_MAX_ATTEMPTS).toBe(3)
      expect(result.data.RATE_LIMIT_WINDOW_SEC).toBe(60)
    }
  })

  it('RATE_LIMIT_MAX_ATTEMPTS に 0 / 負数 / 小数 / 非数値を与えると error を返す', () => {
    for (const bad of ['0', '-1', '1.5', 'abc'] as const) {
      const result = deploymentEnvSchema.safeParse({
        MOCK_MODE: 'true',
        RATE_LIMIT_MAX_ATTEMPTS: bad,
      })
      expect(result.success).toBe(false)
    }
  })

  it('RATE_LIMIT_WINDOW_SEC に 0 / 負数 / 小数 / 非数値を与えると error を返す', () => {
    for (const bad of ['0', '-30', '90.5', 'xyz'] as const) {
      const result = deploymentEnvSchema.safeParse({
        MOCK_MODE: 'true',
        RATE_LIMIT_WINDOW_SEC: bad,
      })
      expect(result.success).toBe(false)
    }
  })

  it('RATE_LIMIT_* を全省略しても default で success (後方互換)', () => {
    const result = deploymentEnvSchema.safeParse({ MOCK_MODE: 'true' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.RATE_LIMIT_ENABLED).toBe('false')
      expect(result.data.RATE_LIMIT_MAX_ATTEMPTS).toBe(5)
      expect(result.data.RATE_LIMIT_WINDOW_SEC).toBe(900)
    }
  })
})

// ── recallEnvSchema ───────────────────────────────────────────────

describe('recallEnvSchema', () => {
  it('全て optional のため空オブジェクトでも accept する', () => {
    const result = recallEnvSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('WEBHOOK_PUBLIC_URL が URL でない場合 error を返す', () => {
    const result = recallEnvSchema.safeParse({
      WEBHOOK_PUBLIC_URL: 'not-a-url',
    })
    expect(result.success).toBe(false)
  })

  it('valid な WEBHOOK_PUBLIC_URL を accept する', () => {
    const result = recallEnvSchema.safeParse({
      WEBHOOK_PUBLIC_URL: 'https://example.ngrok.io/webhook',
    })
    expect(result.success).toBe(true)
  })
})

// ── vercelEnvSchema ───────────────────────────────────────────────

describe('vercelEnvSchema', () => {
  it('全て optional のため空オブジェクトでも accept する', () => {
    const result = vercelEnvSchema.safeParse({})
    expect(result.success).toBe(true)
  })
})

// ── fullEnvSchema (統合 + refinement) ────────────────────────────

describe('fullEnvSchema', () => {
  it('全 env 揃って exit 0 相当 (success=true)', () => {
    const result = fullEnvSchema.safeParse(validEnv)
    expect(result.success).toBe(true)
  })

  it('MOCK_MODE=false かつ RECALL_API_KEY unset で error を返す (refinement)', () => {
    const env = {
      ...validEnv,
      MOCK_MODE: 'false',
      RECALL_API_KEY: undefined,
    }
    const result = fullEnvSchema.safeParse(env)
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.errors.map((e) => e.path[0])
      expect(paths).toContain('RECALL_API_KEY')
    }
  })

  it('MOCK_MODE=true かつ RECALL_API_KEY unset でも success (optional)', () => {
    const env = {
      ...validEnv,
      MOCK_MODE: 'true',
      RECALL_API_KEY: undefined,
    }
    const result = fullEnvSchema.safeParse(env)
    expect(result.success).toBe(true)
  })

  it('MOCK_MODE=false かつ RECALL_API_KEY 存在で success', () => {
    const env = {
      ...validEnv,
      MOCK_MODE: 'false',
      RECALL_API_KEY: 'recall-key-xxxxx',
    }
    const result = fullEnvSchema.safeParse(env)
    expect(result.success).toBe(true)
  })

  it('MOCK_MODE=false + SUPABASE_SERVICE_ROLE_KEY unset で error + field path が含まれる (P0: 実 API では必須)', () => {
    // E-M-02 fix: as any を satisfies で書き換え (biome-ignore 削減)
    // P0 fix: MOCK_MODE=false (実 API) では 3 var が必須 (refinement 6)。
    const { SUPABASE_SERVICE_ROLE_KEY: _, ...rest } = validEnv satisfies typeof validEnv
    const result = fullEnvSchema.safeParse({
      ...rest,
      MOCK_MODE: 'false',
      RECALL_API_KEY: 'recall-key-xxxxx',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.errors.map((e) => e.path[0])
      expect(paths).toContain('SUPABASE_SERVICE_ROLE_KEY')
    }
  })

  it('GOOGLE_OAUTH_CLIENT_ID 形式不正 (.apps.googleusercontent.com で終わらない) で error', () => {
    const env = { ...validEnv, GOOGLE_OAUTH_CLIENT_ID: 'bad-client-id' }
    const result = fullEnvSchema.safeParse(env)
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.errors.map((e) => e.path[0])
      expect(paths).toContain('GOOGLE_OAUTH_CLIENT_ID')
    }
  })

  it('INITIAL_ADMIN_EMAIL は ALLOWED_ADMIN_EMAIL_DOMAIN 未指定なら他 domain でも success (D-H-01)', () => {
    // D-H-01 fix: domain 制約は ALLOWED_ADMIN_EMAIL_DOMAIN で動的化
    const env = { ...validEnv, INITIAL_ADMIN_EMAIL: 'admin@otherdomain.com' }
    const result = fullEnvSchema.safeParse(env)
    expect(result.success).toBe(true)
  })

  it('ALLOWED_ADMIN_EMAIL_DOMAIN 指定 + 不一致 email で error (D-H-01 domain 制約)', () => {
    const env = {
      ...validEnv,
      INITIAL_ADMIN_EMAIL: 'admin@otherdomain.com',
      ALLOWED_ADMIN_EMAIL_DOMAIN: '@classlab.co.jp',
    }
    const result = fullEnvSchema.safeParse(env)
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.errors.map((e) => e.path[0])
      expect(paths).toContain('INITIAL_ADMIN_EMAIL')
    }
  })

  it('ALLOWED_ADMIN_EMAIL_DOMAIN 指定 + 一致する email で success (D-H-01)', () => {
    const env = {
      ...validEnv,
      INITIAL_ADMIN_EMAIL: 'admin@classlab.co.jp',
      ALLOWED_ADMIN_EMAIL_DOMAIN: '@classlab.co.jp',
    }
    const result = fullEnvSchema.safeParse(env)
    expect(result.success).toBe(true)
  })

  it('error flatten で fieldErrors にアクセスできる (MOCK_MODE=false で SERVICE_ROLE_KEY unset)', () => {
    // E-M-02 fix: as any を satisfies で書き換え (biome-ignore 削減)
    // P0 fix: MOCK_MODE=false で必須化された SERVICE_ROLE_KEY の error を flatten 検証する。
    const { SUPABASE_SERVICE_ROLE_KEY: _, ...rest } = validEnv satisfies typeof validEnv
    const result = fullEnvSchema.safeParse({
      ...rest,
      MOCK_MODE: 'false',
      RECALL_API_KEY: 'recall-key-xxxxx',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const flatten = result.error.flatten()
      expect(flatten.fieldErrors).toBeDefined()
      expect(flatten.fieldErrors.SUPABASE_SERVICE_ROLE_KEY).toBeDefined()
      expect(flatten.fieldErrors.SUPABASE_SERVICE_ROLE_KEY!.length).toBeGreaterThan(0)
    }
  })

  // ── task #37 Step 4: LOGIN_STRATEGY + OAuth conditional + guards ──────
  // oauthEnvSchema を個別 optional 化したため、OAuth 必須/不要は LOGIN_STRATEGY ×
  // MOCK_MODE の組合せで superRefine が判定する (refinement 3/4/5)。

  it('(a) email-pass + OAuth unset + RATE_LIMIT_ENABLED=true で success', () => {
    const { GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, ...rest } =
      validEnv satisfies typeof validEnv
    const env = {
      ...rest,
      LOGIN_STRATEGY: 'email-pass',
      RATE_LIMIT_ENABLED: 'true', // refinement 5: email-pass は rate-limit 必須
    }
    const result = fullEnvSchema.safeParse(env)
    expect(result.success).toBe(true)
  })

  it('(b) sso + OAuth unset + MOCK_MODE=false で error (OAuth conditional)', () => {
    const { GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, ...rest } =
      validEnv satisfies typeof validEnv
    const env = {
      ...rest,
      LOGIN_STRATEGY: 'sso',
      MOCK_MODE: 'false',
      RECALL_API_KEY: 'recall-key-xxxxx', // MOCK_MODE=false なので RECALL も必須
    }
    const result = fullEnvSchema.safeParse(env)
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.errors.map((e) => e.path[0])
      expect(paths).toContain('GOOGLE_OAUTH_CLIENT_ID')
      expect(paths).toContain('GOOGLE_OAUTH_CLIENT_SECRET')
    }
  })

  it('(c) both + OAuth set + RATE_LIMIT_ENABLED=true で success', () => {
    const env = {
      ...validEnv,
      LOGIN_STRATEGY: 'both',
      RATE_LIMIT_ENABLED: 'true',
    }
    const result = fullEnvSchema.safeParse(env)
    expect(result.success).toBe(true)
  })

  it('(d) MOCK_MODE=true + OAuth unset で success (MOCK は OAuth 不要)', () => {
    const { GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, ...rest } =
      validEnv satisfies typeof validEnv
    const env = {
      ...rest,
      LOGIN_STRATEGY: 'sso',
      MOCK_MODE: 'true', // minimal + true は refinement 4 を満たす
    }
    const result = fullEnvSchema.safeParse(env)
    expect(result.success).toBe(true)
  })

  it('(e) MOCK_MODE=false + sso + OAuth set で success', () => {
    const env = {
      ...validEnv,
      LOGIN_STRATEGY: 'sso',
      MOCK_MODE: 'false',
      RECALL_API_KEY: 'recall-key-xxxxx',
    }
    const result = fullEnvSchema.safeParse(env)
    expect(result.success).toBe(true)
  })

  // ── vps-next-postgres profile (refinement 3 skip + refinement 7) ──────
  // vps-next-postgres は NextAuth 系 (AUTH_GOOGLE_ID/SECRET) を使い、Supabase 系
  // GOOGLE_OAUTH_CLIENT_* / Supabase 3 var を一切参照しない。refinement 3/6 は
  // skip され、refinement 7 が DATABASE_URL / NEXTAUTH_* + (SSO 時) AUTH_GOOGLE_*
  // を必須化する。

  /** vps-next-postgres + MOCK_MODE=false の valid なベース値 (sso) */
  const validVpsEnv = {
    DEPLOY_PROFILE: 'vps-next-postgres',
    MOCK_MODE: 'false',
    LOGIN_STRATEGY: 'sso',
    DATABASE_URL: 'postgresql://appuser:secret@localhost:5432/appdb',
    NEXTAUTH_SECRET: 's'.repeat(32),
    NEXTAUTH_URL: 'https://app.example.com',
    AUTH_GOOGLE_ID: 'vps-google-client-id',
    AUTH_GOOGLE_SECRET: 'vps-google-client-secret',
    RECALL_API_KEY: 'recall-key-xxxxx', // refinement 1 (MOCK_MODE=false)
  }

  it('(vps-a) vps-next-postgres + MOCK_MODE=true は他 var 全不在でも success (refinement 4 例外、build-time 検証)', () => {
    const env = {
      DEPLOY_PROFILE: 'vps-next-postgres',
      MOCK_MODE: 'true',
    }
    const result = fullEnvSchema.safeParse(env)
    expect(result.success).toBe(true)
  })

  it('(vps-b) vps-next-postgres + sso + MOCK_MODE=false は GOOGLE_OAUTH_CLIENT_* 不在でも success (refinement 3 skip)', () => {
    // AUTH_GOOGLE_* (NextAuth 系) のみ設定。Supabase 系 GOOGLE_OAUTH_CLIENT_* と
    // Supabase 3 var は不在 — refinement 3/6 が vps-next-postgres を skip する回帰 pin。
    const result = fullEnvSchema.safeParse(validVpsEnv)
    expect(result.success).toBe(true)
  })

  it('(vps-c) vps-next-postgres + sso + MOCK_MODE=false + AUTH_GOOGLE_* 不在で error (refinement 7、GOOGLE_OAUTH_CLIENT_* は要求しない)', () => {
    const { AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, ...rest } =
      validVpsEnv satisfies typeof validVpsEnv
    const result = fullEnvSchema.safeParse(rest)
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.errors.map((e) => e.path[0])
      expect(paths).toContain('AUTH_GOOGLE_ID')
      expect(paths).toContain('AUTH_GOOGLE_SECRET')
      // Supabase 系フィールドを誤って要求しない (HIGH: 起動不能 bug の回帰 pin)
      expect(paths).not.toContain('GOOGLE_OAUTH_CLIENT_ID')
      expect(paths).not.toContain('GOOGLE_OAUTH_CLIENT_SECRET')
    }
  })

  it('(vps-d) vps-next-postgres + MOCK_MODE=false + 基盤 3 var 不在で error (refinement 7)', () => {
    const { DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL, ...rest } =
      validVpsEnv satisfies typeof validVpsEnv
    const result = fullEnvSchema.safeParse(rest)
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.errors.map((e) => e.path[0])
      expect(paths).toContain('DATABASE_URL')
      expect(paths).toContain('NEXTAUTH_SECRET')
      expect(paths).toContain('NEXTAUTH_URL')
    }
  })

  it('(vps-e) vps-next-postgres + email-pass + MOCK_MODE=false は AUTH_GOOGLE_* 不在でも success (SSO なし)', () => {
    const { AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, ...rest } =
      validVpsEnv satisfies typeof validVpsEnv
    const env = {
      ...rest,
      LOGIN_STRATEGY: 'email-pass',
      RATE_LIMIT_ENABLED: 'true', // refinement 5
    }
    const result = fullEnvSchema.safeParse(env)
    expect(result.success).toBe(true)
  })

  it('(vps-f) vps-next-postgres + MOCK_MODE=false は Supabase 3 var + INITIAL_ADMIN_EMAIL 不要 (refinement 6 skip)', () => {
    const result = fullEnvSchema.safeParse(validVpsEnv)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.NEXT_PUBLIC_SUPABASE_URL).toBeUndefined()
      expect(result.data.INITIAL_ADMIN_EMAIL).toBeUndefined()
    }
  })

  it('email-pass + RATE_LIMIT_ENABLED!=true で error (refinement 5 guard)', () => {
    const { GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, ...rest } =
      validEnv satisfies typeof validEnv
    const env = {
      ...rest,
      LOGIN_STRATEGY: 'both',
      RATE_LIMIT_ENABLED: 'false',
    }
    const result = fullEnvSchema.safeParse(env)
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.errors.map((e) => e.path[0])
      expect(paths).toContain('RATE_LIMIT_ENABLED')
    }
  })

  it('DEPLOY_PROFILE!=minimal + MOCK_MODE=true で error (H-3 bypass guard)', () => {
    const env = {
      ...validEnv,
      DEPLOY_PROFILE: 'pro',
      MOCK_MODE: 'true',
    }
    const result = fullEnvSchema.safeParse(env)
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.errors.map((e) => e.path[0])
      expect(paths).toContain('MOCK_MODE')
    }
  })

  it('optional 化後も GOOGLE_OAUTH_CLIENT_ID に invalid 値で error (format 検証維持)', () => {
    // optional フィールドへの「値あり + format 不正」は依然 error (code MEDIUM-R4-1)
    const env = { ...validEnv, GOOGLE_OAUTH_CLIENT_ID: 'invalid' }
    const result = fullEnvSchema.safeParse(env)
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.errors.map((e) => e.path[0])
      expect(paths).toContain('GOOGLE_OAUTH_CLIENT_ID')
    }
  })

  // ── vps-next-mariadb profile (refinement 8) ──────────────────────────
  // Mirror of vps-next-postgres tests (vps-a through vps-f) for the MariaDB variant.
  // Key difference: DATABASE_URL must use mysql:// scheme (refinement 8 shape check).

  /** vps-next-mariadb + MOCK_MODE=false の valid なベース値 (sso) */
  const validMariadbEnv = {
    DEPLOY_PROFILE: 'vps-next-mariadb',
    MOCK_MODE: 'false',
    LOGIN_STRATEGY: 'sso',
    DATABASE_URL: 'mysql://appuser:secret@localhost:3307/appdb',
    NEXTAUTH_SECRET: 's'.repeat(32),
    NEXTAUTH_URL: 'https://app.example.com',
    AUTH_GOOGLE_ID: 'mariadb-google-client-id',
    AUTH_GOOGLE_SECRET: 'mariadb-google-client-secret',
    RECALL_API_KEY: 'recall-key-xxxxx', // refinement 1 (MOCK_MODE=false)
  }

  it('(mariadb-a) vps-next-mariadb + MOCK_MODE=true は他 var 全不在でも success (refinement 4 例外、build-time 検証)', () => {
    const env = {
      DEPLOY_PROFILE: 'vps-next-mariadb',
      MOCK_MODE: 'true',
    }
    const result = fullEnvSchema.safeParse(env)
    expect(result.success).toBe(true)
  })

  it('(mariadb-b) vps-next-mariadb + MOCK_MODE=false + mysql:// DATABASE_URL + NEXTAUTH creds は success', () => {
    const result = fullEnvSchema.safeParse(validMariadbEnv)
    expect(result.success).toBe(true)
  })

  it('(mariadb-c) vps-next-mariadb + MOCK_MODE=false + postgresql:// DATABASE_URL は DATABASE_URL error (mysql:// shape guard)', () => {
    const env = {
      ...validMariadbEnv,
      DATABASE_URL: 'postgresql://appuser:secret@localhost:5432/appdb',
    }
    const result = fullEnvSchema.safeParse(env)
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.errors.map((e) => e.path[0])
      expect(paths).toContain('DATABASE_URL')
    }
  })

  it('(mariadb-d) vps-next-mariadb + MOCK_MODE=false + 基盤 3 var 不在で error (refinement 8)', () => {
    const { DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL, ...rest } =
      validMariadbEnv satisfies typeof validMariadbEnv
    const result = fullEnvSchema.safeParse(rest)
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.errors.map((e) => e.path[0])
      expect(paths).toContain('DATABASE_URL')
      expect(paths).toContain('NEXTAUTH_SECRET')
      expect(paths).toContain('NEXTAUTH_URL')
    }
  })

  it('(mariadb-e) vps-next-mariadb + email-pass + MOCK_MODE=false は AUTH_GOOGLE_* 不在でも success (SSO なし)', () => {
    const { AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, ...rest } =
      validMariadbEnv satisfies typeof validMariadbEnv
    const env = {
      ...rest,
      LOGIN_STRATEGY: 'email-pass',
      RATE_LIMIT_ENABLED: 'true', // refinement 5
    }
    const result = fullEnvSchema.safeParse(env)
    expect(result.success).toBe(true)
  })

  it('(mariadb-f) vps-next-mariadb + MOCK_MODE=false は Supabase 3 var + INITIAL_ADMIN_EMAIL 不要 (refinement 6 skip)', () => {
    const result = fullEnvSchema.safeParse(validMariadbEnv)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.NEXT_PUBLIC_SUPABASE_URL).toBeUndefined()
      expect(result.data.INITIAL_ADMIN_EMAIL).toBeUndefined()
    }
  })

  it('secret 値が zod error message に含まれない (secret leak 防止)', () => {
    const secretValue = 'SUPER_SECRET_VALUE_DO_NOT_LOG'
    const env = {
      ...validEnv,
      // 形式エラーを起こすために短い key を使う
      NEXT_PUBLIC_SUPABASE_ANON_KEY: secretValue.slice(0, 5), // 短すぎる
    }
    const result = fullEnvSchema.safeParse(env)
    expect(result.success).toBe(false)
    if (!result.success) {
      const errorJson = JSON.stringify(result.error.errors)
      // zod の built-in error message は値を含まない (デフォルト動作の確認)
      expect(errorJson).not.toContain(secretValue)
    }
  })

  // ── FIX-D: D-3 追加テスト (task #37 Step 5) ──────────────────────

  it('(D-3a) LOGIN_STRATEGY=email-pass 単独 + RATE_LIMIT_ENABLED=false → error で path に RATE_LIMIT_ENABLED 含む (refinement 5)', () => {
    // refinement 5: email-pass/both は RATE_LIMIT_ENABLED=true が必須。
    // 既存テスト "(email-pass + RATE_LIMIT_ENABLED!=true で error)" は LOGIN_STRATEGY=both で検証。
    // このテストは email-pass 単独のケースを明示的に追加する。
    const { GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, ...rest } =
      validEnv satisfies typeof validEnv
    const env = {
      ...rest,
      LOGIN_STRATEGY: 'email-pass',
      RATE_LIMIT_ENABLED: 'false', // refinement 5 違反
    }
    const result = fullEnvSchema.safeParse(env)
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.errors.map((e) => e.path[0])
      expect(paths).toContain('RATE_LIMIT_ENABLED')
    }
  })

  it('(D-3b) GOOGLE_OAUTH_CLIENT_SECRET に短い値を渡すと format error (optional 化後も検証維持)', () => {
    // oauthEnvSchema 個別 optional 化後も、値あり + format 不正は依然 error (code MEDIUM-R4-1)。
    // CLIENT_ID の対称ケース (CLIENT_SECRET 側) を明示的にカバーする。
    const env = {
      ...validEnv,
      GOOGLE_OAUTH_CLIENT_SECRET: 'short', // 20 文字未満
    }
    const result = fullEnvSchema.safeParse(env)
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.errors.map((e) => e.path[0])
      expect(paths).toContain('GOOGLE_OAUTH_CLIENT_SECRET')
    }
  })

  // ── P0 fix (task-8 publish blocker): MOCK_MODE=true 時に Supabase 3 var +
  //    INITIAL_ADMIN_EMAIL を optional 化 (fresh checkout + MOCK_MODE=true で build 成功) ──
  // CLAUDE.md 中核制約「MOCK_MODE=true で API key 無しデモ可能」の復元。
  // MOCK_MODE=false は従来 required を維持 (regression 厳禁)。

  it('(P0-a) MOCK_MODE=true + Supabase 3 var + INITIAL_ADMIN_EMAIL 全不在で success (fresh checkout demo)', () => {
    // fresh checkout (.env.local なし) を模擬: 4 var を完全に省略
    const env = {
      MOCK_MODE: 'true',
      DEPLOY_PROFILE: 'minimal',
      LOGIN_STRATEGY: 'sso',
      // NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY /
      // SUPABASE_SERVICE_ROLE_KEY / INITIAL_ADMIN_EMAIL すべて不在
    }
    const result = fullEnvSchema.safeParse(env)
    expect(result.success).toBe(true)
  })

  it('(P0-b) MOCK_MODE=false + Supabase 3 var 不在で error (regression: required 維持)', () => {
    const env = {
      MOCK_MODE: 'false',
      DEPLOY_PROFILE: 'minimal',
      LOGIN_STRATEGY: 'sso',
      INITIAL_ADMIN_EMAIL: 'admin@classlab.co.jp',
      GOOGLE_OAUTH_CLIENT_ID: '1234567890-abc.apps.googleusercontent.com',
      GOOGLE_OAUTH_CLIENT_SECRET: 'x'.repeat(20),
      RECALL_API_KEY: 'recall-key-xxxxx',
      // Supabase 3 var 不在
    }
    const result = fullEnvSchema.safeParse(env)
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.errors.map((e) => e.path[0])
      expect(paths).toContain('NEXT_PUBLIC_SUPABASE_URL')
      expect(paths).toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY')
      expect(paths).toContain('SUPABASE_SERVICE_ROLE_KEY')
    }
  })

  it('(P0-c) MOCK_MODE=false + INITIAL_ADMIN_EMAIL 不在で error (regression: required 維持)', () => {
    const env = {
      ...validEnv,
      MOCK_MODE: 'false',
      RECALL_API_KEY: 'recall-key-xxxxx',
      INITIAL_ADMIN_EMAIL: undefined,
    }
    const result = fullEnvSchema.safeParse(env)
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.errors.map((e) => e.path[0])
      expect(paths).toContain('INITIAL_ADMIN_EMAIL')
    }
  })

  it('(P0-d) MOCK_MODE=true でも値ありの Supabase URL が invalid なら error (format 検証維持)', () => {
    // optional 化後も「値あり + format 不正」は依然 error
    const env = {
      MOCK_MODE: 'true',
      DEPLOY_PROFILE: 'minimal',
      LOGIN_STRATEGY: 'sso',
      NEXT_PUBLIC_SUPABASE_URL: 'not-a-url',
    }
    const result = fullEnvSchema.safeParse(env)
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.errors.map((e) => e.path[0])
      expect(paths).toContain('NEXT_PUBLIC_SUPABASE_URL')
    }
  })

  it('(P0-e) MOCK_MODE=true でも値ありの INITIAL_ADMIN_EMAIL が invalid なら error (format 検証維持)', () => {
    const env = {
      MOCK_MODE: 'true',
      DEPLOY_PROFILE: 'minimal',
      LOGIN_STRATEGY: 'sso',
      INITIAL_ADMIN_EMAIL: 'not-an-email',
    }
    const result = fullEnvSchema.safeParse(env)
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.errors.map((e) => e.path[0])
      expect(paths).toContain('INITIAL_ADMIN_EMAIL')
    }
  })
})

// ── env-validate.ts integration tests (B-M-03 + C-M-04) ──────────

describe('env-validate.ts (integration)', () => {
  /**
   * integration test: tsx scripts/env-validate.ts を実際に execSync で実行し
   * exit code と stderr を検証する。
   *
   * B-M-03 fix: env-validate.ts 本体 (loadEnvConfig + safeParse + process.exit) の E2E test
   * C-M-04 fix: MOCK_MODE=true + 全 env 揃って exit 0 / 必須 env unset で exit 1 検証
   */

  /** tsx で env-validate.ts を実行し { code, output } を返すヘルパー */
  function runValidate(
    env: Record<string, string | undefined>,
    opts: { skipEnvValidate?: boolean } = {},
  ): {
    code: number
    output: string
  } {
    // SKIP_ENV_VALIDATE はデフォルトで unset (テストが validation を実行するため)
    // opts.skipEnvValidate=true の場合のみ 'true' をセット
    const base = opts.skipEnvValidate
      ? { ...env, SKIP_ENV_VALIDATE: 'true' }
      : { ...env, SKIP_ENV_VALIDATE: undefined }
    // undefined を除去 (execSync env は string のみ)
    const cleanEnv = Object.fromEntries(
      Object.entries(base).filter(([, v]) => v !== undefined),
    ) as Record<string, string>

    try {
      const output = execSync('pnpm tsx scripts/env-validate.ts', {
        cwd: path.resolve(__dirname, '../..'),
        env: { ...process.env, ...cleanEnv },
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      })
      return { code: 0, output }
    } catch (err: unknown) {
      const execError = err as { status?: number; stdout?: string; stderr?: string }
      return {
        code: execError.status ?? 1,
        output: `${execError.stdout ?? ''}${execError.stderr ?? ''}`,
      }
    }
  }

  it('MOCK_MODE=true + 全 env 揃って exit 0 (success)', () => {
    const result = runValidate({
      NEXT_PUBLIC_SUPABASE_URL: 'https://abcdefghijklm.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'a'.repeat(32),
      SUPABASE_SERVICE_ROLE_KEY: 'b'.repeat(32),
      GOOGLE_OAUTH_CLIENT_ID: '1234567890-abc.apps.googleusercontent.com',
      GOOGLE_OAUTH_CLIENT_SECRET: 'x'.repeat(20),
      INITIAL_ADMIN_EMAIL: 'admin@classlab.co.jp',
      DEPLOY_PROFILE: 'minimal',
      MOCK_MODE: 'true',
    })
    expect(result.code).toBe(0)
    expect(result.output).toContain('All env variables validated successfully')
  })

  it('MOCK_MODE=false + SUPABASE_SERVICE_ROLE_KEY unset で exit 1 (P0: 実 API では validation failure)', () => {
    // P0 fix: MOCK_MODE=false (実 API) では SERVICE_ROLE_KEY 必須。空文字で inherited env を打消す。
    const result = runValidate({
      NEXT_PUBLIC_SUPABASE_URL: 'https://abcdefghijklm.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'a'.repeat(32),
      SUPABASE_SERVICE_ROLE_KEY: '', // intentionally empty (= unset)
      GOOGLE_OAUTH_CLIENT_ID: '1234567890-abc.apps.googleusercontent.com',
      GOOGLE_OAUTH_CLIENT_SECRET: 'x'.repeat(20),
      INITIAL_ADMIN_EMAIL: 'admin@classlab.co.jp',
      DEPLOY_PROFILE: 'minimal',
      MOCK_MODE: 'false',
      RECALL_API_KEY: 'recall-key-xxxxx',
      LOGIN_STRATEGY: 'sso',
    })
    expect(result.code).toBe(1)
    expect(result.output).toContain('Env validation failed')
    expect(result.output).toContain('SUPABASE_SERVICE_ROLE_KEY')
  })

  it('SKIP_ENV_VALIDATE=true で exit 0 (A-H-03 bypass)', () => {
    const result = runValidate({}, { skipEnvValidate: true })
    expect(result.code).toBe(0)
    expect(result.output).toContain('skipped')
  })

  it('(D-3c) MOCK_MODE=false + RECALL_API_KEY + OAuth set + LOGIN_STRATEGY=sso → exit 0 (production 起動)', () => {
    // production-like 起動: MOCK_MODE=false + RECALL_API_KEY + OAuth credentials + sso strategy
    const result = runValidate({
      NEXT_PUBLIC_SUPABASE_URL: 'https://abcdefghijklm.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'a'.repeat(32),
      SUPABASE_SERVICE_ROLE_KEY: 'b'.repeat(32),
      GOOGLE_OAUTH_CLIENT_ID: '1234567890-abc.apps.googleusercontent.com',
      GOOGLE_OAUTH_CLIENT_SECRET: 'x'.repeat(20),
      INITIAL_ADMIN_EMAIL: 'admin@classlab.co.jp',
      DEPLOY_PROFILE: 'minimal',
      MOCK_MODE: 'false',
      RECALL_API_KEY: 'recall-prod-key-xxxxx',
      LOGIN_STRATEGY: 'sso',
      // sso のみのため RATE_LIMIT_ENABLED 不要 (refinement 5 は email-pass/both のみ)
    })
    expect(result.code).toBe(0)
    expect(result.output).toContain('All env variables validated successfully')
  })

  it('(P0-f) MOCK_MODE=true + Supabase/admin env 全不在 → exit 0 (fresh checkout demo build)', () => {
    // fresh checkout を模擬: process.env から Supabase 3 var + INITIAL_ADMIN_EMAIL を
    // 明示的に空文字で上書き (execSync の継承 env を打ち消す)。MOCK_MODE=true なら通過すべき。
    const result = runValidate({
      MOCK_MODE: 'true',
      DEPLOY_PROFILE: 'minimal',
      LOGIN_STRATEGY: 'sso',
      NEXT_PUBLIC_SUPABASE_URL: '',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: '',
      SUPABASE_SERVICE_ROLE_KEY: '',
      INITIAL_ADMIN_EMAIL: '',
    })
    expect(result.code).toBe(0)
    expect(result.output).toContain('All env variables validated successfully')
  })

  it('(D-3d) email-pass + RATE_LIMIT_ENABLED=false → exit 1 + stderr に RATE_LIMIT_ENABLED 含む', () => {
    // refinement 5: email-pass 有効化時は RATE_LIMIT_ENABLED=true が必須。
    // exit 1 + error output に RATE_LIMIT_ENABLED が含まれることを integration 検証する。
    const result = runValidate({
      NEXT_PUBLIC_SUPABASE_URL: 'https://abcdefghijklm.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'a'.repeat(32),
      SUPABASE_SERVICE_ROLE_KEY: 'b'.repeat(32),
      INITIAL_ADMIN_EMAIL: 'admin@classlab.co.jp',
      DEPLOY_PROFILE: 'minimal',
      MOCK_MODE: 'true',
      LOGIN_STRATEGY: 'email-pass',
      RATE_LIMIT_ENABLED: 'false', // refinement 5 違反
    })
    expect(result.code).toBe(1)
    expect(result.output).toContain('RATE_LIMIT_ENABLED')
  })
})
