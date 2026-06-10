/**
 * scripts/__tests__/schema-drift.test.ts
 *
 * Vitest unit test for the schema drift guard.
 * Runs as part of `pnpm test` so drift is caught in local test runs.
 *
 * Tests:
 *   1. Both schema files define the same set of model names.
 *   2. For each shared model, both files define the same set of field names.
 *   3. Field Prisma types match after normalization (provider-specific
 *      annotations stripped).
 *   4. normalizeSchemaModels correctly parses model blocks.
 *   5. detectDrift returns empty array for identical maps.
 *   6. detectDrift reports missing model, missing field, and type mismatch.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'
import { normalizeSchemaModels, detectDrift } from '../lib/schema-normalizer'

const ROOT = join(import.meta.dirname ?? __dirname, '../..')
const POSTGRES_SCHEMA = join(ROOT, 'prisma', 'schema.prisma')
const MARIADB_SCHEMA = join(ROOT, 'prisma', 'mariadb', 'schema.prisma')

// ── Unit tests for normalizeSchemaModels ──────────────────────────

describe('normalizeSchemaModels', () => {
  it('parses model names from a schema string', () => {
    const source = `
model User {
  id    String @id
  email String @unique
}

model Account {
  id     String @id
  userId String
}
`
    const map = normalizeSchemaModels(source)
    expect([...map.keys()].sort()).toEqual(['Account', 'User'])
  })

  it('parses field names and types', () => {
    const source = `
model User {
  id    String @id
  email String @unique
  role  Role   @default(member)
  name  String?
}
`
    const map = normalizeSchemaModels(source)
    const user = map.get('User')!
    expect(user.get('id')).toBe('String')
    expect(user.get('email')).toBe('String')
    expect(user.get('role')).toBe('Role')
    expect(user.get('name')).toBe('String?')
  })

  it('strips @db.Text annotations (preserves type as String?)', () => {
    const source = `
model Account {
  id            String  @id
  refresh_token String? @db.Text
  access_token  String? @db.Text
}
`
    const map = normalizeSchemaModels(source)
    const account = map.get('Account')!
    expect(account.get('refresh_token')).toBe('String?')
    expect(account.get('access_token')).toBe('String?')
  })

  it('skips @@ directives and comments', () => {
    const source = `
model User {
  // This is a comment
  id    String @id
  email String @unique

  @@map("users")
}
`
    const map = normalizeSchemaModels(source)
    const user = map.get('User')!
    expect([...user.keys()]).toEqual(['id', 'email'])
  })

  it('handles Json? fields correctly', () => {
    const source = `
model AuditLog {
  id       String @id
  metadata Json?
}
`
    const map = normalizeSchemaModels(source)
    expect(map.get('AuditLog')!.get('metadata')).toBe('Json?')
  })
})

// ── Unit tests for detectDrift ─────────────────────────────────────

describe('detectDrift', () => {
  it('returns empty array for identical maps', () => {
    const source = `
model User {
  id    String @id
  email String @unique
}
`
    const mapA = normalizeSchemaModels(source)
    const mapB = normalizeSchemaModels(source)
    expect(detectDrift(mapA, mapB)).toEqual([])
  })

  it('detects missing model in B', () => {
    const sourceA = `
model User {
  id String @id
}
model Account {
  id String @id
}
`
    const sourceB = `
model User {
  id String @id
}
`
    const diffs = detectDrift(normalizeSchemaModels(sourceA), normalizeSchemaModels(sourceB))
    expect(diffs.some((d) => d.includes('MISSING_MODEL') && d.includes('Account'))).toBe(true)
  })

  it('detects missing field in B', () => {
    const sourceA = `
model User {
  id    String @id
  email String @unique
  name  String?
}
`
    const sourceB = `
model User {
  id    String @id
  email String @unique
}
`
    const diffs = detectDrift(normalizeSchemaModels(sourceA), normalizeSchemaModels(sourceB))
    expect(diffs.some((d) => d.includes('MISSING_FIELD') && d.includes('name'))).toBe(true)
  })

  it('detects type mismatch', () => {
    const sourceA = `
model User {
  id    String @id
  count Int
}
`
    const sourceB = `
model User {
  id    String @id
  count String
}
`
    const diffs = detectDrift(normalizeSchemaModels(sourceA), normalizeSchemaModels(sourceB))
    expect(diffs.some((d) => d.includes('TYPE_MISMATCH') && d.includes('count'))).toBe(true)
  })
})

// ── Integration test: actual schema files must not drift ──────────

describe('Schema drift guard — actual schema files', () => {
  it('postgres and mariadb schema files define the same model names', () => {
    const postgresSource = readFileSync(POSTGRES_SCHEMA, 'utf8')
    const mariadbSource = readFileSync(MARIADB_SCHEMA, 'utf8')

    const postgresMap = normalizeSchemaModels(postgresSource)
    const mariadbMap = normalizeSchemaModels(mariadbSource)

    const postgresModels = [...postgresMap.keys()].sort()
    const mariadbModels = [...mariadbMap.keys()].sort()

    expect(mariadbModels).toEqual(postgresModels)
  })

  it('both schema files define the same field names for each model', () => {
    const postgresSource = readFileSync(POSTGRES_SCHEMA, 'utf8')
    const mariadbSource = readFileSync(MARIADB_SCHEMA, 'utf8')

    const postgresMap = normalizeSchemaModels(postgresSource)
    const mariadbMap = normalizeSchemaModels(mariadbSource)

    for (const [modelName, postgresFields] of postgresMap) {
      const mariadbFields = mariadbMap.get(modelName)
      expect(mariadbFields, `model ${modelName} missing in mariadb schema`).toBeDefined()
      if (!mariadbFields) continue

      const pgFieldNames = [...postgresFields.keys()].sort()
      const mbFieldNames = [...mariadbFields.keys()].sort()
      expect(mbFieldNames, `${modelName}: field names differ`).toEqual(pgFieldNames)
    }
  })

  it('detectDrift reports no drift between postgres and mariadb schemas', () => {
    const postgresSource = readFileSync(POSTGRES_SCHEMA, 'utf8')
    const mariadbSource = readFileSync(MARIADB_SCHEMA, 'utf8')

    const postgresMap = normalizeSchemaModels(postgresSource)
    const mariadbMap = normalizeSchemaModels(mariadbSource)

    const diffs = detectDrift(
      postgresMap,
      mariadbMap,
      'prisma/schema.prisma',
      'prisma/mariadb/schema.prisma',
    )

    expect(diffs, diffs.join('\n')).toEqual([])
  })
})
