// src/app/api/cron/audit-cleanup/service-role-client.ts
// task-5 Step 6 — service-role Supabase client for the audit-cleanup cron route.
//
// cleanup_old_audit_logs() (008 migration) is destructive (DELETE) and is granted
// EXECUTE to `service_role` only (C-03). The anon/SSR clients (lib/supabase/server.ts)
// run as the `authenticated` role and cannot call it, so this route needs a client
// constructed with the service-role key.
//
// Kept route-local (not a shared factory) because this cron route is the only caller
// that needs RLS-bypassing privileges (Simplicity First / YAGNI). The service-role key
// must never reach the browser — this module is server-only (route handler).

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Build a Supabase client authenticated with the service-role key.
 * Throws if the required env vars are missing so the cron route fails loudly
 * rather than silently calling the DB as an under-privileged role.
 */
export function createServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured')
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured')
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
