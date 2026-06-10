// Catalog SSoT contract tests — verifies the entry shape and aggregates.
//
// NOTE: Fixed entry counts (51) were replaced with >= assertions when
// "official-only" entries were added to cover Chakra UI v3 full component
// surface (43 additional entries, total ≥ 94).

import { describe, expect, it } from 'vitest'
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  CATALOG_SUMMARY,
  COMPONENT_CATALOG,
  summarizeCatalog,
  type ComponentCategory,
  type ComponentProvider,
} from './component-catalog'

describe('COMPONENT_CATALOG SSoT', () => {
  it('contains at least 99 entries (56 original/admin + 43 official-only)', () => {
    expect(COMPONENT_CATALOG.length).toBeGreaterThanOrEqual(99)
  })

  it('every entry has unique id', () => {
    const ids = COMPONENT_CATALOG.map((entry) => entry.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })

  it('every entry has the required fields', () => {
    const validProviders: ComponentProvider[] = ['chakra', 'chakra-partial', 'custom']
    for (const entry of COMPONENT_CATALOG) {
      expect(entry.id).toMatch(/^[a-z][a-z0-9-]*$/)
      expect(entry.name.length).toBeGreaterThan(0)
      expect(entry.description.length).toBeGreaterThan(0)
      expect(entry.snippet.length).toBeGreaterThan(0)
      expect(['typography', 'primitive', 'composite', 'feedback', 'layout', 'domain', 'nav-shell']).toContain(
        entry.category,
      )
      expect(['implemented', 'placeholder', 'official-only']).toContain(entry.status)
      expect(['A', 'B', 'C', 'future', 'chakra-v3']).toContain(entry.phase)
      expect(validProviders).toContain(entry.provider)
    }
  })

  it('chakra / chakra-partial entries have a referenceUrl pointing to chakra-ui.com', () => {
    for (const entry of COMPONENT_CATALOG) {
      if (entry.provider === 'chakra' || entry.provider === 'chakra-partial') {
        expect(entry.referenceUrl).toBeDefined()
        expect(entry.referenceUrl).toMatch(/^https:\/\/chakra-ui\.com\/docs\/components\//)
      }
    }
  })

  it('custom entries do not have a referenceUrl', () => {
    for (const entry of COMPONENT_CATALOG) {
      if (entry.provider === 'custom') {
        expect(entry.referenceUrl).toBeUndefined()
      }
    }
  })

  it('groups into the expected minimum category counts (original 51 entries)', () => {
    const counts: Record<ComponentCategory, number> = {
      typography: 0,
      primitive: 0,
      composite: 0,
      feedback: 0,
      layout: 0,
      domain: 0,
      'nav-shell': 0,
    }
    for (const entry of COMPONENT_CATALOG) {
      counts[entry.category] += 1
    }
    // Minimums — official-only adds to each category; domain gained 5 task-5
    // admin islands, nav-shell now has 3 implemented + 15 placeholder = 18.
    expect(counts.typography).toBeGreaterThanOrEqual(4)
    expect(counts.primitive).toBeGreaterThanOrEqual(8)
    expect(counts.composite).toBeGreaterThanOrEqual(7)
    expect(counts.feedback).toBeGreaterThanOrEqual(6)
    expect(counts.layout).toBeGreaterThanOrEqual(5)
    expect(counts.domain).toBeGreaterThanOrEqual(8)
    expect(counts['nav-shell']).toBeGreaterThanOrEqual(18)
  })

  it('CATEGORY_ORDER covers all 7 categories', () => {
    expect(CATEGORY_ORDER).toHaveLength(7)
    expect(new Set(CATEGORY_ORDER).size).toBe(7)
  })

  it('CATEGORY_LABELS has one entry per category', () => {
    for (const category of CATEGORY_ORDER) {
      expect(CATEGORY_LABELS[category]).toMatch(/.+/)
    }
  })

  it('official-only entries all have phase "chakra-v3" and provider "chakra"', () => {
    for (const entry of COMPONENT_CATALOG) {
      if (entry.status === 'official-only') {
        expect(entry.phase).toBe('chakra-v3')
        expect(entry.provider).toBe('chakra')
        expect(entry.referenceUrl).toBeDefined()
      }
    }
  })

  it('has at least 43 official-only entries covering Chakra v3 snippet catalog', () => {
    const officialOnly = COMPONENT_CATALOG.filter((e) => e.status === 'official-only')
    expect(officialOnly.length).toBeGreaterThanOrEqual(43)
  })
})

describe('summarizeCatalog', () => {
  it('matches the pre-computed CATALOG_SUMMARY', () => {
    expect(summarizeCatalog()).toEqual(CATALOG_SUMMARY)
  })

  it('reports 41 implemented, 15 placeholder, and ≥ 43 official-only', () => {
    // +5 task-5 admin islands and +3 task-32 shell components became implemented;
    // 3 nav-shell entries moved placeholder → implemented (18 → 15 placeholder).
    expect(CATALOG_SUMMARY.implemented).toBe(41)
    expect(CATALOG_SUMMARY.placeholder).toBe(15)
    expect(CATALOG_SUMMARY.officialOnly).toBeGreaterThanOrEqual(43)
    expect(CATALOG_SUMMARY.total).toBeGreaterThanOrEqual(99)
  })

  it('aggregates phase counts correctly (admin + shell additions reflected)', () => {
    // Phase A = typography (4) + primitive (8) = 12
    // Phase B = composite (7) = 7
    // Phase C = feedback (6) + layout (5) + domain (3+5 admin) + nav-shell (3 shell) = 22
    // future = nav-shell placeholder (15) = 15
    // chakra-v3 = official-only (≥ 43)
    expect(CATALOG_SUMMARY.byPhase.A).toBe(12)
    expect(CATALOG_SUMMARY.byPhase.B).toBe(7)
    expect(CATALOG_SUMMARY.byPhase.C).toBe(22)
    expect(CATALOG_SUMMARY.byPhase.future).toBe(15)
    expect(CATALOG_SUMMARY.byPhase['chakra-v3']).toBeGreaterThanOrEqual(43)
  })

  it('every placeholder entry has phase "future"', () => {
    for (const entry of COMPONENT_CATALOG) {
      if (entry.status === 'placeholder') {
        expect(entry.phase).toBe('future')
      }
    }
  })

  it('every implemented entry has phase A | B | C', () => {
    for (const entry of COMPONENT_CATALOG) {
      if (entry.status === 'implemented') {
        expect(['A', 'B', 'C']).toContain(entry.phase)
      }
    }
  })
})
