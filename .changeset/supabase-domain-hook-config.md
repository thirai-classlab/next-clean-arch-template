---
"@takuma-hirai/create-app": minor
---

Supabase profile: the signup domain hook's primary domain is now configurable via `AUTH_ALLOWED_EMAIL_DOMAIN` (previously hardcoded to `classlab.co.jp` in `006_auth_hook_domain_check.sql`). Migration `010_domain_hook_config.sql` introduces a `public.hook_config` row that the signup trigger resolves at runtime, and `scripts/setup-supabase.sh` (Phase 6b) seeds it from the env var: unset = keep the existing config row (migration default), `example.com` / `@example.com` = upsert as the primary signup domain, empty string = no domain restriction — semantics identical to the NextAuth-side `ALLOWED_ADMIN_EMAIL_DOMAIN` check. All `hook_config` mutations are recorded in `audit_log` via an `AFTER INSERT OR UPDATE` trigger (`action='config.domain_changed'`, old/new values in payload).
