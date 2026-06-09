/**
 * env-validate.ts — 環境変数 validation エントリーポイント
 *
 * 実行: pnpm env:validate  (tsx scripts/env-validate.ts)
 * pre-build hook として prebuild script から呼ばれる
 *
 * 動作:
 *   1. @next/env loadEnvConfig で .env.local / .env.{NODE_ENV} / .env を load
 *   2. fullEnvSchema.safeParse で全 env を検証
 *   3. 失敗時: category 別 readable format で error 表示 + exit 1
 *   4. 成功時: 確認メッセージ + DEPLOY_PROFILE / MOCK_MODE を表示 + exit 0
 *
 * NOTE: @next/env loadEnvConfig の優先順
 *   .env.development.local > .env.local > .env.development > .env
 *   (Next.js 標準と同一の優先順。dotenv-flow から乗り換え。D-H-03 fix)
 *
 * NOTE: SKIP_ENV_VALIDATE
 *   SKIP_ENV_VALIDATE=true にすると validation を skip して exit 0 する。
 *   CI debug 時や prebuild を意図的に skip したい場合に使用。
 *   .env.example に doc あり。(A-H-03 fix)
 *
 * NOTE: secret leak 防止
 *   - zod の built-in error message は値を含まない (デフォルト動作で保証)
 *   - error 出力で環境変数の「値」は一切 log しない (field 名のみ)
 */

import { loadEnvConfig } from '@next/env'
import { fullEnvSchema } from './env-schema'

// SKIP_ENV_VALIDATE=true の場合は validation を skip する (CI debug / prebuild bypass 用)
// A-H-03 fix: prebuild は維持しつつ、debug 時の skip 手段を提供
if (process.env.SKIP_ENV_VALIDATE === 'true') {
  console.log('\n⏭  Env validation skipped (SKIP_ENV_VALIDATE=true)')
  process.exit(0)
}

// @next/env loadEnvConfig で .env* ファイルを load (process.env に merge される)
// isDev=true で .env.local / .env.development.local を優先 load
// (CI 環境では .env.local がなく、process.env から直接読む)
// D-H-03 fix: dotenv-flow から @next/env に切り替え (追加 deps 不要、next に同梱)
loadEnvConfig(process.cwd())

const result = fullEnvSchema.safeParse(process.env)

if (!result.success) {
  console.error('\n❌ Env validation failed:\n')

  // flatten() で fieldErrors (field 別) + formErrors (refinement 由来) を取得
  const flatten = result.error.flatten()

  // field 別 errors (category 順に整理して表示)
  const fieldErrors = flatten.fieldErrors
  if (Object.keys(fieldErrors).length > 0) {
    // field 名のみ表示、値は絶対に出力しない (secret leak 防止)
    for (const [field, errors] of Object.entries(fieldErrors)) {
      if (errors && errors.length > 0) {
        console.error(`  ${field}:`)
        for (const e of errors) {
          console.error(`    - ${e}`)
        }
      }
    }
  }

  // formErrors (refinement / cross-field エラー)
  if (flatten.formErrors.length > 0) {
    console.error('\n  Cross-field errors:')
    for (const e of flatten.formErrors) {
      console.error(`    - ${e}`)
    }
  }

  console.error(
    '\nFix the above and retry: pnpm env:validate\n'
  )
  process.exit(1)
}

// 成功時: 値を出力しない (non-secret な meta 情報のみ)
console.log('\n✅ All env variables validated successfully')
console.log(`   DEPLOY_PROFILE : ${result.data.DEPLOY_PROFILE}`)
console.log(`   MOCK_MODE      : ${result.data.MOCK_MODE}`)
console.log()
process.exit(0)
