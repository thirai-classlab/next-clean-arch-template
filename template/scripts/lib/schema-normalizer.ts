/**
 * scripts/lib/schema-normalizer.ts
 *
 * Shared normalizer for Prisma schema drift detection.
 * Used by both the vitest unit test and the check-schema-drift.ts CLI script.
 *
 * Parses model blocks from a Prisma schema source string and returns a Map of:
 *   modelName → Map<fieldName, normalizedType>
 *
 * "normalized" means:
 *   - Provider-specific annotations stripped (@db.Text, @db.Json, @db.LongText)
 *   - @default(uuid()) absence is NOT a type difference — uuid generation is
 *     in application code for the mariadb schema (by design)
 *   - Trailing ? (optional marker) is preserved in the type string
 *   - @id, @unique, @default(...), @updatedAt, @map(...), @relation(...) stripped
 *   - Native types (@db.*) stripped
 *   - Only the first token (the Prisma scalar / model type) is retained
 */

/** A map of fieldName → normalized Prisma type (e.g. "String", "Int?", "Json?") */
export type FieldMap = Map<string, string>

/** A map of modelName → FieldMap */
export type SchemaModelMap = Map<string, FieldMap>

/**
 * Parse model blocks from a Prisma schema source string.
 *
 * @param source - Full text of a .prisma schema file
 * @returns Map of modelName → Map<fieldName, normalizedType>
 */
export function normalizeSchemaModels(source: string): SchemaModelMap {
  const result: SchemaModelMap = new Map()

  // Match model blocks: model <Name> { ... }
  // The [\s\S]*? (non-greedy) avoids merging adjacent model blocks.
  const modelRegex = /^model\s+(\w+)\s*\{([\s\S]*?)\n\}/gm
  let match: RegExpExecArray | null

  while ((match = modelRegex.exec(source)) !== null) {
    const modelName = match[1]
    const body = match[2]
    const fieldMap: FieldMap = new Map()

    for (const rawLine of body.split('\n')) {
      const line = rawLine.trim()

      // Skip blank lines, comments, and directives (@@map, @@unique, @@index, etc.)
      if (!line || line.startsWith('//') || line.startsWith('@@')) continue

      // Field line format:
      //   fieldName  FieldType  modifiers...
      // e.g.:
      //   id           String     @id @default(uuid())
      //   refresh_token String?  @db.Text
      //   metadata      Json?
      const parts = line.split(/\s+/)
      if (parts.length < 2) continue

      const fieldName = parts[0]
      const rawType = parts[1]

      // Skip if fieldName looks like a directive that slipped through
      if (fieldName.startsWith('@')) continue

      // Normalize the type:
      //   1. Strip trailing ? then re-add — preserve optionality
      const isOptional = rawType.endsWith('?')
      const baseType = isOptional ? rawType.slice(0, -1) : rawType

      // 2. The base type is the Prisma scalar or model name (no annotation processing needed)
      const normalizedType = isOptional ? `${baseType}?` : baseType

      fieldMap.set(fieldName, normalizedType)
    }

    result.set(modelName, fieldMap)
  }

  return result
}

/**
 * Compare two SchemaModelMaps and return a list of drift lines.
 * Returns an empty array if no drift is detected.
 *
 * @param mapA - Normalized model map from schema A (e.g. postgres)
 * @param mapB - Normalized model map from schema B (e.g. mariadb)
 * @param labelA - Human-readable label for schema A (used in diff output)
 * @param labelB - Human-readable label for schema B
 */
export function detectDrift(
  mapA: SchemaModelMap,
  mapB: SchemaModelMap,
  labelA = 'schema-a',
  labelB = 'schema-b',
): string[] {
  const diffs: string[] = []

  // Models in A but not B
  for (const [modelName] of mapA) {
    if (!mapB.has(modelName)) {
      diffs.push(`MISSING_MODEL  ${labelB} is missing model: ${modelName}`)
    }
  }

  // Models in B but not A
  for (const [modelName] of mapB) {
    if (!mapA.has(modelName)) {
      diffs.push(`EXTRA_MODEL    ${labelB} has unexpected model: ${modelName}`)
    }
  }

  // Field-level comparison for shared models
  for (const [modelName, fieldsA] of mapA) {
    const fieldsB = mapB.get(modelName)
    if (!fieldsB) continue // already reported above

    for (const [fieldName, typeA] of fieldsA) {
      if (!fieldsB.has(fieldName)) {
        diffs.push(`MISSING_FIELD  ${modelName}.${fieldName}  present in ${labelA}, missing in ${labelB}`)
        continue
      }
      const typeB = fieldsB.get(fieldName)!
      if (typeA !== typeB) {
        diffs.push(
          `TYPE_MISMATCH  ${modelName}.${fieldName}  ${labelA}=${typeA}  ${labelB}=${typeB}`,
        )
      }
    }

    for (const [fieldName] of fieldsB) {
      if (!fieldsA.has(fieldName)) {
        diffs.push(`EXTRA_FIELD    ${modelName}.${fieldName}  present in ${labelB}, missing in ${labelA}`)
      }
    }
  }

  return diffs
}
