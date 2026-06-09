// vercel.ts — typed Vercel project configuration (recall_poc, repo root).
// task-5 Step 6 (draft 08 §Phase 6) — declares the daily audit-log cleanup cron.
//
// Repo convention (CLAUDE.md / draft 08): use the typed `vercel.ts` config
// (`@vercel/config/v1`) over `vercel.json`. This is the first config file; keep it
// minimal (only the cron we actually need — Simplicity First / YAGNI).
//
// Cron: `0 18 * * *` is 18:00 UTC = 03:00 JST (Vercel Cron schedules are UTC).
// Vercel invokes the path daily with `Authorization: Bearer ${CRON_SECRET}`, which
// /api/cron/audit-cleanup verifies before running cleanup_old_audit_logs() (008).

import type { VercelConfig } from '@vercel/config/v1'

export const config: VercelConfig = {
  framework: 'nextjs',
  crons: [{ path: '/api/cron/audit-cleanup', schedule: '0 18 * * *' }],
}

export default config
