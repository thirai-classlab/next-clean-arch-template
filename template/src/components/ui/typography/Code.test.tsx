/**
 * Code tests — Phase 5 (behavior + a11y)
 *
 * Structural + interaction contract is preserved (inline <code>, block
 * <pre><code>, copy-button aria-label state machine, data-language). The old
 * inline `style.fontFamily = var(--font-mono)` assertion is dropped because
 * Chakra v3 applies fontFamily via an emotion class, not an inline style;
 * font-mono is exercised by visual verification instead.
 */
import { screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest'
import { axe } from 'vitest-axe'
import { renderWithChakra } from '@/test-utils'
import { Code } from './Code'

// Mock navigator.clipboard
beforeAll(() => {
  Object.assign(navigator, {
    clipboard: {
      writeText: vi.fn().mockResolvedValue(undefined),
    },
  })
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('Code', () => {
  describe('inline mode', () => {
    it('inline=true renders <code> directly (no <pre> wrapper)', () => {
      const { container } = renderWithChakra(<Code inline>const x = 1</Code>)
      expect(container.querySelector('code')).not.toBeNull()
      expect(container.querySelector('pre')).toBeNull()
    })

    it('inline=true renders children text in <code>', () => {
      const { container } = renderWithChakra(<Code inline>const x = 1</Code>)
      expect(container.querySelector('code')?.textContent).toBe('const x = 1')
    })

    it('inline=true does NOT show copy button regardless of copyable prop', () => {
      const { container } = renderWithChakra(
        <Code inline copyable>const x = 1</Code>
      )
      const btn = container.querySelector('button')
      expect(btn).toBeNull()
    })
  })

  describe('block mode (default)', () => {
    it('inline=false renders <pre><code> structure', () => {
      const { container } = renderWithChakra(<Code>const x = 1</Code>)
      const pre = container.querySelector('pre')
      expect(pre).not.toBeNull()
      expect(pre?.querySelector('code')).not.toBeNull()
    })

    it('default (inline omitted) renders block mode', () => {
      const { container } = renderWithChakra(<Code>hello</Code>)
      expect(container.querySelector('pre')).not.toBeNull()
    })
  })

  describe('copyable prop', () => {
    it('copyable=true shows copy button with accessible name', () => {
      renderWithChakra(<Code copyable>const x = 1</Code>)
      const btn = screen.getByRole('button', { name: 'クリップボードにコピー' })
      expect(btn).not.toBeNull()
    })

    it('copyable=false hides copy button', () => {
      const { container } = renderWithChakra(<Code copyable={false}>const x = 1</Code>)
      expect(container.querySelector('button')).toBeNull()
    })

    it('click copy button calls navigator.clipboard.writeText with children', async () => {
      renderWithChakra(<Code copyable>console.log("hi")</Code>)
      const btn = screen.getByRole('button', { name: 'クリップボードにコピー' })
      fireEvent.click(btn)
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('console.log("hi")')
      })
    })

    it('aria-label changes to "コピー完了" after click', async () => {
      renderWithChakra(<Code copyable>text</Code>)
      const btn = screen.getByRole('button', { name: 'クリップボードにコピー' })
      fireEvent.click(btn)
      await waitFor(() => {
        expect(btn.getAttribute('aria-label')).toBe('コピー完了')
      })
    })

    it('aria-label resets back to "クリップボードにコピー" after 2 seconds', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      renderWithChakra(<Code copyable>text</Code>)
      const btn = screen.getByRole('button', { name: 'クリップボードにコピー' })

      await act(async () => {
        fireEvent.click(btn)
      })

      // State should be "コピー完了" immediately after click
      await waitFor(() => {
        expect(btn.getAttribute('aria-label')).toBe('コピー完了')
      }, { timeout: 3000 })

      // Advance timers past the 2s reset
      await act(async () => {
        vi.advanceTimersByTime(2001)
      })

      expect(btn.getAttribute('aria-label')).toBe('クリップボードにコピー')
      vi.useRealTimers()
    })
  })

  it('passes language as data-language attribute', () => {
    const { container } = renderWithChakra(<Code language="typescript">const x = 1</Code>)
    const code = container.querySelector('code')
    expect(code?.getAttribute('data-language')).toBe('typescript')
  })

  // Font-mono coverage (regression guard for the dropped inline-fontFamily
  // assertion). Chakra v3 applies `fontFamily="mono"` via an emotion class, so
  // we resolve the computed style instead of an inline `style` prop. The mono
  // token resolves to the JetBrains Mono stack (theme/system.ts fonts.mono).
  describe('monospace font (fontFamily="mono")', () => {
    it('applies the mono font stack to the inline <code>', () => {
      const { container } = renderWithChakra(<Code inline>const x = 1</Code>)
      const code = container.querySelector('code')
      expect(code).not.toBeNull()
      expect(window.getComputedStyle(code!).fontFamily).toMatch(/mono/i)
    })

    it('applies the mono font stack to the block <code>', () => {
      const { container } = renderWithChakra(<Code>const x = 1</Code>)
      const code = container.querySelector('pre code')
      expect(code).not.toBeNull()
      expect(window.getComputedStyle(code!).fontFamily).toMatch(/mono/i)
    })
  })

  // axe tests run sequentially to avoid "Axe is already running" conflict
  it('has no axe accessibility violations (inline)', async () => {
    const { container } = renderWithChakra(<Code inline>const x = 1</Code>)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('has no axe accessibility violations (block with copy button)', async () => {
    const { container } = renderWithChakra(<Code copyable>const x = 1</Code>)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
