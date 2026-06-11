---
---

Restore env-schema refinement 4/5 guards lost in the #30×#31 semantic merge.

PR #31 (CLI pattern selection) relaxed `template/scripts/env-schema.ts` on its branch — it dropped `pro` from `profilesForbiddingMock` (refinement 4, MOCK auth-bypass guard) and added a `MOCK_MODE !== 'true'` exemption to the RATE_LIMIT_ENABLED requirement (refinement 5, brute-force protection) — without updating the env-validate test expectations. The relaxation was made obsolete by #31's own later "Root 3" fix (the CLI writes `DEPLOY_PROFILE=minimal` + `RATE_LIMIT_ENABLED=true` into scaffolded `.env.local`, so the strict guards never block scaffolded projects), but the schema change was never reverted. Merging #31 on top of #30 combined the relaxed schema with main's strict tests, breaking 4 tests in the `template-drift` job.

This restores the pre-#31 strict guards (security-relevant):

- refinement 4: `MOCK_MODE=true` errors for `DEPLOY_PROFILE` in [`unlocked`, `pro`, `vps`] (vps-next-* / vps-nest-* remain allowed for CI build verification).
- refinement 5: `LOGIN_STRATEGY=email-pass|both` requires `RATE_LIMIT_ENABLED=true` unconditionally.

No CLI package code change — the template is fetched from git at scaffold time, and the CLI already writes guard-compatible env values.
