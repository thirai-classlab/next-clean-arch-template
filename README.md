# next-clean-arch-template

> Enterprise-ready Next.js 14 + Clean Architecture template with Chakra UI v3, Supabase RLS, and MOCK_MODE for instant local development without external credentials.

[![npm](https://img.shields.io/npm/v/%40takuma-hirai%2Fcreate-app.svg)](https://www.npmjs.com/package/@takuma-hirai/create-app)
[![Next.js](https://img.shields.io/badge/Next.js-14.2.0-black)](https://nextjs.org)
[![MIT License](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

## Table of Contents

- [Quick Start](#quick-start)
- [What is This Template](#what-is-this-template)
- [Features](#features)
- [Project Structure](#project-structure)
- [Component Catalog](#component-catalog)
- [Official References](#official-references)
- [License](#license)

---

## Quick Start

Next.js 14 + Clean Architecture テンプレートを使用して、わずか 5 分で新規プロジェクトを立ち上げられます。

### Prerequisites

以下をインストールしてください:

- **Node.js** >= 20 ([https://nodejs.org](https://nodejs.org))
- **pnpm** >= 9 (`npm install -g pnpm`)

macOS / Linux / WSL on Windows いずれでもサポートされています。

### Step 1: Run Scaffolding

最もシンプルな方法は `npx` で対話的にセットアップするものです:

```bash
npx @takuma-hirai/create-app my-app
```

プロンプトに従って以下を指定してください:

- **Project name**: `my-app` (または任意の名前)
- **Package manager**: `pnpm` (推奨)
- **Git initialization**: `yes` (推奨)
- **Profile**: `vercel-supabase` (推奨)

プロンプトなしで自動化する場合は、以下を利用できます:

```bash
npx @takuma-hirai/create-app my-app --pm pnpm --no-install --no-git --profile vercel-supabase
```

### Step 2: Install Dependencies

```bash
cd my-app
pnpm install
```

### Step 3: Setup Environment Variables

`.env.example` をコピーして `.env.local` を作成します:

```bash
cp .env.example .env.local
```

デフォルトでは **`MOCK_MODE=true`** が設定されており、外部の認証情報は不要です。このモードでは:

- メモリ内アダプタを使用 (永続化なし、再起動時リセット)
- Supabase プロジェクト不要
- Google OAuth 資格情報不要
- シードされたテスト管理者認証情報でサインイン可能

### Step 4: Start Development Server

```bash
pnpm dev
```

ブラウザを開いて [http://localhost:3000](http://localhost:3000) にアクセスしてください。

Home ページが表示され、次のコンポーネントが確認できます:

- **KPI カード** (主要メトリクス表示)
- **ログイン状態** (テスト管理者 `test@classlab.co.jp` でサインイン可能)
- **Navigation** (サイドバー + トップバー)

### Step 5: Explore Component Gallery (Optional)

アプリがビルドされたら、組み込みのコンポーネントギャラリーを確認できます:

[http://localhost:3000/admin/gallery](http://localhost:3000/admin/gallery)

ここでは Chakra UI v3 をベースとした全 UI コンポーネント (ボタン・フォーム・テーブル・モーダル等) が表示されます。

### Connect to Production Supabase (Optional)

実際の Supabase プロジェクトに接続する場合は:

1. **Supabase プロジェクト作成**: [https://app.supabase.com](https://app.supabase.com)
2. **セットアップスクリプト実行**:

```bash
bash scripts/setup-supabase.sh
```

このスクリプトが以下を自動的に実行します:

- `.env.local` から設定を読み込み
- Supabase プロジェクトをリンク
- DB マイグレーション適用
- 管理者ユーザー許可リストのシード

### Deploy to Vercel (Optional)

Vercel にデプロイする場合:

```bash
bash scripts/setup-vercel.sh
```

このスクリプトが以下を実行します:

- Vercel プロジェクトをリンク
- 環境変数を一括インポート
- 定期 cron ジョブ (監査ログクリーンアップ) をセットアップ

### Run Tests

以下のコマンドはスケルトンプロジェクトディレクトリ (Step 2 で `cd my-app` した場所) で実行してください:

```bash
# Unit & integration tests (vitest)
pnpm test

# E2E tests (Playwright)
pnpm test:e2e

# Linting
pnpm lint

# Type checking
pnpm type-check

# Build
pnpm build
```

### Troubleshooting

| Issue | Root Cause | Solution |
|---|---|---|
| `pnpm dev` returns `500` error | `MOCK_MODE` unset, non-mock profile launching | `export MOCK_MODE=true` or set in `.env.local` |
| Components not rendering | Next.js build cache issue | `rm -rf .next && pnpm dev` |
| Test credentials for MOCK_MODE | Where are test admin credentials? | Home page **LoginGuide** section displays them. Default: `test@classlab.co.jp` / `password123` |
| `pnpm test:e2e` fails | Playwright browsers not installed | `npx playwright install` |

### Next Steps

テンプレートが起動したら、以下を確認してください:

1. **Architecture layers**: `src/lib/` 下の Clean Architecture 4 層 (domain / application / infrastructure / interfaces)
2. **Authentication flow**: `/auth/sign-in` → サインイン → `/admin` ダッシュボード
3. **Configuration**: `.env.local` の各環境変数の役割
4. **Component Gallery**: `/admin/gallery` で Chakra UI v3 コンポーネントカタログを確認

詳細は [Architecture](#project-structure) セクションを参照してください。

---

## What is This Template

**next-clean-arch-template** は、Next.js 14 App Router + Clean Architecture (DDD 4層) + Chakra UI v3 + Supabase RLS を統合した、**エンタープライズ対応 SaaS / B2B Web アプリケーション** の起点テンプレートです。個人・小規模チームが「0 から本番化可能な構造」を手に入れることが目的です。

### ✨ Core Capabilities

- **Authentication & Authorization**: Google OAuth + Email/Password 認証、JWT ロールベース認可 (admin/member/viewer)、Supabase RLS で row-level セキュリティ
- **Audit & Compliance**: audit_log テーブル + SECURITY DEFINER で全データ変更を記録、規制業界向け監査証跡を自動化
- **Admin UI Ready**: 複数の admin ページ、user/role/audit 管理画面、Chakra UI v3 コンポーネント、レスポンシブ対応済み
- **Clean Architecture**: Domain 層は framework 非依存の pure TypeScript、Application 層は port pattern で外部依存を抽象化、MOCK / Real 切替を env で集中制御
- **Zero-Credential Setup**: `MOCK_MODE=true` で Supabase API key / Google OAuth なしに完全な UI フロー動作、デモ・ローカル開発効率化
- **1-Command Deploy**: 4 つのデプロイプロファイルで Vercel / VPS に即座にデプロイ可能

### 🎯 Ideal Use Cases

- **SaaS launches by individuals/small teams**: SSO + user management + admin panel が即座に必要な B2B / B2C サービス
- **Regulated industry web apps** (金融・医療・教育): audit log / RLS による compliant なデータ保護、role-based 権限管理の boilerplate
- **Enterprise PoC / MVP**: 複雑な機能を短期で実装・検証する基盤
- **Learning clean architecture**: domain/application/infrastructure の分離学習と実践を同時進行

### 🚫 Not Ideal For

- **Static sites / blogs**: SSR 可能ですが、認証・DB・admin UI は過剰装備
- **Monolithic legacy systems**: 最初から Clean Architecture を強制するため、既存システムへの段階的導入に不向き
- **Lightweight API servers**: Next.js Server Actions を採用しており、REST / GraphQL 単体の場合は別フレームワーク推奨

### 🧬 Design Philosophy

- **Domain layer is framework-independent**: Entity / Aggregate / Value Object / Domain Event / Domain Error を pure TypeScript で定義
- **Application layer uses port pattern**: Repository / Gateway / Port interface を先に定義し、Infrastructure 層で MOCK / Real 実装を差し替え可能
- **Infrastructure decouples via env**: `DEPLOY_PROFILE` env で DI container の実装を切り替え、ローカル開発と本番デプロイの差分を最小化
- **UI via Chakra UI v3 tokens**: semantic token / recipe / compound component パターンで再利用性・メンテナンス性を確保
- **RLS enforces access control**: row-level アクセス制御を DB 層で強制、application 層のバグに耐性を持つ多層防御

---

## Features

### 🏗 Architecture

| Feature | Details |
|---|---|
| Clean Architecture 4 layers | Domain (entity / VO / aggregate / event) → Application (use-case / port IF / repository IF) → Infrastructure (adapter / DI) → Interfaces (Server Action / middleware) |
| DDD building blocks | Entity / Value Object / Aggregate / Domain Event で domain 層の pure logic 実装 |
| Port pattern abstraction | 複数の Port × Adapter で `MOCK_MODE` 環境変数で外部依存を即切替 |
| Dependency enforcement | eslint-plugin-boundaries で層間違反を CI 検出 |
| Circular dependency detection | madge --circular で循環参照を可視化・CI 検出 |
| DI Container (tsyringe) | Use-case × port を `DEPLOY_PROFILE` に応じて複数通り mapping |
| Type-safe DTO sharing | `packages/contracts` の zod schema が REST DTO / Domain Entity の SSoT |

### 🔐 Authentication / Authorization / Security

| Feature | Details |
|---|---|
| Supabase Auth + Google OAuth | Google SSO + email/password を SupabaseAuthAdapter で実装、`MOCK_MODE` で MockAuthAdapter に切替 |
| Domain verification hook | `@classlab.co.jp` ドメインユーザを自動 active にして signup フロー短縮 |
| JWT custom claims | access_token に `user_role` (admin/member/viewer) / `user_status` (active/pending/rejected) を injection |
| Rate limiting (3 adapters) | InMemory / Upstash / Mock の 3 実装、IP:endpoint key で攻撃防止 |
| Audit logging | 全 write 操作を SECURITY DEFINER 関数経由で記録、90 日 cron で自動削除 |
| Row-Level Security (25 policies) | 8 table で role 別アクセス制御 |
| API-key-less POC | `MOCK_MODE=true` で credential 不要、demo 即座に起動可能 |

### 🎨 UI / Components / Theming

| Feature | Details |
|---|---|
| Chakra UI v3 (3.35.0) | 50+ component を Linear/Vercel design-token でporting |
| Semantic Token + OKLCH | oklch color space で light/dark theme 自動切替 |
| Responsive fluid typography | clamp(rem) で mobile ～ desktop 自動調整 |
| Dark mode support (next-themes) | System / light / dark 3 モード |
| Component gallery | `/admin/gallery` で Chakra UI v3 component を showcase |
| Form integration | react-hook-form + Chakra + zod resolver |

### 🧪 Testing / Quality / E2E

| Feature | Details |
|---|---|
| Unit + Integration (vitest) | Use-case の business logic 検証 |
| E2E Playwright | Critical user flow 検証 |
| a11y scanning | WCAG 2.1 AA 0 violations 目標 |
| 80%+ coverage threshold | build gate |
| No external server required | setup-supabase.sh 実行後も開発中は `MOCK_MODE` で API key 不要 |

### 🚀 Deployment / Profiles

| Feature | Details |
|---|---|
| 4 Profiles (DEPLOY_PROFILE) | minimal / unlocked / pro / vps で adapter mapping 変更 |
| Vercel + Supabase (default) | Vercel deploy + zod 共有 |
| Automated setup-supabase.sh | 環境セットアップ自動化 |
| Automated setup-vercel.sh | Vercel CLI integration |
| env validation prebuild hook | build 前 config 検証 |

### 📦 Scaffolding CLI

| Feature | Details |
|---|---|
| 1-command create-app | `npx @takuma-hirai/create-app` で自動化 |
| giget template fetch | GitHub repo の template/ パスから fetch |
| Interactive prompts | project name / package manager / profile 選択 |
| Template independence | fresh checkout 後 build/test/lint 通過 smoke test |

### 🤖 Mock / Real Switching

| Feature | Details |
|---|---|
| MOCK_MODE environment | `true` (default) で全 adapter を Mock mode に切替 |
| Auth Gateway × 2 | SupabaseAuthAdapter + MockAuthAdapter |
| Rate Limiter adapter | InMemory / Upstash / Mock の 3 実装 |
| Configurable providers | Authentication / storage / cache provider の環境切替 |

---

## Project Structure

このテンプレートはモノレポ構成で、CLI パッケージ (`@takuma-hirai/create-app`) と Next.js スケルトン テンプレート (`template/`) を一つのリポジトリで管理しています。

**Note**: The `template/` directory in this monorepo contains only essential scaffolding configuration files. The complete application source (`src/`, `tests/`, `e2e/`, `scripts/`, `supabase/`) is generated when you run `npx @takuma-hirai/create-app`.

### Directory Tree (Scaffolded Project)

```
my-app/
├── src/
│   ├── domain/                       # Entity / Value Object / Aggregate
│   ├── application/                  # Use Case + Port インターフェース
│   ├── infrastructure/               # tsyringe DI container + adapter
│   ├── interfaces/                   # Route Handler / Server Action / Middleware
│   ├── components/                   # Chakra UI v3 コンポーネント
│   ├── lib/                          # theme / auth / security utils / env-schema
│   └── app/                          # Next.js App Router
├── tests/                            # vitest 単体・統合テスト
├── e2e/                              # Playwright E2E テスト
├── public/                           # 静的資産
├── scripts/                          # setup-supabase.sh / setup-vercel.sh
├── supabase/                         # migration + RLS policy
├── .env.example                      # 環境変数テンプレート
├── next.config.mjs                   # CSP / Security header
├── tsconfig.json                     # strict mode / decorator support
├── package.json                      # プロジェクト依存
└── playwright.config.ts              # E2E 設定
```

### Clean Architecture Layer Dependencies

```
┌──────────────┐
│  Interfaces  │  Route Handler / Server Action / Middleware
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Application  │  Use Case / Port インターフェース / Repository IF
└──────┬───────┘
       │
       ▼
┌──────────────┐
│    Domain    │  Entity / Value Object / Aggregate / Domain Event
└──────────────┘  (framework 非依存)
       ▲
       │ (implements)
┌──────┴───────┐
│Infrastructure│  tsyringe DI / adapter 実装
└──────────────┘
```

**Dependency rules:**
- Domain → 他層への import 禁止
- Application → Infrastructure への直接 import 禁止 (Port 経由のみ)
- Interfaces → Application のみに依存
- Infrastructure は Application の Port を実装

### DEPLOY_PROFILE Environment Profiles

The scaffolded project uses the `DEPLOY_PROFILE` environment variable to control which adapters are loaded at runtime:

| Profile | Auth | DB | File Storage | Cache | Rate Limit | Use Case |
|---|---|---|---|---|---|---|
| **minimal** | mock | in-memory | in-memory | — | mock | ローカル開発 |
| **unlocked** | Supabase SSR | Supabase | Supabase Storage | — | mock | Vercel draft |
| **pro** | Supabase SSR | Supabase | Supabase Storage | Redis | real | Vercel production |
| **vps** | NextAuth | Postgres | MinIO | Redis | real | VPS self-host |

The CLI scaffolding command `--profile` flag corresponds to these runtime profiles as follows:
- `--profile vercel-managed` → `DEPLOY_PROFILE=minimal`
- `--profile vercel-supabase` → `DEPLOY_PROFILE=pro`
- `--profile vps` → `DEPLOY_PROFILE=vps`
- `--profile air-gap` → `DEPLOY_PROFILE=minimal` (offline only)

### Boundary Enforcement

#### 1. Circular Dependency Detection (madge)

```json
{
  "scripts": {
    "lint:circular": "madge --circular src/",
    "deps:layers": "madge src/ --image src-layers.png"
  }
}
```

#### 2. Port Pattern for Layer Isolation

- **Port interface** は `src/application/ports/` で定義
- **Adapter** は `src/infrastructure/adapters/` で実装
- **DI Container** で register
- **Use Case** は constructor injection で Port を依存

---

## Component Catalog

next-clean-arch-template では **Chakra UI v3** + Linear design token ベースの unified component system を採用しています。すべてのコンポーネントは semantic token + dark mode (next-themes) に対応しています。

### Primitive Components

| Component | Usage | Reference |
|---|---|---|
| Button | クリック操作、4 variants | [Chakra Button](https://www.chakra-ui.com/docs/components/button) |
| IconButton | アイコンボタン | [Chakra Icon Button](https://www.chakra-ui.com/docs/components/icon-button) |
| Input | テキスト入力 | [Chakra Input](https://www.chakra-ui.com/docs/components/input) |
| Textarea | 複数行テキスト | [Chakra Textarea](https://www.chakra-ui.com/docs/components/textarea) |
| Select | ドロップダウン | [Chakra Select](https://www.chakra-ui.com/docs/components/select) |
| Switch | ON/OFF トグル | [Chakra Switch](https://www.chakra-ui.com/docs/components/switch) |
| Radio | ラジオボタン | [Chakra Radio](https://www.chakra-ui.com/docs/components/radio) |
| Checkbox | チェックボックス | [Chakra Checkbox](https://www.chakra-ui.com/docs/components/checkbox) |

### Composite Components

| Component | Usage | Reference |
|---|---|---|
| Form | React Hook Form + zod | (template 独自実装) |
| FormField | フォーム項目ラッパー | (template 独自実装) |
| Table | TanStack DataTable | [Chakra Table](https://www.chakra-ui.com/docs/components/table) |
| Modal | ダイアログ | [Chakra Dialog](https://www.chakra-ui.com/docs/components/dialog) |
| Drawer | サイドシート | (template 独自実装) |
| Tooltip | ツールチップ | [Chakra Tooltip](https://www.chakra-ui.com/docs/components/tooltip) |
| Popover | フローティング表面 | [Chakra Popover](https://www.chakra-ui.com/docs/components/popover) |
| Tabs | タブペイン | [Chakra Tabs](https://www.chakra-ui.com/docs/components/tabs) |
| Menu | ドロップダウンメニュー | [Chakra Menu](https://www.chakra-ui.com/docs/components/menu) |
| Accordion | 折りたたみセクション | [Chakra Accordion](https://www.chakra-ui.com/docs/components/accordion) |
| Breadcrumb | Breadcrumb trail | [Chakra Breadcrumb](https://www.chakra-ui.com/docs/components/breadcrumb) |
| CommandPalette | ⌘K パレット | (template 独自実装) |
| ConfirmDialog | 確認モーダル | (template 独自実装) |
| Steps | ウィザードステップ | (template 独自実装) |
| Progress | プログレスバー | [Chakra Progress](https://www.chakra-ui.com/docs/components/progress) |
| Avatar | ユーザーアバター | [Chakra Avatar](https://www.chakra-ui.com/docs/components/avatar) |
| ColorModeToggle | Dark mode toggle | (template 独自実装) |

### Feedback & State

| Component | Usage | Reference |
|---|---|---|
| Toast | トースト通知 | [Chakra Toaster](https://www.chakra-ui.com/docs/components/toast) |
| Alert | Alert banner | [Chakra Alert](https://www.chakra-ui.com/docs/components/alert) |
| Spinner | ローディング | [Chakra Spinner](https://www.chakra-ui.com/docs/components/spinner) |
| Skeleton | Placeholder | [Chakra Skeleton](https://www.chakra-ui.com/docs/components/skeleton) |
| EmptyState | データなし | (template 独自実装) |
| ErrorBoundary | Error boundary | (template 独自実装) |

### Layout Components

| Component | Usage | Reference |
|---|---|---|
| Stack | 垂直 flex | [Chakra Stack](https://www.chakra-ui.com/docs/components/stack) |
| Inline | 水平 flex | (template 独自実装) |
| Grid | CSS grid | [Chakra Grid](https://www.chakra-ui.com/docs/components/grid) |
| Container | Centered wrapper | [Chakra Container](https://www.chakra-ui.com/docs/components/container) |
| Spacer | スペーサー | [Chakra Spacer](https://www.chakra-ui.com/docs/components/spacer) |

### Typography

| Component | Usage | Reference |
|---|---|---|
| Heading | 見出し (h1-h6) | [Chakra Heading](https://www.chakra-ui.com/docs/components/heading) |
| Text | 本文テキスト | [Chakra Text](https://www.chakra-ui.com/docs/components/text) |
| Code | コード表示 | [Chakra Code](https://www.chakra-ui.com/docs/components/code) |
| Link | ハイパーリンク | [Chakra Link](https://www.chakra-ui.com/docs/components/link) |

### Domain Components

| Component | Usage |
|---|---|
| BotStatusBadge | Bot ライフサイクル表示 |
| UsersTable | Admin ユーザーリスト |
| UserRoleControl | User role 変更 |
| AllowListManager | Allow list 管理 |
| AuditLogTable | Audit log 表示 |
| PendingApprovalsTable | Pending user 承認 |

### Shell & Navigation

| Component | Usage |
|---|---|
| AppShell | レスポンシブシェル |
| Sidebar | メイン nav rail |
| Topbar | トップアプリバー |
| ConditionalShell | レイアウト条件分岐 |
| UserMenu | ユーザーメニュー |

### Utilities

| Component | Usage | Reference |
|---|---|---|
| Badge | 小型ラベル | [Chakra Badge](https://www.chakra-ui.com/docs/components/badge) |
| Card | カード基本 | [Chakra Card](https://www.chakra-ui.com/docs/components/card) |
| NoteBanner | 情報バナー | (template 独自実装) |
| LivePulse | Live indicator | (template 独自実装) |

### Technology Stack

- **Chakra UI v3** (3.35.0) with Linear design tokens + oklch palette
- **Semantic tokens**: bg / fg / accent / status / border (light & dark)
- **Typography**: clamp() for fluid typography (xs-6xl), 4px spacing scale
- **Dark mode**: next-themes (class attribute on `<html>`)
- **Accessible UI**: Radix UI primitives
- **Data tables**: TanStack DataTable
- **Forms**: React Hook Form + Zod resolver
- **Icons**: Lucide React

### Component Gallery

全コンポーネントの visual preview は `/admin/gallery` にて確認可能です (scaffolded project 内)。各コンポーネントの props / variants / states を interactive に検証できます。

---

## Official References

### Framework / Runtime
| Technology | Version | Documentation |
|---|---|---|
| Next.js | 14.2.0 | https://nextjs.org/docs |
| React | 18.3.0 | https://react.dev |
| TypeScript | 5.4.0 | https://www.typescriptlang.org/docs |

### UI / Theme / Components
| Technology | Version | Documentation |
|---|---|---|
| Chakra UI v3 | 3.35.0 | https://www.chakra-ui.com/docs/components |
| next-themes | 0.4.6 | https://github.com/pacocoursey/next-themes |
| Lucide React | 1.16.0 | https://lucide.dev/docs/lucide-react |
| Radix UI | 1.x | https://www.radix-ui.com/docs/primitives/overview/introduction |
| CVA | 0.7.1 | https://cva.style/docs |

### Database / Auth
| Technology | Version | Documentation |
|---|---|---|
| Supabase JS Client | 2.106.2 | https://supabase.com/docs/reference/javascript/introduction |
| Supabase Auth | 2.106.2 | https://supabase.com/docs/guides/auth/server-side-rendering |
| @supabase/ssr | 0.10.3 | https://supabase.com/docs/guides/auth/server-side-rendering |

### Dependency Injection / State
| Technology | Version | Documentation |
|---|---|---|
| tsyringe | 4.10.0 | https://github.com/microsoft/tsyringe |
| reflect-metadata | 0.2.2 | https://github.com/rbuckton/reflect-metadata |
| Zustand | 4.5.0 | https://github.com/pmndrs/zustand |

### Forms / Validation
| Technology | Version | Documentation |
|---|---|---|
| React Hook Form | 7.76.1 | https://react-hook-form.com |
| Zod | 3.23.0 | https://zod.dev |

### Test / QA
| Technology | Version | Documentation |
|---|---|---|
| Vitest | 2.1.0 | https://vitest.dev |
| Playwright | 1.60.0 | https://playwright.dev/docs/intro |
| @testing-library/react | 16.3.2 | https://testing-library.com/docs/react-testing-library/intro |
| @axe-core/playwright | 4.11.3 | https://github.com/dequelabs/axe-core-npm/tree/develop/packages/playwright |

### Build / Tooling / Logging
| Technology | Version | Documentation |
|---|---|---|
| PNPM | latest | https://pnpm.io/ |
| ESLint | 10.4.0 | https://eslint.org/docs/latest |
| Pino | 10.3.1 | https://getpino.io/ |

### Data Presentation
| Technology | Version | Documentation |
|---|---|---|
| TanStack React Table | 8.21.3 | https://tanstack.com/table/latest/docs/guide/introduction |

### Architecture / Patterns
| Concept | Reference |
|---|---|
| Clean Architecture | https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html |
| Domain-Driven Design | https://www.domainlanguage.com/ddd |

### Related Repositories

| Repository | URL |
|---|---|
| next-clean-arch-template (GitHub) | https://github.com/thirai-classlab/next-clean-arch-template |
| @takuma-hirai/create-app (npm) | https://www.npmjs.com/package/@takuma-hirai/create-app |

---

## License

This project is licensed under the **MIT License**. See the [LICENSE](./LICENSE) file for details.

### Contributing

Contributions are welcome! Please open an issue on [GitHub](https://github.com/thirai-classlab/next-clean-arch-template/issues) to propose changes or report bugs.

### Author

Created by **Takuma Hirai** ([@takuma-hirai](https://github.com/takuma-hirai))

For questions or support, please open an issue on [GitHub](https://github.com/thirai-classlab/next-clean-arch-template/issues).
