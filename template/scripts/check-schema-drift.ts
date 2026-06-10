/**
 * scripts/check-schema-drift.ts
 *
 * Drift guard CLI — asserts that prisma/schema.prisma (PostgreSQL) and
 * prisma/mariadb/schema.prisma (MySQL/MariaDB) define the same models and
 * fields (after provider-specific annotation stripping).
 *
 * Usage:
 *   pnpm check:schema-drift
 *   tsx scripts/check-schema-drift.ts
 *
 * Exit codes:
 *   0 — no drift detected
 *   1 — drift detected (diff printed to stdout) or schema file not found
 *
 * Run as a CI step separate from `pnpm test` so drift surfaces clearly
 * even when unit tests are skipped.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { normalizeSchemaModels, detectDrift } from './lib/schema-normalizer'

const ROOT = join(import.meta.dirname ?? __dirname, '..')

const POSTGRES_SCHEMA = join(ROOT, 'prisma', 'schema.prisma')
const MARIADB_SCHEMA = join(ROOT, 'prisma', 'mariadb', 'schema.prisma')

function readSchema(path: string, label: string): string {
  try {
    return readFileSync(path, 'utf8')
  } catch {
    console.error(`[check-schema-drift] ERROR: Cannot read ${label} schema at ${path}`)
    console.error('  Ensure prisma/mariadb/schema.prisma exists (vps-next-mariadb profile).')
    process.exit(1)
  }
}

const postgresSource = readSchema(POSTGRES_SCHEMA, 'postgres')
const mariadbSource = readSchema(MARIADB_SCHEMA, 'mariadb')

const postgresMap = normalizeSchemaModels(postgresSource)
const mariadbMap = normalizeSchemaModels(mariadbSource)

const diffs = detectDrift(
  postgresMap,
  mariadbMap,
  'prisma/schema.prisma',
  'prisma/mariadb/schema.prisma',
)

if (diffs.length === 0) {
  console.log('[check-schema-drift] OK — no drift detected between postgres and mariadb schemas.')
  process.exit(0)
} else {
  console.error('[check-schema-drift] DRIFT DETECTED — the following differences were found:\n')
  for (const line of diffs) {
    console.error(`  ${line}`)
  }
  console.error(
    '\nTo fix: update both prisma/schema.prisma and prisma/mariadb/schema.prisma to match.',
  )
  console.error(
    'See the type_mappings section in the vps-next-mariadb design for provider-specific substitutions.',
  )
  process.exit(1)
}
