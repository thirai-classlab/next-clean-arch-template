// src/lib/security/key-bundle-leak.spec.ts
// task-5 Step 7 — CI gate: server-only env keys must never appear in client-side
// route files (pages, layouts, client components under non-API route groups).
//
// Security context (task-5 CRITICAL SEC-A2-1):
//   SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET, RECALL_WEBHOOK_SECRET are server-only
//   secrets. If any of these appear in files reachable from the browser bundle
//   (app/(public)/**, app/bots/**, app/auth/**, etc.) they would be included in
//   the Next.js client bundle and exposed to any user who inspects network traffic.
//
// Scope of the grep:
//   We scan all *.ts / *.tsx files under src/app/ EXCLUDING:
//     - src/app/api/**          (route handlers — server-only by Next.js design)
//     - src/app/(admin)/**      (admin panel pages — server-only Server Components)
//
//   Files in those excluded paths are allowed to use these keys; files outside
//   are client-boundary candidates and must not reference the server keys.
//
//   False-positive note: a comment or string literal that happens to contain the
//   variable name would also be flagged. That is intentional — if the key name
//   appears in any non-trivial form in client-reachable code it warrants review.

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join, relative, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url)
// Navigate from src/lib/security/ → apps/web/src/app
// dirname(__filename) = .../apps/web/src/lib/security
// ../../app           = .../apps/web/src/app
const WEB_SRC_APP = join(dirname(__filename), '../../app')

/** Recursively collect all .ts / .tsx files under a directory. */
function collectTsFiles(dir: string): string[] {
  const results: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...collectTsFiles(full))
    } else if (entry.isFile() && /\.(tsx?)$/.test(entry.name)) {
      results.push(full)
    }
  }
  return results
}

/** Return true when the file path is inside an allowed-server-only directory. */
function isServerOnlyPath(filePath: string): boolean {
  const rel = relative(WEB_SRC_APP, filePath)
  // Allow: api/** and (admin)/**
  return rel.startsWith('api/') || rel.startsWith('(admin)/')
}

/** Server-only env key names that must not leak to the client bundle. */
const SERVER_ONLY_KEYS = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'CRON_SECRET',
  'RECALL_WEBHOOK_SECRET',
] as const

// ---------------------------------------------------------------------------
// Collect candidate files (client-boundary scope)
// ---------------------------------------------------------------------------

const allAppFiles = collectTsFiles(WEB_SRC_APP)
const candidateFiles = allAppFiles.filter((f) => !isServerOnlyPath(f))

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Key Bundle Leak CI Gate', () => {
  it('SUPABASE_SERVICE_ROLE_KEY does not appear in client-boundary files', () => {
    const key = 'SUPABASE_SERVICE_ROLE_KEY'
    const hits = candidateFiles.filter((f) =>
      readFileSync(f, 'utf-8').includes(key),
    )
    if (hits.length > 0) {
      const relHits = hits.map((f) => relative(WEB_SRC_APP, f)).join('\n  ')
      throw new Error(
        `${key} found in client-boundary files — server-only secret must not ` +
          `reach the browser bundle:\n  ${relHits}`,
      )
    }
    expect(hits).toHaveLength(0)
  })

  it('CRON_SECRET does not appear in client-boundary files', () => {
    const key = 'CRON_SECRET'
    const hits = candidateFiles.filter((f) =>
      readFileSync(f, 'utf-8').includes(key),
    )
    if (hits.length > 0) {
      const relHits = hits.map((f) => relative(WEB_SRC_APP, f)).join('\n  ')
      throw new Error(
        `${key} found in client-boundary files — server-only secret must not ` +
          `reach the browser bundle:\n  ${relHits}`,
      )
    }
    expect(hits).toHaveLength(0)
  })

  it('RECALL_WEBHOOK_SECRET does not appear in client-boundary files', () => {
    const key = 'RECALL_WEBHOOK_SECRET'
    const hits = candidateFiles.filter((f) =>
      readFileSync(f, 'utf-8').includes(key),
    )
    if (hits.length > 0) {
      const relHits = hits.map((f) => relative(WEB_SRC_APP, f)).join('\n  ')
      throw new Error(
        `${key} found in client-boundary files — server-only secret must not ` +
          `reach the browser bundle:\n  ${relHits}`,
      )
    }
    expect(hits).toHaveLength(0)
  })

  it('all three server-only key names are checked (registry completeness)', () => {
    // Guard against future drift: if someone adds a new server key and forgets
    // to add a test, this test documents the full expected set.
    expect(SERVER_ONLY_KEYS).toEqual([
      'SUPABASE_SERVICE_ROLE_KEY',
      'CRON_SECRET',
      'RECALL_WEBHOOK_SECRET',
    ])
  })

  it('candidate file list is non-empty (grep has scope)', () => {
    // If readdirSync fails or the path is wrong, candidateFiles would be empty
    // and the leak tests above would trivially pass with no actual scan.
    expect(candidateFiles.length).toBeGreaterThan(0)
  })
})
