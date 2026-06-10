# AGENTS.md — AI 開発エージェント向け規範

このファイルは **Cursor / Aider / Claude Code / Codex / GitHub Copilot Workspace 等**、本テンプレートで生成された project を触る AI エージェント全般に向けた規範書です。Claude Code 利用時は `CLAUDE.md` も併読してください (内容は本書 + Claude Code 特化の追補)。

---

## 0. このテンプレートが提供するもの (overview)

[`@takuma-hirai/create-app`](https://www.npmjs.com/package/@takuma-hirai/create-app) から生成された project は、**Next.js 14 App Router + Supabase + Vercel** を前提とした、**Clean Architecture 4 層** + **DI コンテナ** + **MOCK_MODE** + **admin panel + audit log** を備えた production-ready の出発点です。

利用者 (= あなた、AI エージェント) は **既に動く状態** から開発を始めます。**白紙ではない**ので、まず「何が既にあるか」を把握し、その上に **同じ規範で積み増す** ことを最優先してください。

### 0.1 実装済みの機能 (=「再実装しない」リスト)

| 領域 | 提供内容 |
|---|---|
| **認証** | Supabase Auth (email/password + Google OAuth) / sign-in / sign-up / sign-out / OAuth callback / `middleware.ts` による全 route の auth-guard (`/auth/*` 以外は未認証 → `/auth/sign-in?next=...` redirect) / per-request session 解決 |
| **admin panel** | `(admin)` route group: users 一覧 + 詳細 / role 変更 / pending-approval queue / allow-list editor / audit-log viewer / organization settings / `dev/components` UI gallery |
| **role / 認可** | admin / member / viewer の 3 role、JWT custom claim で解決、RLS policy で DB 側も強制 |
| **audit log** | 全 admin mutation を wrap して audit entry 自動発行、Vercel cron (`/api/cron/audit-cleanup`) で 90 日経過分を daily 削除 |
| **clean arch 4 層** | Domain (Entity / VO / Aggregate / Domain Event、pure TS) / Application (UseCase / Port IF / `Result<T, E>` 戻り値) / Infrastructure (tsyringe DI / 実 adapter + Mock adapter / in-memory repo) / Interfaces (Server Action / Route Handler / Middleware) |
| **DI コンテナ** | `src/lib/infrastructure/container.ts` で Port → adapter mapping、4 つの **Deploy Profile** (`minimal` / `unlocked` / `pro` / `vps`) ごとに別 adapter を bind |
| **MOCK_MODE** | `MOCK_MODE=true` で **credential 一切不要**で全 UseCase 動作。Supabase URL / key が未設定でも UI フローが完動 |
| **component library** | Chakra UI v3 ベースの primitive + composite set (Button / Card / Badge / Table / Form / Modal / Drawer / Command Palette …) + app shell (`Sidebar` / `Topbar` / `UserMenu` / `ConditionalShell`) + home guide (`LoginGuide` / `UsageGuide`) |
| **Dev component gallery** | `(admin)/admin/dev/components` で全 UI component を 1 page にカタログ表示 (visual regression + design review 用) |
| **zod schema SSoT** | REST DTO / Server Action input / 外部 API response の検証は zod schema 経由のみ。`scripts/env-schema.ts` が env validation の正本 |
| **env validation** | prebuild hook (`pnpm env:validate`) と runtime `getValidatedEnv()` で env を必須化。`MOCK_MODE=true` 時は Supabase 系を optional 化 (=「local dev は credential なしで build / dev 通る」を保証) |
| **テスト** | vitest unit + integration、Playwright E2E (middleware / shell / admin)、axe-core a11y、visual regression |
| **CI / 自動化** | GitHub Actions: `ci.yml` (lint + type-check + test + build + Playwright) + `release.yml` + `changesets.yml` + Dependabot |
| **deploy profile** | `DEPLOY_PROFILE` env で `minimal` / `unlocked` / `pro` / `vps` を切替。Application / Domain 層は profile 非依存、Infrastructure adapter wiring のみが変わる |
| **setup scripts** | `scripts/setup-supabase.sh` (Supabase project link + migrate + seed) / `scripts/setup-vercel.sh` (Vercel project link + env push + cron) — どちらも idempotent、`.env.local` を読むだけで secret を echo しない |
| **Supabase 一式** | `supabase/migrations/` の SQL + `supabase/tests/` の pgTAP test 一式、`config.toml` |

### 0.2 採用している方針 (=「外さない」リスト)

- **Clean Architecture 依存方向**: `interfaces → application → domain`、`infrastructure → application (port)` のみ。**Domain は何にも依存しない**
- **Port / Adapter pattern**: business logic は **Application 層 Port** に依存し、各 Deploy Profile が具象 adapter を bind する
- **zod schema SSoT**: 入力検証は zod 一択、DTO は zod から `z.infer` する
- **`Result<T, E>` 戻り値**: UseCase / Domain 層は throw でなく `Result<T, E>` で error path を表現
- **MOCK_MODE-first 開発**: dev は **credential なし**で全機能動作することを default 保証
- **Chakra UI v3 必須**: 全 UI は Chakra ベース (§2 参照)

---

## 1. このテンプレートのお作法 (開発フロー)

### 1.1 起動

```bash
# dev: MOCK_MODE 推奨 (credential 不要)
MOCK_MODE=true pnpm dev

# build (CI 前検証 / prebuild env-validate を通す)
MOCK_MODE=true pnpm build

# test
pnpm test                       # vitest unit + integration
pnpm exec playwright test       # E2E
pnpm lint                       # eslint
pnpm type-check                 # tsc --noEmit
pnpm lint:circular              # madge --circular (依存方向の cycle 検出)
```

開いたら http://localhost:3000、seed credential (`MOCK_SEED_EMAIL` / `MOCK_SEED_PASSWORD`、default `test@<allowed-domain>` / `password123`) で sign in。

### 1.2 MOCK モード vs Real モード

| モード | env | 用途 |
|---|---|---|
| **MOCK_MODE=true** (default) | Supabase 系 env なし OK | 全 dev の default、UI フロー検証、E2E、demo |
| **MOCK_MODE=false** + `DEPLOY_PROFILE=...` | Supabase URL + key 必須 | staging / production / 実環境検証 |

**重要**: `NODE_ENV=production` + `MOCK_MODE=true` の組合せは **`src/instrumentation.ts` の S-01 guard で意図的に block** されています (production に MOCK が漏れ込むのを防ぐ)。
→ `pnpm start` で MOCK 動作確認しようとすると即落ちします。MOCK 確認は **`pnpm dev` 一択**。

### 1.3 新規 page 追加

1. `src/app/` 配下に route を追加 (App Router 規約)
2. UI は **Chakra UI v3 component** で構築 (§2 必須)
3. middleware が auth-guard をかけているので、認証不要 page は `/auth/*` 配下に置く
4. admin 限定 page は `(admin)/` route group 配下に置く (role check は middleware + Server Action 層で二重実施)

### 1.4 新規 UseCase 追加

1. `src/lib/application/use-cases/<feature>/` に追加
2. 戻り値は `Result<T, DomainError>` (throw しない)
3. Port IF が無ければ `src/lib/application/ports/` に追加 (= adapter の契約)
4. Server Action / Route Handler から `container.resolve(...)` で呼ぶ (DI 経由、直接 new しない)

### 1.5 新規 adapter 追加

1. `src/lib/infrastructure/adapters/<port-name>/` に追加
2. `@injectable()` で tsyringe 登録
3. **`container.ts` の Port → adapter mapping table に追加** (Deploy Profile ごとに、どの adapter を bind するか明示)
4. Mock adapter も同時に追加 (MOCK_MODE=true での動作を保証)

### 1.6 secrets

- **`.env.local` に書く** (= `.gitignore` 済、commit されない)
- `.env.example` は docs 用に維持 (実値を書かない、key 名 + 説明のみ)
- secret を component / repository / log に絶対 echo しない (setup scripts 同様)

### 1.7 migration

- SQL は `supabase/migrations/` に追加
- pgTAP test を `supabase/tests/` に追加
- 適用は `bash scripts/setup-supabase.sh` (idempotent)
- **本番 DB migration の適用は user manual 操作** (AI エージェントは自律実行しない)

### 1.8 E2E

- spec は `e2e/` 配下
- `playwright.config.ts` (default) / `playwright.auth.config.ts` (認証済 fixture) / `playwright.both.config.ts` (MOCK + Real 両モード) を使い分け
- UI / CSS 変更時は **必ず Playwright + visual regression まで通す**。「unit pass = 視覚的正しさ」と誤読しない

### 1.9 git / commit

- ブランチ: `<type>/<short-kebab-description>` (例: `feat/audit-export`、`fix/sso-callback-500`)
- commit: **Conventional Commits** (`feat:` / `fix:` / `refactor:` / `docs:` / `test:` / `chore:` / `perf:` / `ci:`)
- 1 commit = 1 論理単位 (機能 / 修正 / リファクタ)、独立して動作する状態 (test green / build green) を保つ
- `git add <specific files>` で stage、`git add -A` / `git add .` は禁止 (sensitive file / 巨大 binary の誤包含防止)

---

## 2. UI ライブラリ規範 — Chakra UI v3 必須

**新規 component / page / form / layout / dashboard / theme は Chakra UI v3 を default 採用** とする。

### 2.1 義務

- plain CSS / Tailwind / 生 HTML 要素 (`<div>` への style べた書き等) での再実装を避ける
- 既存 Chakra component の **流用・拡張を優先** (token / semantic token / recipe / slot-recipe ベース)
- 色 / spacing / typography は **token 経由**で参照、ハードコード禁止
- theme の変更は `src/theme/` (token / semantic token / recipe / slot-recipe) で行う

### 2.2 例外として認められるケース

下記は **plain CSS / 直接 style 記述を許容**:

- native OS 風 chrome の Electron renderer 等、Chakra では表現できない OS native look が必要なケース
- `globals.css` レベルの reset / font face 宣言 / `tokens.css` の CSS custom property 出力
- 3rd-party library が要求する class 名 (例: `react-day-picker` の `.rdp-*`)

**判断に迷う場合は Chakra を選ぶ** (= default 採用、例外は明示的根拠が必要)。

### 2.3 charts / data viz

- `@chakra-ui/charts` を採用、recharts を直接使わない

### 2.4 関連ドキュメント

- Chakra UI v3 公式: https://chakra-ui.com/
- ECC / hirai-method 系 harness 利用時は **§ 5 の skill 推奨**を併せて参照

---

## 3. フロントエンド作業時の skill 利用 (推奨)

利用者が **ECC (Everything Claude Code) / hirai-method 系 harness** を持っている場合、以下の skill を **default で起動** してください (`general-purpose` subagent + 手動 context7 lookup で代替しない、research-reuse 原則)。

| skill | 用途 |
|---|---|
| `chakra-ui-builder` | 新規 component / theme / layout 構築、Chakra UI セットアップ、charts |
| `chakra-ui-migrate` | Chakra UI v2 → v3 移行、既存 component の Chakra 化、breaking change 対応 |
| `chakra-ui-refactor` | token 化 / recipe 抽出 / compound component 整理 |

### 3.1 skill を持っていない利用者

`context7` MCP (もしあれば) で Chakra UI v3 公式 doc を都度参照してください。training data の古い v2 API を使うと、prop name / styleConfig / provider 配線が全部ずれます。

> 注: 「必要に応じて」= フロントエンド task で該当 skill があれば default 利用、無関係な軽微修正 (typo / 1 行 fix) では不要。

---

## 4. クリーンアーキテクチャ — 依存方向の遵守

このテンプレートの **核**は **依存方向の一方通行**です。これを破ると Port / Adapter pattern の利点 (deploy profile 切替、test の容易さ、business logic の独立) が全部崩れます。

### 4.1 依存方向 (絶対)

```
interfaces  →  application  →  domain
                                  ↑
infrastructure  ─────────────────┘
  (= application の port を実装する側)
```

具体的には:

- **Domain 層** (`src/lib/domain/`): 他のどの層からも import 禁止、**pure TypeScript** (外部 lib も最小限。zod / `Result` 型程度に留める)
- **Application 層** (`src/lib/application/`): Domain のみ import、Infrastructure は **port (IF) 経由** でのみ参照、具象 adapter を直接 import 禁止
- **Infrastructure 層** (`src/lib/infrastructure/`): Application の port を実装する側、Domain / Application を import OK、ただし **Interfaces 層から逆参照されない**
- **Interfaces 層** (`src/app/`, `src/middleware.ts`, Server Action): Application を呼ぶ、Domain も読み取り参照 OK、**Infrastructure 直接 import 禁止** (DI 経由のみ)

### 4.2 機械強制

- **`madge --circular`** で cycle 検出 (CI で gate、`pnpm lint:circular` でも実行)
- **eslint-plugin-boundaries** (config あれば) で層越え import を block

### 4.3 違反例 (やってはいけない)

```typescript
// ❌ Application から Infrastructure 具象を直接 import
import { SupabaseAuthAdapter } from '@/lib/infrastructure/adapters/auth/supabase-auth.adapter';

// ✅ Application は Port のみ参照、具象は DI で注入
import type { AuthPort } from '@/lib/application/ports/auth.port';
```

```typescript
// ❌ Domain から zod 以外の外部 lib import (例: lodash, date-fns)
import { format } from 'date-fns';   // Domain は pure TS のはず

// ✅ Domain は標準 lib のみ、整形は Application 層に
```

```typescript
// ❌ Domain Entity が DB 型を import
import type { Database } from '@/lib/infrastructure/supabase/database.types';

// ✅ Domain Entity は自前の型のみ、DB 型変換は Adapter で
```

### 4.4 「どの層に置くか」迷ったら

- **business rule** (例:「allow-list に無い email は sign-up できない」) → **Domain**
- **複数 Port を協調させる workflow** (例:「sign-up 成功 → audit log 書く → welcome email 送る」) → **Application UseCase**
- **external service との通信** (例: Supabase / SMTP / Stripe) → **Infrastructure Adapter**
- **HTTP / route / Server Action** (例: form 受付 + UseCase 呼び出し) → **Interfaces**

---

## 5. ドメイン層のコメント必須 (why を書く)

`src/lib/domain/` 配下の Entity / VO / Aggregate / Domain Event / Domain Service / Domain Error は、**ビジネスルールの why を必ずコメント** してください。

### 5.1 規範

- 「何をやっているか (what)」だけ書くのは禁止 (= コードを読めば分かる)
- 「**なぜそのルールか (why)**」「**どの業務制約から来ているか**」「**他の選択肢を取らない理由**」を書く
- コメントは TypeDoc / JSDoc 形式でも、行コメント (`//` / `/* */`) でも OK
- **Domain 以外の層 (Application / Infrastructure / Interfaces) は逆に「コメント書きすぎない」「コードで意図を表現」が default** — Domain だけ why コメント必須、と扱いが分かれる

### 5.2 OK 例

```typescript
// why: 利用者組織内の招待 invite 制限。
//   - org に紐付かない user は invite できない (multi-tenant の境界を強制)
//   - 招待時の role は inviter の role を超えない (privilege escalation 防止)
//   - 招待は 7 日で expire (rotation 強制、long-lived link の事故防止)
// 業務制約: ClassLab admin policy v2 (2025-Q3)
export class Invitation {
  constructor(
    public readonly id: InvitationId,
    public readonly inviterUserId: UserId,
    public readonly inviteeEmail: Email,
    public readonly role: Role,
    public readonly expiresAt: Date,
  ) {}

  // why: 7 日固定。短くすると業務上の再発行コストが過大、長くするとリンク漏洩リスクが線形に増える。
  //      その間の最適点を policy で 7 日と定義済 (変更時は admin policy 改訂が必要)。
  static readonly EXPIRY_DAYS = 7;
}
```

```typescript
// why: email は normalize (lowercase + trim) してから比較する。
//   - allow-list / dedup / RLS policy 全てが「正規化済」を前提に書かれている
//   - 入力時の case 差異 / 末尾 whitespace で別 user 扱いされる事故 (ClassLab 2024-11 障害) の再発防止
export class Email {
  private constructor(public readonly value: string) {}

  static create(input: string): Result<Email, ValidationError> {
    const normalized = input.trim().toLowerCase();
    // ... validation
    return ok(new Email(normalized));
  }
}
```

### 5.3 NG 例

```typescript
// User を表すクラス
// id と email を持つ
export class User {                  // ❌ what だけ、why が無い
  constructor(public readonly id: UserId, public readonly email: Email) {}
}
```

### 5.4 「迷ったら書く」原則

- 「コードだけで明白」と思っても、6 ヶ月後の自分 / 別の AI / 別の人間には伝わらないことが多い
- Domain は「business rule の凝集点」なので、why が失われると **将来の改修者が安全に変更できない**
- コメントが古くなる懸念より、why 不在で誤った変更が入る懸念のほうが大きい

---

## 6. 守らないと起こること (要約)

| 規範違反 | 起こること |
|---|---|
| Chakra を使わず plain CSS / 直接 style | token 一括変更 / dark mode / theme 切替が全箇所手作業、デザインの一貫性が崩れる |
| Domain → Infrastructure を直接 import | Deploy Profile 切替で具象 adapter が破綻、test で mock 不能に |
| Application → Infrastructure 具象を直接 import | DI 経由の差替不能、unit test で実 Supabase が起動して遅 / 課金 / 不安定 |
| Domain に外部 lib import | tree-shaking 効かず bundle 肥大、Domain test に bundler 必須化 |
| Domain に why コメント無し | 6 ヶ月後の改修で business rule を誤改変、本番事故 |
| MOCK_MODE を考慮しない adapter | local dev / E2E が credential 必須化、開発者の onboarding 障害 |
| `git add -A` で commit | `.env.local` / 大きな binary / IDE 設定が誤って commit |
| UI 変更後 Playwright 通さず「完了」宣言 | unit pass ≠ 視覚的正しさ、レビューで返り、修正コスト ×3 |

---

## 7. 関連 doc

- `README.md` — テンプレートの全体像 / Setup / Deploy Profile / MOCK_MODE / Troubleshooting / Regenerating
- `.env.example` — env 一覧 (実値は書かない、必ず `.env.local` に複製してから入れる)
- `package.json` の `scripts` — `dev` / `build` / `test` / `lint` / `type-check` / `lint:circular` / `env:validate` 等
- `next.config.mjs` / `tsconfig.json` / `playwright.config.ts` / `vitest.config.ts` / `eslint.config.mjs` — 設定 SSoT (変更前に必ず読む)
- Chakra UI v3 公式: https://chakra-ui.com/
- Supabase docs: https://supabase.com/docs
- Next.js App Router: https://nextjs.org/docs/app

---

## 8. このファイルの位置付け

- AI エージェント (Cursor / Aider / Claude Code / Codex 等) が **session 開始時に必ず読む** 規範書
- 本書は **「テンプレート利用者 = 生成 project 開発者」向け**。テンプレート自体 (このテンプレートをメンテする側) の規範ではない
- Claude Code 利用時は `CLAUDE.md` も併読 (本書 + Claude Code 特化の skill 名 / hook 規範)
- 本書を変更したら必ず PR + review。docs と挙動の drift は信頼を破壊する

> 本書は **生成 project の最上位規範** です。これと矛盾する個別 rule (例: `.cursor/rules/*.md`、`.claude/rules/*.md`) を追加する場合は、必ず本書を上位 SSoT として参照させてください。
