/**
 * ColorModeToggle unit tests — Phase 6 Batch 2 (Chakra v3 IconButton + next-themes).
 *
 * Behaviour-level coverage: renders an accessible button (aria-label set),
 * click cycles the theme via the mocked next-themes setter, mount hydration
 * gate does not throw. The actual `<html class="dark">` mutation is owned by
 * next-themes and validated end-to-end by the Playwright suite at the
 * composite gallery.
 */
import * as React from 'react'
import { cleanup, fireEvent } from '@testing-library/react'
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { renderWithChakra } from '@/test-utils'
import { ColorModeToggle } from './ColorModeToggle'

// ── next-themes mock ────────────────────────────────────────────────────────
const setThemeMock = vi.fn()
let currentTheme: 'light' | 'dark' | 'system' = 'light'

vi.mock('next-themes', () => ({
  useTheme: () => ({
    theme: currentTheme,
    setTheme: (next: string) => {
      setThemeMock(next)
      currentTheme = next as typeof currentTheme
    },
    resolvedTheme: currentTheme,
  }),
}))

beforeEach(() => {
  setThemeMock.mockClear()
  currentTheme = 'light'
})

afterEach(() => {
  cleanup()
})

describe('ColorModeToggle — Test 1: renders accessible button', () => {
  it('renders a button with an aria-label', () => {
    const { getByRole } = renderWithChakra(<ColorModeToggle />)
    const button = getByRole('button')
    expect(button.getAttribute('aria-label')).toBeTruthy()
  })
})

describe('ColorModeToggle — Test 2: click cycles theme', () => {
  it('cycles light → dark on first click', () => {
    currentTheme = 'light'
    const { getByRole } = renderWithChakra(<ColorModeToggle />)
    fireEvent.click(getByRole('button'))
    expect(setThemeMock).toHaveBeenCalledWith('dark')
  })

  it('cycles dark → system on click when starting from dark', () => {
    currentTheme = 'dark'
    const { getByRole } = renderWithChakra(<ColorModeToggle />)
    fireEvent.click(getByRole('button'))
    expect(setThemeMock).toHaveBeenCalledWith('system')
  })

  it('cycles system → light on click when starting from system', () => {
    currentTheme = 'system'
    const { getByRole } = renderWithChakra(<ColorModeToggle />)
    fireEvent.click(getByRole('button'))
    expect(setThemeMock).toHaveBeenCalledWith('light')
  })
})

describe('ColorModeToggle — Test 3: data-color-mode reflects active theme', () => {
  it('sets data-color-mode="light" when theme=light', () => {
    currentTheme = 'light'
    const { getByRole } = renderWithChakra(<ColorModeToggle />)
    // After mount, the effect runs synchronously in jsdom, so the resolved
    // theme is reflected in the data attribute.
    expect(getByRole('button').getAttribute('data-color-mode')).toBe('light')
  })

  // MEDIUM: dark mode attribute coverage
  it('sets data-color-mode="dark" when theme=dark', () => {
    currentTheme = 'dark'
    const { getByRole } = renderWithChakra(<ColorModeToggle />)
    expect(getByRole('button').getAttribute('data-color-mode')).toBe('dark')
  })

  // MEDIUM: system mode attribute coverage
  it('sets data-color-mode="system" when theme=system', () => {
    currentTheme = 'system'
    const { getByRole } = renderWithChakra(<ColorModeToggle />)
    expect(getByRole('button').getAttribute('data-color-mode')).toBe('system')
  })

  // MEDIUM: unmounted gate — before useEffect fires, currentMode falls back to
  // 'system'. In jsdom with @testing-library/react, act() flushes effects
  // synchronously so the post-mount state is what we observe. We verify the
  // button is always present with a valid data-color-mode attribute.
  it('unmounted gate: renders without throw and data-color-mode is defined', () => {
    currentTheme = 'light'
    expect(() => {
      const { getByRole } = renderWithChakra(<ColorModeToggle />)
      const btn = getByRole('button')
      expect(btn).toHaveAttribute('data-color-mode')
      const mode = btn.getAttribute('data-color-mode')
      expect(['light', 'dark', 'system']).toContain(mode)
    }).not.toThrow()
  })
})

describe('ColorModeToggle — Test 4: smoke render does not throw', () => {
  it('renders with no props', () => {
    expect(() => renderWithChakra(<ColorModeToggle />)).not.toThrow()
  })
})
