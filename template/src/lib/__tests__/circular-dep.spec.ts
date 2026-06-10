// src/lib/__tests__/circular-dep.spec.ts
// Wave 6 / task-1 Step 5: Verify clean-architecture invariants for apps/web/src/lib.
// (draft 06 §3 — Domain pure / Application → Port only / no layer → Interfaces.)
//
// Uses `madge` programmatic API to build the dependency graph for src/lib/, then
// asserts:
//   1. Zero circular dependencies.
//   2. Domain layer imports nothing from application / infrastructure / interfaces.
//   3. Application layer imports nothing from infrastructure (Port pattern only).
//   4. No layer imports from interfaces (top of the dependency funnel).

import { describe, it, expect, beforeAll } from 'vitest'
import path from 'node:path'
import madgeFn from 'madge'

const LIB_ROOT = path.resolve(__dirname, '..')

type Graph = Record<string, string[]>

let graph: Graph
let circular: string[][]

beforeAll(async () => {
  // madge default-exports a callable factory returning a MadgeInstance.
  const instance = await (madgeFn as unknown as (
    src: string,
    opts: Record<string, unknown>,
  ) => Promise<{ obj(): Graph; circular(): string[][] }>)(LIB_ROOT, {
    fileExtensions: ['ts'],
    tsConfig: path.resolve(LIB_ROOT, '../../tsconfig.json'),
    detectiveOptions: {
      ts: { skipTypeImports: false, mixedImports: true },
    },
  })
  graph = instance.obj()
  circular = instance.circular()
}, 60_000)

/** Categorise a relative path like "domain/entities/bot.ts" → "domain". */
function layerOf(relPath: string): 'domain' | 'application' | 'infrastructure' | 'interfaces' | 'other' {
  if (relPath.startsWith('domain/')) return 'domain'
  if (relPath.startsWith('application/')) return 'application'
  if (relPath.startsWith('infrastructure/')) return 'infrastructure'
  if (relPath.startsWith('interfaces/')) return 'interfaces'
  return 'other'
}

/** Ignore test/spec files when enforcing layer invariants. */
function isProductionFile(relPath: string): boolean {
  return !/\.(spec|test)\.tsx?$/.test(relPath)
}

/**
 * Shared-kernel exemption: `application/result.ts` is a discriminated-union
 * Result<T, E> type that both Domain aggregates / VOs and Application UseCases
 * depend on (draft 06 §1.3 L262-271 + §3 L400). It is intentionally housed
 * under `application/` for SSoT reasons but is structurally a shared kernel —
 * physically symmetric to `domain/errors/domain-error.ts` which `result.ts`
 * itself imports. Treat this single file as cross-layer-safe.
 */
const SHARED_KERNEL_EXEMPT = new Set<string>(['application/result.ts'])

describe('Clean architecture invariants — src/lib', () => {
  it('contains zero circular dependencies', () => {
    expect(circular, JSON.stringify(circular, null, 2)).toEqual([])
  })

  it('Domain layer imports nothing from application/infrastructure/interfaces (shared-kernel result.ts exempt)', () => {
    const violations: Array<{ from: string; to: string }> = []
    for (const [from, deps] of Object.entries(graph)) {
      if (layerOf(from) !== 'domain' || !isProductionFile(from)) continue
      for (const to of deps) {
        if (SHARED_KERNEL_EXEMPT.has(to)) continue
        const lt = layerOf(to)
        if (lt === 'application' || lt === 'infrastructure' || lt === 'interfaces') {
          violations.push({ from, to })
        }
      }
    }
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([])
  })

  it('Application layer imports nothing from infrastructure (Port pattern enforced)', () => {
    const violations: Array<{ from: string; to: string }> = []
    for (const [from, deps] of Object.entries(graph)) {
      if (layerOf(from) !== 'application' || !isProductionFile(from)) continue
      for (const to of deps) {
        if (layerOf(to) === 'infrastructure') {
          violations.push({ from, to })
        }
      }
    }
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([])
  })

  it('No layer imports from interfaces (top of dependency funnel)', () => {
    const violations: Array<{ from: string; to: string }> = []
    for (const [from, deps] of Object.entries(graph)) {
      const fl = layerOf(from)
      if (fl === 'interfaces' || fl === 'other' || !isProductionFile(from)) continue
      for (const to of deps) {
        if (layerOf(to) === 'interfaces') {
          violations.push({ from, to })
        }
      }
    }
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([])
  })
})
