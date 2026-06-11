---
"@takuma-hirai/create-app": minor
---

Install-time deployment pattern selection. The CLI now asks (or accepts flags for) the full pattern matrix at scaffold time and writes the resolved configuration into the generated project:

- New flags / prompts: `--target <vercel|vps>`, `--backend <next-only|next-nest>`, `--db <postgres|mariadb>`, `--auth <google|email-pw...>`, `--auth-domain <domain>`. `(target, backend, db)` resolves to one of the 5 `DEPLOY_PROFILE` values (`pro` / `vps-next-postgres` / `vps-next-mariadb` / `vps-nest-postgres` / `vps-nest-mariadb`); `--auth` resolves to `LOGIN_STRATEGY` (`sso` / `email-pass` / `both`) and `--auth-domain` to `AUTH_ALLOWED_EMAIL_DOMAIN`.
- Per-provider Prisma client selection: the template ships `prisma-client.postgres.ts` / `prisma-client.mariadb.ts` variants and post-clone copies the matching one over `prisma-client.ts`, so webpack statically traces a single import path (no MODULE_NOT_FOUND on pruned files). Pattern-irrelevant files (e.g. `api/` on next-only, NextAuth/Prisma on vercel) are pruned after clone.
- Non-TTY contract: headless / CI invocations fail fast with the named missing flags (`name` always required; `--backend` and `--db` required when `--target vps`) instead of hanging on prompts.
- "When to choose" guidance (next-only vs next+nest, Vercel vs VPS) documented in the README Deployment Patterns section.
- `CREATE_APP_TEMPLATE_SOURCE` env override for the template fetch source (`github:owner/repo/subdir#ref`) — fork / branch / E2E verification without touching the default source; when set, the default-repo git-clone fallback is disabled to avoid silently fetching a different source.
- Legacy `--profile` flag is kept for backward compatibility and internally mapped to `--target` / `--backend` / `--db`.
