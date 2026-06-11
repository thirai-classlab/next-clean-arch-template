/**
 * env-schema.ts — 環境変数 zod schema SSoT
 *
 * category 別 schema + 統合 fullEnvSchema (refinement で MOCK_MODE 条件付き validation)
 * secret leak 防止: zod の built-in error message は値を含まない (デフォルト動作で保証)
 */
import { z } from 'zod'

/**
 * emptyAsUndefined — 空文字 '' を undefined に正規化する preprocess helper。
 *
 * fresh checkout (.env.local なし) では shell/CI に inherited な空文字 env が
 * 渡ることがある。MOCK_MODE=true 時に optional 扱いした field へ '' が来ると
 * `.url()` / `.email()` / `.min()` が誤って format error を返すため、'' を
 * 「未指定 (undefined)」へ正規化してから schema を適用する。
 * 非空文字はそのまま透過するので、値あり時の format 検証は維持される。
 */
const emptyAsUndefined = (schema: z.ZodTypeAny) =>
  z.preprocess((v) => (v === '' ? undefined : v), schema)

// ── Supabase ─────────────────────────────────────────────────────
/**
 * supabaseEnvSchema — Supabase 接続情報。
 *
 * P0 fix (task-8 publish blocker):
 *   3 var (URL / ANON_KEY / SERVICE_ROLE_KEY) を **個別に optional 化**する。
 *   無条件 required のままだと fresh checkout + MOCK_MODE=true で prebuild の
 *   env:validate が即死し、CLAUDE.md 中核制約「MOCK_MODE=true で API key 無し
 *   デモ可能」に違反する。
 *
 *   MOCK_MODE !== 'true' (= 実 API / 本番相当) 時の必須化は fullEnvSchema.superRefine
 *   (refinement 6) が担う。値が **渡された場合** は url() / min(32) の format 検証を
 *   依然適用するため、optional 化後も「値あり + format 不正」は error を返す。
 */
export const supabaseEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: emptyAsUndefined(
    z
      .string()
      .url({
        message: 'Must be a valid URL (e.g. https://xxxxx.supabase.co)',
      })
      .optional(),
  ),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: emptyAsUndefined(
    z
      .string()
      .min(32, {
        message: 'Must be at least 32 characters',
      })
      .optional(),
  ),
  SUPABASE_SERVICE_ROLE_KEY: emptyAsUndefined(
    z
      .string()
      .min(32, {
        message: 'Must be at least 32 characters',
      })
      .optional(),
  ),
  /**
   * SUPABASE_DB_URL — PostgreSQL connection string for direct DB access (e.g. psql, pg_cron).
   * Required only in remote mode (SUPABASE_MODE=remote). Optional for local/mock setups.
   * See: scripts/setup-supabase.sh Phase 6.
   */
  SUPABASE_DB_URL: z.string().url({ message: 'Must be a valid URL' }).optional(),
})

// ── Google OAuth ──────────────────────────────────────────────────
/**
 * oauthEnvSchema — Google OAuth credentials.
 *
 * task #37 Step 4 (auth-login-strategy, code HIGH-R3-1):
 *   各フィールドを **個別に** `.optional()` 化する。object 丸ごと `.optional()` に
 *   すると fullEnvSchema の `.merge()` chain が型エラーになるため不可。
 *   conditional な必須化 (LOGIN_STRATEGY 連動) は fullEnvSchema.superRefine が担う。
 *
 *   optional 化後も、値が **渡された場合** は zod の format 検証
 *   (endsWith('.apps.googleusercontent.com') / min(20)) が依然 error を返す
 *   (`'invalid'` を渡せば error、未指定なら通過、code MEDIUM-R4-1)。
 */
export const oauthEnvSchema = z.object({
  GOOGLE_OAUTH_CLIENT_ID: z
    .string()
    .endsWith('.apps.googleusercontent.com', {
      message: 'Must end with .apps.googleusercontent.com',
    })
    .optional(),
  GOOGLE_OAUTH_CLIENT_SECRET: z
    .string()
    .min(20, {
      message: 'Must be at least 20 characters',
    })
    .optional(),
})

// ── Admin ────────────────────────────────────────────────────────
/**
 * adminEnvSchema — admin seed user 設定。
 *
 * ALLOWED_ADMIN_EMAIL_DOMAIN (optional):
 *   指定した場合、INITIAL_ADMIN_EMAIL がそのドメインで終わる必要がある。
 *   未指定の場合、email format チェックのみ (domain 制約なし)。
 *   例: ALLOWED_ADMIN_EMAIL_DOMAIN=@classlab.co.jp
 *
 * template 横展開時に他 domain でも fresh install が成功するよう動的化。
 * D-H-01 fix: hard-coded @classlab.co.jp 制約を廃止。
 *
 * MOCK_SEED_EMAIL / MOCK_SEED_PASSWORD (task #37 Step 4, security M-R3-1):
 *   MOCK_MODE=true の email-pass sign-in で利用する seed credential。deploy-agnostic
 *   なため adminEnvSchema に帰属。`getValidatedEnv()` 経由で type-safe に取得し、
 *   アプリコードから `process.env.MOCK_SEED_*` を直接読まない (seed UI ヒントも env 参照)。
 *   未指定時は MockAuthAdapter 側 default (test@classlab.co.jp / password123) を使う。
 */
export const adminEnvSchema = z.object({
  // P0 fix (task-8 publish blocker): MOCK_MODE=true (fresh checkout demo) では
  // optional 化。MOCK_MODE !== 'true' 時の必須化は fullEnvSchema.superRefine
  // (refinement 6) が担う。値あり時は依然 email() format 検証を適用する。
  INITIAL_ADMIN_EMAIL: emptyAsUndefined(
    z.string().email({ message: 'Must be a valid email address' }).optional(),
  ),
  ALLOWED_ADMIN_EMAIL_DOMAIN: z.string().optional(),
  MOCK_SEED_EMAIL: z.string().optional(),
  MOCK_SEED_PASSWORD: z.string().optional(),
})

// ── Deployment ───────────────────────────────────────────────────
/**
 * deploymentEnvSchema — deploy profile / mock 切替 + rate-limit (auth brute-force 対策).
 *
 * RATE_LIMIT_* (task #36, OWASP A07):
 *   sign-in Server Action 等の認証エンドポイントに in-memory fixed-window
 *   rate-limit を適用するための設定値 (field 定義のみ)。
 *   全て .default() 付き optional のため、未指定でも既存 env は通過する。
 *
 *   - RATE_LIMIT_ENABLED   : rate-limit 機構の有効化 ('true'/'false', default 'false')
 *   - RATE_LIMIT_MAX_ATTEMPTS : window あたりの fail 上限 (default 5)
 *   - RATE_LIMIT_WINDOW_SEC : window 長 (秒, default 900 = 15min)
 *
 *   注意: backend (in-memory / Upstash) の選択は DEPLOY_PROFILE の profile mapping
 *   で表現するため、RATE_LIMIT_BACKEND env は持たない (task #36 draft round-1 CRITICAL)。
 *
 *   注意: LOGIN_STRATEGY 連動の必須化 guard (superRefine) は本 task では追加しない。
 *   login task #37 Step 4 が fullEnvSchema の superRefine に追加する (env-schema.ts
 *   同時変更 conflict 回避の唯一安全な順序 = 本 task Step 3 → login #37 Step 4)。
 */
export const deploymentEnvSchema = z.object({
  DEPLOY_PROFILE: z
    .enum(['minimal', 'unlocked', 'pro', 'vps', 'vps-next-postgres', 'vps-next-mariadb', 'vps-nest-postgres', 'vps-nest-mariadb'], {
      errorMap: () => ({
        message: 'Must be one of: minimal, unlocked, pro, vps, vps-next-postgres, vps-next-mariadb, vps-nest-postgres, vps-nest-mariadb',
      }),
    })
    .default('minimal'),
  /**
   * LOGIN_STRATEGY — sign-in page が提供するログイン手段 (task #37 Step 4).
   *
   *   - 'sso'        : Google OAuth button のみ (recall_poc 既定、@classlab.co.jp SSO)
   *   - 'email-pass' : email + password form のみ
   *   - 'both'       : Tabs で両方提供 (template consumer 推奨、.env.example 注記)
   *
   *   private env (`NEXT_PUBLIC_` を付けない)。Server Component で getValidatedEnv()
   *   経由で resolve し、Client には `loginMethods` prop として渡す (SEC-MED-02)。
   *   email-pass / both 有効化は rate-limit task #36 完了 + RATE_LIMIT_ENABLED=true が
   *   前提 (fullEnvSchema.superRefine で機械強制、security H-R3-1)。
   */
  LOGIN_STRATEGY: z
    .enum(['sso', 'email-pass', 'both'], {
      errorMap: () => ({
        message: 'Must be one of: sso, email-pass, both',
      }),
    })
    .default('sso'),
  MOCK_MODE: z
    .enum(['true', 'false'], {
      errorMap: () => ({ message: 'Must be "true" or "false"' }),
    })
    .default('true'),
  RATE_LIMIT_ENABLED: z
    .enum(['true', 'false'], {
      errorMap: () => ({ message: 'Must be "true" or "false"' }),
    })
    .default('false'),
  // env 値は string で渡るため coerce.number() で数値化 (既存の数値 env なし、
  // env-var-as-string の idiom として coerce を採用)。
  RATE_LIMIT_MAX_ATTEMPTS: z.coerce
    .number({ invalid_type_error: 'Must be a number' })
    .int({ message: 'Must be an integer' })
    .positive({ message: 'Must be a positive integer' })
    .default(5),
  RATE_LIMIT_WINDOW_SEC: z.coerce
    .number({ invalid_type_error: 'Must be a number' })
    .int({ message: 'Must be an integer' })
    .positive({ message: 'Must be a positive integer' })
    .default(900),
})

// ── PostgreSQL / NextAuth (vps-next-postgres profile) ─────────────
/**
 * postgresEnvSchema — PostgreSQL + NextAuth env vars for vps-next-postgres.
 *
 * All fields are optional at the per-field level; conditional required
 * enforcement is applied via superRefine (refinement 7) when
 * DEPLOY_PROFILE === 'vps-next-postgres' and MOCK_MODE !== 'true'.
 *
 * AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET: NextAuth naming convention aliases for
 * GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET. NextAuth providers
 * use AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET by convention.
 * No format constraints on these (different format from Supabase OAuth vars).
 *
 * AUTH_ALLOWED_EMAIL_DOMAIN: optional domain string (e.g. 'example.com').
 * Absent or empty → no domain restriction. No URL/email format — just a plain
 * domain segment. Enforced in NextAuth signIn callback (src/auth.ts).
 */
export const postgresEnvSchema = z.object({
  DATABASE_URL: emptyAsUndefined(
    z.string().url({ message: 'Must be a valid URL' }).optional(),
  ),
  NEXTAUTH_SECRET: emptyAsUndefined(
    z
      .string()
      .min(32, { message: 'Must be at least 32 characters' })
      .optional(),
  ),
  NEXTAUTH_URL: emptyAsUndefined(
    z.string().url({ message: 'Must be a valid URL' }).optional(),
  ),
  AUTH_GOOGLE_ID: emptyAsUndefined(z.string().optional()),
  AUTH_GOOGLE_SECRET: emptyAsUndefined(z.string().optional()),
  AUTH_ALLOWED_EMAIL_DOMAIN: emptyAsUndefined(z.string().optional()),
  SEED_PASSWORD: z.string().optional(),
})

// ── Nest API (optional, vps-nest-* profiles) ─────────────────────
/**
 * nestEnvSchema — Nest API auth vars for vps-nest-postgres / vps-nest-mariadb profiles.
 *
 * JWT_SECRET is shared between Nest (HS256 cookie signing) and the Next.js
 * Edge middleware (jose jwtVerify). All fields optional at field level;
 * conditional required enforcement is applied via superRefine (refinements 9+10).
 *
 * NEST_API_URL: private server-side URL (no NEXT_PUBLIC_ prefix) used by
 * Next.js Server Actions and route handlers to call the Nest API.
 */
export const nestEnvSchema = z.object({
  JWT_SECRET: emptyAsUndefined(
    z
      .string()
      .min(32, { message: 'Must be at least 32 characters' })
      .optional(),
  ),
  NEST_API_URL: emptyAsUndefined(
    z.string().url({ message: 'Must be a valid URL' }).optional(),
  ),
})

// ── Recall.ai (optional) ──────────────────────────────────────────
export const recallEnvSchema = z.object({
  RECALL_API_KEY: z.string().optional(),
  WEBHOOK_PUBLIC_URL: emptyAsUndefined(
    z.string().url({ message: 'Must be a valid URL' }).optional(),
  ),
})

// ── Vercel (optional) ────────────────────────────────────────────
export const vercelEnvSchema = z.object({
  VERCEL_PROJECT_ID: z.string().optional(),
  VERCEL_ORG_ID: z.string().optional(),
})

// ── Full schema (統合 + refinement) ──────────────────────────────
/**
 * fullEnvSchema — 全 category を merge した統合 schema。
 *
 * refinement (cross-field validation) — 計 7 件:
 *   1. MOCK_MODE=false の場合 RECALL_API_KEY が必須。
 *   2. ALLOWED_ADMIN_EMAIL_DOMAIN が指定された場合、INITIAL_ADMIN_EMAIL がそのドメインで終わる必要あり。
 *   3. (task #37) LOGIN_STRATEGY !== 'email-pass' かつ MOCK_MODE !== 'true' の場合、
 *      Google OAuth credentials (CLIENT_ID / SECRET) が必須 (SSO 経路が機能するため)。
 *      MOCK_MODE='true' の場合は LOGIN_STRATEGY 問わず OAuth 不要 (MOCK 完動整合)。
 *      vps-next-postgres は NextAuth 系 AUTH_GOOGLE_* を使うため対象外 (refinement 7 が担う)。
 *   4. (task #37, H-3) DEPLOY_PROFILE !== 'minimal' かつ MOCK_MODE === 'true' は error。
 *      非 minimal profile (= 本番相当) で MOCK 認証 bypass が有効化されるのを防ぐ。
 *      例外: vps-next-postgres は build-time 検証用に MOCK_MODE=true を意図的に許可
 *      (runtime の本番流入は src/instrumentation.ts の fail-fast guard が拒否)。
 *   5. (task #37, security H-R3-1) LOGIN_STRATEGY !== 'sso' かつ
 *      RATE_LIMIT_ENABLED !== 'true' は startup error。email-pass/both は brute-force
 *      対象のため、rate-limit 無効のままの有効化を機械ブロックする
 *      (RATE_LIMIT_ENABLED field は task #36 が deploymentEnvSchema に定義済)。
 *   6. (P0 fix) MOCK_MODE !== 'true' かつ非 vps-next-postgres は Supabase 3 var +
 *      INITIAL_ADMIN_EMAIL を必須化。
 *   7. (vps-next-postgres) DEPLOY_PROFILE=vps-next-postgres かつ MOCK_MODE !== 'true' は
 *      DATABASE_URL / NEXTAUTH_SECRET / NEXTAUTH_URL を必須化。LOGIN_STRATEGY が SSO を
 *      含む場合は AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET も必須化。
 *
 * 注意: zod の built-in error message は値を含まないため secret leak のリスクなし。
 * (z.string().min() 等のエラーは "String must contain at least N character(s)" 形式)
 *
 * Note: MOCK_MODE='false' 時 RECALL_API_KEY は必須だが、zod superRefine の制約は
 * z.infer に narrowing されない。application code 側で getValidatedEnv() 経由で
 * 取得し、必要に応じて再 assert すること。(E-M-01 JSDoc)
 */
export const fullEnvSchema = supabaseEnvSchema
  .merge(oauthEnvSchema)
  .merge(adminEnvSchema)
  .merge(deploymentEnvSchema)
  .merge(recallEnvSchema)
  .merge(vercelEnvSchema)
  .merge(postgresEnvSchema)
  .merge(nestEnvSchema)
  .superRefine((data, ctx) => {
    // refinement 1: MOCK_MODE=false 時は RECALL_API_KEY 必須
    if (data.MOCK_MODE === 'false' && !data.RECALL_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'RECALL_API_KEY is required when MOCK_MODE=false',
        path: ['RECALL_API_KEY'],
      })
    }
    // refinement 2: ALLOWED_ADMIN_EMAIL_DOMAIN が指定されている場合 domain 制約を適用
    // P0 fix: INITIAL_ADMIN_EMAIL は optional 化したため、値が存在する時のみ domain を照合する。
    if (
      data.ALLOWED_ADMIN_EMAIL_DOMAIN &&
      data.INITIAL_ADMIN_EMAIL &&
      !data.INITIAL_ADMIN_EMAIL.endsWith(data.ALLOWED_ADMIN_EMAIL_DOMAIN)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `INITIAL_ADMIN_EMAIL must end with ${data.ALLOWED_ADMIN_EMAIL_DOMAIN}`,
        path: ['INITIAL_ADMIN_EMAIL'],
      })
    }
    // refinement 3 (task #37): SSO 経路 (sso / both) で MOCK_MODE !== 'true' の場合、
    // Google OAuth credentials を必須化。oauthEnvSchema の individual optional 化を補う。
    // MOCK_MODE='true' は OAuth 不要 (MockAuthAdapter で完動)。
    //
    // vps-next-postgres は NextAuth (AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET) を使い、
    // Supabase 系の GOOGLE_OAUTH_CLIENT_* は一切参照しないため本 refinement の対象外
    // (skip しないと「AUTH_GOOGLE_ID を設定したのに GOOGLE_OAUTH_CLIENT_ID 必須 error
    // で起動不能」になる)。vps-next-postgres の SSO credential 必須化は refinement 7 が担う。
    if (
      data.DEPLOY_PROFILE !== 'vps-next-postgres' &&
      data.DEPLOY_PROFILE !== 'vps-next-mariadb' &&
      data.DEPLOY_PROFILE !== 'vps-nest-postgres' &&
      data.DEPLOY_PROFILE !== 'vps-nest-mariadb' &&
      data.LOGIN_STRATEGY !== 'email-pass' &&
      data.MOCK_MODE !== 'true'
    ) {
      if (!data.GOOGLE_OAUTH_CLIENT_ID) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'GOOGLE_OAUTH_CLIENT_ID is required when LOGIN_STRATEGY includes SSO (sso/both) and MOCK_MODE is not true',
          path: ['GOOGLE_OAUTH_CLIENT_ID'],
        })
      }
      if (!data.GOOGLE_OAUTH_CLIENT_SECRET) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'GOOGLE_OAUTH_CLIENT_SECRET is required when LOGIN_STRATEGY includes SSO (sso/both) and MOCK_MODE is not true',
          path: ['GOOGLE_OAUTH_CLIENT_SECRET'],
        })
      }
    }
    // refinement 4 (task #37, H-3): 非 minimal profile での MOCK_MODE=true を禁止。
    // 本番相当の profile で MOCK 認証 bypass が有効化される事故を防ぐ。
    // 例外: vps-next-postgres / vps-next-mariadb / vps-nest-postgres / vps-nest-mariadb / pro は
    // mock adapter (DB / Supabase 不要) でビルド検証するため許可する
    // (runtime の本番流入は src/instrumentation.ts が拒否)。
    // pro (Vercel/Supabase profile) is also excluded from profilesForbiddingMock
    // so that scaffolded projects can run `pnpm build` / `pnpm dev` with
    // MOCK_MODE=true without needing real Supabase credentials. Runtime production
    // guard is enforced by src/instrumentation.ts (NODE_ENV=production + MOCK_MODE=true → crash).
    const profilesForbiddingMock: string[] = ['unlocked', 'vps']
    // vps-next-* / vps-nest-* / pro are intentionally excluded — MOCK_MODE=true is
    // allowed for CI build verification; runtime production guard is in src/instrumentation.ts.
    if (profilesForbiddingMock.includes(data.DEPLOY_PROFILE) && data.MOCK_MODE === 'true') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'MOCK_MODE=true is not allowed with DEPLOY_PROFILE=unlocked or vps (auth bypass guard)',
        path: ['MOCK_MODE'],
      })
    }
    // refinement 5 (task #37, security H-R3-1): email-pass / both は brute-force 対象。
    // RATE_LIMIT_ENABLED=true を起動時に強制し、無防備な有効化を機械ブロックする。
    // 例外: MOCK_MODE=true の場合は mock adapter を使用するため rate-limit 不要
    // (fresh checkout / CI ビルド検証が MOCK_MODE=true で通過できるようにする)。
    if (
      data.LOGIN_STRATEGY !== 'sso' &&
      data.RATE_LIMIT_ENABLED !== 'true' &&
      data.MOCK_MODE !== 'true'
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'RATE_LIMIT_ENABLED must be "true" when LOGIN_STRATEGY is email-pass or both (brute-force protection)',
        path: ['RATE_LIMIT_ENABLED'],
      })
    }
    // refinement 6 (P0 fix, task-8 publish blocker): MOCK_MODE !== 'true' (= 実 API /
    // 本番相当) では Supabase 3 var + INITIAL_ADMIN_EMAIL を必須化する。
    // supabaseEnvSchema / adminEnvSchema 側で optional 化したのを補い、MOCK_MODE=true
    // (fresh checkout demo) のときだけ未指定を許す。MOCK_MODE=true なら本 refinement は
    // 発火せず、4 var 不在でも success (CLAUDE.md 中核制約「API key 無しデモ」の復元)。
    // vps-next-postgres profile は Supabase 不使用 — Supabase var 不要 (refinement 7 で補完)。
    if (
      data.MOCK_MODE !== 'true' &&
      data.DEPLOY_PROFILE !== 'vps-next-postgres' &&
      data.DEPLOY_PROFILE !== 'vps-next-mariadb' &&
      data.DEPLOY_PROFILE !== 'vps-nest-postgres' &&
      data.DEPLOY_PROFILE !== 'vps-nest-mariadb'
    ) {
      const requiredInRealMode = [
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_ROLE_KEY',
        'INITIAL_ADMIN_EMAIL',
      ] as const
      for (const field of requiredInRealMode) {
        if (!data[field]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${field} is required when MOCK_MODE is not "true"`,
            path: [field],
          })
        }
      }
    }
    // refinement 7: vps-next-postgres profile での必須 var チェック。
    //
    // 注意: refinement 4 は vps-next-postgres + MOCK_MODE=true を **意図的に許可**
    // している (profilesForbiddingMock から除外、build-time / CI のビルド検証用)。
    // 本 refinement は MOCK_MODE !== 'true' (= 実 deploy mode) のときだけ発火する。
    // runtime での MOCK_MODE=true + NODE_ENV=production は src/instrumentation.ts の
    // fail-fast guard が起動を拒否する (mock auth bypass の本番流入防止)。
    //
    // 必須化の内訳:
    //   - DATABASE_URL / NEXTAUTH_SECRET / NEXTAUTH_URL: profile の基盤 3 var。
    //   - AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET: LOGIN_STRATEGY が SSO を含む
    //     (sso / both) 場合のみ必須。NextAuth は AUTH_GOOGLE_* 命名を使うため、
    //     Supabase 系 GOOGLE_OAUTH_CLIENT_* を検査する refinement 3 では代替できない
    //     (refinement 3 は vps-next-postgres を skip する)。
    if (
      data.DEPLOY_PROFILE === 'vps-next-postgres' &&
      data.MOCK_MODE !== 'true'
    ) {
      const requiredForVpsNextPostgres = [
        'DATABASE_URL',
        'NEXTAUTH_SECRET',
        'NEXTAUTH_URL',
      ] as const
      for (const field of requiredForVpsNextPostgres) {
        if (!data[field]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${field} is required when DEPLOY_PROFILE=vps-next-postgres and MOCK_MODE is not "true"`,
            path: [field],
          })
        }
      }
      // SSO を含む LOGIN_STRATEGY (sso / both) では NextAuth Google provider の
      // credentials が必須。未設定だと NextAuth は空文字 clientId で起動し、
      // sign-in 時にしか失敗が顕在化しないため startup validation で止める。
      if (data.LOGIN_STRATEGY !== 'email-pass') {
        const requiredForSso = ['AUTH_GOOGLE_ID', 'AUTH_GOOGLE_SECRET'] as const
        for (const field of requiredForSso) {
          if (!data[field]) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `${field} is required when DEPLOY_PROFILE=vps-next-postgres, LOGIN_STRATEGY includes SSO (sso/both) and MOCK_MODE is not "true"`,
              path: [field],
            })
          }
        }
      }
    }
    // refinement 8: vps-next-mariadb profile での必須 var チェック。
    //
    // Mirror of refinement 7 for the MariaDB variant. Identical auth stack
    // (NextAuth v5 JWT strategy), only the database provider differs.
    //
    // 注意: refinement 4 は vps-next-mariadb + MOCK_MODE=true を意図的に許可
    // (profilesForbiddingMock から除外、build-time / CI のビルド検証用)。
    // 本 refinement は MOCK_MODE !== 'true' (= 実 deploy mode) のときだけ発火する。
    //
    // Additional DATABASE_URL shape check: if DATABASE_URL is present but does NOT
    // start with 'mysql://' or 'mysql+srv://', emit a custom issue explaining the
    // mysql:// requirement (prevents accidentally using a postgresql:// URL here).
    if (
      data.DEPLOY_PROFILE === 'vps-next-mariadb' &&
      data.MOCK_MODE !== 'true'
    ) {
      const requiredForVpsNextMariadb = [
        'DATABASE_URL',
        'NEXTAUTH_SECRET',
        'NEXTAUTH_URL',
      ] as const
      for (const field of requiredForVpsNextMariadb) {
        if (!data[field]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${field} is required when DEPLOY_PROFILE=vps-next-mariadb and MOCK_MODE is not "true"`,
            path: [field],
          })
        }
      }
      // DATABASE_URL shape check: must use mysql:// scheme for MariaDB.
      if (
        data.DATABASE_URL &&
        !data.DATABASE_URL.startsWith('mysql://') &&
        !data.DATABASE_URL.startsWith('mysql+srv://')
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'DATABASE_URL must use the mysql:// scheme for vps-next-mariadb profile (e.g. mysql://user:pass@host:3307/db)',
          path: ['DATABASE_URL'],
        })
      }
      // SSO を含む LOGIN_STRATEGY (sso / both) では NextAuth Google provider の
      // credentials が必須 (refinement 7 と同一ロジック)。
      if (data.LOGIN_STRATEGY !== 'email-pass') {
        const requiredForSso = ['AUTH_GOOGLE_ID', 'AUTH_GOOGLE_SECRET'] as const
        for (const field of requiredForSso) {
          if (!data[field]) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `${field} is required when DEPLOY_PROFILE=vps-next-mariadb, LOGIN_STRATEGY includes SSO (sso/both) and MOCK_MODE is not "true"`,
              path: [field],
            })
          }
        }
      }
    }
    // refinement 9: vps-nest-postgres profile での必須 var チェック。
    //
    // Mirror of refinement 7/8 pattern but for the Nest-based auth stack.
    // Nest owns auth (JWT_SECRET, NEST_API_URL) — no NEXTAUTH_* required.
    // DATABASE_URL is shared with the vps-next-* path.
    //
    // 注意: refinement 4 は vps-nest-postgres + MOCK_MODE=true を意図的に許可
    // (profilesForbiddingMock から除外、build-time / CI のビルド検証用)。
    if (
      data.DEPLOY_PROFILE === 'vps-nest-postgres' &&
      data.MOCK_MODE !== 'true'
    ) {
      const requiredForVpsNestPostgres = ['JWT_SECRET', 'NEST_API_URL', 'DATABASE_URL'] as const
      for (const field of requiredForVpsNestPostgres) {
        if (!data[field]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${field} is required when DEPLOY_PROFILE=vps-nest-postgres and MOCK_MODE is not "true"`,
            path: [field],
          })
        }
      }
      // SSO を含む LOGIN_STRATEGY (sso / both) では Google OAuth credentials が必須。
      if (data.LOGIN_STRATEGY !== 'email-pass') {
        const requiredForSso = ['AUTH_GOOGLE_ID', 'AUTH_GOOGLE_SECRET'] as const
        for (const field of requiredForSso) {
          if (!data[field]) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `${field} is required when DEPLOY_PROFILE=vps-nest-postgres, LOGIN_STRATEGY includes SSO (sso/both) and MOCK_MODE is not "true"`,
              path: [field],
            })
          }
        }
      }
    }
    // refinement 10: vps-nest-mariadb profile での必須 var チェック。
    //
    // Mirror of refinement 9 for the MariaDB variant. Identical auth stack
    // (Nest JWT HS256), only the database provider differs.
    // DATABASE_URL must use mysql:// scheme.
    if (
      data.DEPLOY_PROFILE === 'vps-nest-mariadb' &&
      data.MOCK_MODE !== 'true'
    ) {
      const requiredForVpsNestMariadb = ['JWT_SECRET', 'NEST_API_URL', 'DATABASE_URL'] as const
      for (const field of requiredForVpsNestMariadb) {
        if (!data[field]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${field} is required when DEPLOY_PROFILE=vps-nest-mariadb and MOCK_MODE is not "true"`,
            path: [field],
          })
        }
      }
      // DATABASE_URL shape check: must use mysql:// scheme for MariaDB.
      if (
        data.DATABASE_URL &&
        !data.DATABASE_URL.startsWith('mysql://') &&
        !data.DATABASE_URL.startsWith('mysql+srv://')
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'DATABASE_URL must use the mysql:// scheme for vps-nest-mariadb profile (e.g. mysql://user:pass@host:3307/db)',
          path: ['DATABASE_URL'],
        })
      }
      // SSO を含む LOGIN_STRATEGY (sso / both) では Google OAuth credentials が必須。
      if (data.LOGIN_STRATEGY !== 'email-pass') {
        const requiredForSso = ['AUTH_GOOGLE_ID', 'AUTH_GOOGLE_SECRET'] as const
        for (const field of requiredForSso) {
          if (!data[field]) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `${field} is required when DEPLOY_PROFILE=vps-nest-mariadb, LOGIN_STRATEGY includes SSO (sso/both) and MOCK_MODE is not "true"`,
              path: [field],
            })
          }
        }
      }
    }
  })

export type FullEnv = z.infer<typeof fullEnvSchema>
