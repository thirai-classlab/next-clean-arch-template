# @takuma-hirai/create-app

## 0.2.0

### Minor Changes

- 9996a73: Install-time deployment pattern selection. The CLI now asks (or accepts flags for) the full pattern matrix at scaffold time and writes the resolved configuration into the generated project:

  - New flags / prompts: `--target <vercel|vps>`, `--backend <next-only|next-nest>`, `--db <postgres|mariadb>`, `--auth <google|email-pw...>`, `--auth-domain <domain>`. `(target, backend, db)` resolves to one of the 5 `DEPLOY_PROFILE` values (`pro` / `vps-next-postgres` / `vps-next-mariadb` / `vps-nest-postgres` / `vps-nest-mariadb`); `--auth` resolves to `LOGIN_STRATEGY` (`sso` / `email-pass` / `both`) and `--auth-domain` to `AUTH_ALLOWED_EMAIL_DOMAIN`.
  - Per-provider Prisma client selection: the template ships `prisma-client.postgres.ts` / `prisma-client.mariadb.ts` variants and post-clone copies the matching one over `prisma-client.ts`, so webpack statically traces a single import path (no MODULE_NOT_FOUND on pruned files). Pattern-irrelevant files (e.g. `api/` on next-only, NextAuth/Prisma on vercel) are pruned after clone.
  - Non-TTY contract: headless / CI invocations fail fast with the named missing flags (`name` always required; `--backend` and `--db` required when `--target vps`) instead of hanging on prompts.
  - "When to choose" guidance (next-only vs next+nest, Vercel vs VPS) documented in the README Deployment Patterns section.
  - `CREATE_APP_TEMPLATE_SOURCE` env override for the template fetch source (`github:owner/repo/subdir#ref`) — fork / branch / E2E verification without touching the default source; when set, the default-repo git-clone fallback is disabled to avoid silently fetching a different source.
  - Legacy `--profile` flag is kept for backward compatibility and internally mapped to `--target` / `--backend` / `--db`.

- 52c2214: Supabase profile: the signup domain hook's primary domain is now configurable via `AUTH_ALLOWED_EMAIL_DOMAIN` (previously hardcoded to `classlab.co.jp` in `006_auth_hook_domain_check.sql`). Migration `010_domain_hook_config.sql` introduces a `public.hook_config` row that the signup trigger resolves at runtime, and `scripts/setup-supabase.sh` (Phase 6b) seeds it from the env var: unset = keep the existing config row (migration default), `example.com` / `@example.com` = upsert as the primary signup domain, empty string = no domain restriction — semantics identical to the NextAuth-side `ALLOWED_ADMIN_EMAIL_DOMAIN` check. All `hook_config` mutations are recorded in `audit_log` via an `AFTER INSERT OR UPDATE` trigger (`action='config.domain_changed'`, old/new values in payload).
- 0f52800: Add vps-nest-postgres and vps-nest-mariadb deploy profiles: NestJS API owns authentication (Passport credentials + Google OAuth + JWT cookie + RolesGuard + domain hook), Next.js front-end verifies the Nest-issued JWT in Edge middleware. Same dual-Prisma data layer.
- c2c65a7: Add vps-next-mariadb deploy profile: same NextAuth v5 auth stack against MariaDB via Prisma mysql provider (dual-schema strategy with drift guard).
- db007c9: Add vps-next-postgres deploy profile to the template: NextAuth v5 + Prisma + Postgres with env-driven auth toggles (LOGIN_STRATEGY for Google/email-pw, AUTH_ALLOWED_EMAIL_DOMAIN for domain restriction), docker-compose + seed script for VPS deployment. Template-only change; CLI minor bump because the documented profile set changes.
