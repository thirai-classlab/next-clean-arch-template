# @classlab/next-clean-arch-template

Production-ready **Next.js 14 (App Router) + Supabase + Vercel** starter built on
a strict **Clean Architecture** (domain / application / infrastructure /
interfaces) with a dependency-injection container, a 4-profile deploy model,
auth + admin + audit-log out of the box, and a `MOCK_MODE` that lets the whole
UI flow run with zero external credentials.

This repository is **generated** from the ClassLab `recall_poc` reference
implementation by `scripts/extract-template.sh`. The Recall.ai proof-of-concept
product surface (meeting-bot pages, transcription, calendar, realtime, webhooks,
etc.) is pruned; the reusable clean-architecture template surface is kept.

## Setup

### 推奨起動 syntax (default、ドキュメント全体で SSoT)

```bash
npx @classlab/create-app my-new-project
```

**理由:** scope 付き package 名 (`@classlab/...`) のため、GitHub Packages の
`@classlab` scope mapping (`~/.npmrc`) と完全整合します。`_authToken` がその
まま使われ、auth path が最短になります。

### Alternative 起動経路 (上記が動かない場合のみ)

| 経路 | 動作 | 備考 |
|---|---|---|
| `npx create-classlab-app my-project` | package.json の `bin` 名直接 | fallback |
| `npm init @classlab my-project` | npm convention 経路 | 非推奨 |
| `npm create @classlab my-project` | `npm init` の alias | 非推奨 |

Alternative はすべて非推奨です。dev / CI / docs すべて
`npx @classlab/create-app` で統一してください。

### Manual (git clone) fallback

```bash
git clone https://github.com/classlab/next-clean-arch-template.git my-app
cd my-app
pnpm install
cp .env.example .env.local   # or use the setup scripts below
pnpm dev
```

Open <http://localhost:3000>. With `MOCK_MODE=true` (the default) you can sign in
with the seeded mock admin credential and exercise the full admin flow without a
real Supabase project.

## Deploy Profiles

The DI container (`src/lib/infrastructure/container.ts`) selects a set
of adapters per **Deploy Profile**, resolved from the `DEPLOY_PROFILE` env var
(default `minimal`). `MOCK_MODE=true` overrides everything and wires the
exhaustive in-memory mock profile.

| Profile | Persistence | Auth | Intended target |
|---|---|---|---|
| `minimal` | in-memory | mock / Supabase | local dev, demos, CI |
| `unlocked` | Supabase | Supabase | small Vercel + Supabase deploys |
| `pro` | Supabase + Upstash | Supabase | multi-instance Vercel (managed) |
| `vps` | Postgres + Redis (self-host) | Supabase / self-host | on-prem / air-gap |

Switching profiles never touches application or domain code — only the
infrastructure adapter wiring changes. This is the core value of the port /
adapter boundary: business logic depends on Application-layer **ports**, and
each profile binds a concrete adapter implementation behind the same port.

## Architecture

```
src/lib/
├── domain/          # entities, value-objects, aggregates, domain errors/events
│                    #   (pure TS, depends on nothing else)
├── application/     # ports (interfaces), use-cases, repository interfaces
│                    #   (depends only on domain)
├── infrastructure/  # adapters (mock + real), in-memory repositories, the DI
│                    #   container, deploy-profile → adapter mapping
└── interfaces/      # server actions + middleware (the delivery layer)
```

**Dependency rule:** `interfaces → application → domain` and
`infrastructure → application (ports)`. The domain layer imports nothing from
outer layers. A `madge --circular` check enforces the absence of cycles, and
`scripts/extract-template.test.sh` runs it on every regeneration (in the
upstream repo; this generated template ships flat with the app at the root).

### What ships in the box

- **Auth**: email/password + Google OAuth sign-in, sign-out, OAuth callback,
  per-request session resolution, and a `middleware.ts` auth-guard that gates
  every non-`/auth/*` route (unauthenticated → `/auth/sign-in?next=...`).
- **Admin**: an `(admin)` route group with user list / detail, role changes,
  pending-approval queue, an allow-list editor, an audit-log viewer, and an
  organization-settings page.
- **Audit log**: every admin mutation is wrapped to emit an audit entry, plus a
  daily Vercel cron (`/api/cron/audit-cleanup`) that prunes old entries.
- **Component library**: a `components/ui` primitive + composite set (buttons,
  cards, badges, tables, forms, modals, drawers, command palette, …) on top of
  Chakra UI v3 design tokens (`theme/` + `styles/tokens.css`), an app shell
  (`Sidebar` / `Topbar` / `UserMenu` / `ConditionalShell`), and a home guide
  (`LoginGuide` / `UsageGuide`).
- **Dev component gallery**: `(admin)/admin/dev/components` renders a live
  catalog of every UI component for visual regression and design review.
- **Env validation**: `scripts/env-schema.ts` + `env-validate.ts` validate
  required env at startup (fail-fast, schema-based — the SSoT for `MOCK_MODE` /
  `DEPLOY_PROFILE` / secrets).

## Project layout

This template is a **single Next.js app at the repository root** (no monorepo /
pnpm-workspace wrapper). Run every command from the root — there is no
`apps/web/` subfolder to `cd` into.

```
.
├── src/                       # app/ + components/ + lib/ + theme/ + styles/
├── scripts/                   # env-schema.ts, env-validate.ts, bundle-size.mjs,
│                              #   setup-supabase.sh, setup-vercel.sh, lib/common.sh
├── e2e/                       # Playwright specs (middleware, shell, admin)
├── supabase/                  # config.toml, migrations, tests
├── public/                    # static assets
├── next.config.mjs / tsconfig.json / playwright.config.ts
├── vitest.config.ts / eslint.config.mjs / tailwind.config.ts / postcss.config.js
├── vercel.ts                  # typed Vercel config (daily audit-cleanup cron)
├── package.json               # name: next-clean-arch-template (private)
├── pnpm-lock.yaml
├── .env.example
├── README.md
├── LICENSE
└── .gitignore
```

## Setup scripts

Two idempotent provisioning helpers live in `scripts/` and resolve all paths
relative to the repository root (self-contained — no monorepo-specific
assumptions):

```bash
bash scripts/setup-supabase.sh   # link/migrate the Supabase project + seed roles
bash scripts/setup-vercel.sh     # link the Vercel project + push env + cron
```

Both read `.env.local` at the project root, never echo secret values, and are
safe to re-run.

## Testing

```bash
pnpm test                       # vitest unit + integration
pnpm exec playwright test       # Playwright E2E (middleware / shell / admin)
pnpm build                      # next build
npx madge --circular --extensions ts,tsx src   # dependency-cycle gate
```

## Environment

| Var | Default | Meaning |
|---|---|---|
| `MOCK_MODE` | `true` | wire the in-memory mock profile (no external creds) |
| `DEPLOY_PROFILE` | `minimal` | adapter profile when `MOCK_MODE=false` |
| `NEXT_PUBLIC_SUPABASE_URL` | — | Supabase project URL (non-mock) |
| `SUPABASE_SERVICE_ROLE_KEY` | — | server-only Supabase service role |
| `CRON_SECRET` | — | bearer token verified by the audit-cleanup cron |

See `scripts/env-schema.ts` for the authoritative schema.

## MOCK_MODE

`MOCK_MODE=true` is the default and the recommended way to develop and demo.
When enabled, the DI container wires the **exhaustive in-memory mock profile**:
every Application-layer port resolves to an in-memory adapter, and every
repository resolves to an in-memory store. No Supabase project, no Vercel
account, and no third-party API keys are required.

Implications:

- **Auth** resolves a seeded mock admin session. The home `LoginGuide`
  surfaces the seeded credential (overridable via `MOCK_SEED_EMAIL` /
  `MOCK_SEED_PASSWORD`) so you can sign in immediately.
- **Persistence** is process-local and resets on restart. In-memory stores use
  a `globalThis`-anchored singleton so Next.js dev-server module reloads do not
  silently fork the data.
- **Audit log / allow-list / role changes** all work end-to-end in memory, so
  the full admin flow (sign in → invite user → grant role → view audit log) is
  exercisable without any external service.

To run against real infrastructure, set `MOCK_MODE=false` and pick a
`DEPLOY_PROFILE` plus the matching env (Supabase URL + keys, etc.). Use the
setup scripts to provision and link those services.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `pnpm dev` 500 on sign-in | `MOCK_MODE` unset → non-mock profile booted with no creds | export `MOCK_MODE=true` (or configure Supabase env) |
| `UnregisteredDependencyError` | a port resolved before `await ensureContainer()` | call `await ensureContainer()` in the Server Action / Route Handler before `container.resolve()` |
| `madge --circular` reports a cycle | an inner layer imported an outer layer | move the shared type to `domain/` or invert the dependency via a port |
| audit-cleanup cron 401 | `CRON_SECRET` mismatch | set `CRON_SECRET` in Vercel project env to match the bearer the cron sends |
| Supabase migration fails | project not linked | run `bash scripts/setup-supabase.sh` first |

## Security notes

- **Secrets** live only in `.env.local` (gitignored) or the deploy platform's
  env store. Never commit real keys. `scripts/env-schema.ts` is the
  authoritative list of required vars and fails fast when one is missing.
- The audit-cleanup cron verifies an `Authorization: Bearer ${CRON_SECRET}`
  header before doing any work — only the Vercel scheduler (which holds the
  secret) can trigger it.
- The auth-guard `middleware.ts` denies every non-`/auth/*` route to
  unauthenticated requests and redirects to `/auth/sign-in?next=...`, so no
  page is accidentally public.
- Server-only modules (the DI container, the service-role Supabase client) must
  never be imported from a Client Component; the container is wired through
  Server Actions / Route Handlers only.

## Regenerating this template

This template is produced by `scripts/extract-template.sh` in the upstream
`recall_poc` repository. The script is idempotent: it flattens `apps/web` into
a single app at the root, copies the root config (scripts / supabase /
vercel.ts), prunes the Recall.ai POC product surface, resolves the `vercel.ts`
cron-path drift, scaffolds this README + LICENSE + `.gitignore`, regenerates a
fresh `pnpm-lock.yaml`, and runs `git init`. Re-running it twice yields a
byte-identical tree (verified by `scripts/extract-template.test.sh`).

## Contributing

1. Branch with `<type>/<short-kebab-description>` (Conventional Commits).
2. Keep the dependency rule intact — never import an outer layer from an inner
   layer. CI runs the `madge --circular` gate.
3. Add tests first (TDD). Unit + integration via vitest, E2E via Playwright.
4. Open a PR; CI runs lint / typecheck / test / build / Playwright.

## License

MIT © ClassLab Inc. See [LICENSE](./LICENSE).
