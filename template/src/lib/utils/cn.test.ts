import { describe, it, expect } from 'vitest'
import { cn } from './cn'

/**
 * Regression guard for the tailwind-merge "arbitrary text-[…]" ambiguity.
 *
 * tailwind-merge cannot tell whether an arbitrary `text-[…]` value is a
 * COLOR or a font-SIZE, so it groups both into one conflict bucket and keeps
 * only the last — silently dropping one class. This produced invisible /
 * wrongly-sized text across the component library (root cause of commit
 * 038f1bb for Tooltip, then swept library-wide).
 *
 * The fix: font sizes use the NAMED scale class (`text-sm`, `text-xs`, …)
 * which tailwind-merge classifies as a size, so it no longer conflicts with
 * an arbitrary text COLOR. These tests pin that invariant.
 */
describe('cn() — tailwind-merge arbitrary text-[…] ambiguity', () => {
  it('DROPS one class when an arbitrary color and arbitrary size collide (the bug)', () => {
    // This documents WHY the named-scale fix is required: with two arbitrary
    // text-[…] utilities, exactly one survives.
    const merged = cn('text-[var(--text-sm)] text-[var(--color-fg-default)]')
    const hasSize = merged.includes('text-[var(--text-sm)]')
    const hasColor = merged.includes('text-[var(--color-fg-default)]')
    expect(hasSize && hasColor).toBe(false)
  })

  it('keeps BOTH a named-scale size and an arbitrary color (the fix)', () => {
    const merged = cn('text-sm text-[var(--color-fg-default)]')
    expect(merged).toContain('text-sm')
    expect(merged).toContain('text-[var(--color-fg-default)]')
  })

  it.each([
    ['text-xs', '--color-fg-muted'],
    ['text-sm', '--color-danger'],
    ['text-md', '--color-fg-default'],
    ['text-lg', '--color-fg-default'],
  ])('keeps %s alongside text-[var(%s)]', (sizeClass, colorVar) => {
    const colorClass = `text-[var(${colorVar})]`
    const merged = cn(sizeClass, colorClass)
    expect(merged).toContain(sizeClass)
    expect(merged).toContain(colorClass)
  })

  it('still resolves genuine same-group conflicts (named size vs named size)', () => {
    // Sanity: the fix does not break legitimate conflict resolution.
    expect(cn('text-sm text-lg')).toBe('text-lg')
  })
})
