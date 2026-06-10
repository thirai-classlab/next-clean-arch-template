/**
 * StatCard unit tests — Phase 6 Batch 2 (Chakra v3 Card + Stat).
 *
 * Behaviour-level coverage: renders label/value, delta with trend variants,
 * icon slot, and helper text. Visual contrast and dark-mode token resolution
 * are covered by the agent-browser visual pass at the composite gallery.
 */
import * as React from 'react'
import { cleanup } from '@testing-library/react'
import { afterEach, describe, it, expect } from 'vitest'
import { renderWithChakra } from '@/test-utils'
import { StatCard } from './StatCard'

afterEach(() => {
  cleanup()
})

describe('StatCard — Test 1: label + value', () => {
  it('renders label and value', () => {
    const { getAllByText, getByText } = renderWithChakra(
      <StatCard label="Active Bots" value="42" />,
    )
    // label appears twice: visible header + sr-only Stat.Label
    expect(getAllByText('Active Bots').length).toBeGreaterThanOrEqual(1)
    expect(getByText('42')).toBeTruthy()
  })

  it('renders value as React node', () => {
    const { getByText } = renderWithChakra(
      <StatCard label="Revenue" value={<span data-testid="money">$1,234</span>} />,
    )
    expect(getByText('$1,234')).toBeTruthy()
  })
})

describe('StatCard — Test 2: delta variants', () => {
  it('renders up delta', () => {
    const { getByText } = renderWithChakra(
      <StatCard
        label="MRR"
        value="$50k"
        delta={{ value: '+12%', trend: 'up', label: 'vs last month' }}
      />,
    )
    expect(getByText('+12%')).toBeTruthy()
    expect(getByText('vs last month')).toBeTruthy()
  })

  it('renders down delta', () => {
    const { getByText } = renderWithChakra(
      <StatCard
        label="Churn"
        value="3%"
        delta={{ value: '-1%', trend: 'down' }}
      />,
    )
    expect(getByText('-1%')).toBeTruthy()
  })

  it('renders flat delta', () => {
    const { getByText } = renderWithChakra(
      <StatCard label="Sessions" value="100" delta={{ value: '0', trend: 'flat' }} />,
    )
    expect(getByText('0')).toBeTruthy()
  })
})

describe('StatCard — Test 3: icon slot', () => {
  it('renders icon node when provided', () => {
    const { getByTestId } = renderWithChakra(
      <StatCard
        label="Users"
        value="1,000"
        icon={<span data-testid="user-icon">U</span>}
      />,
    )
    expect(getByTestId('user-icon')).toBeTruthy()
  })
})

describe('StatCard — Test 4: helper text', () => {
  it('renders helper text when provided', () => {
    const { getByText } = renderWithChakra(
      <StatCard label="Uptime" value="99.9%" helperText="Last 30 days" />,
    )
    expect(getByText('Last 30 days')).toBeTruthy()
  })

  it('does not render helper text when not provided', () => {
    const { queryByText } = renderWithChakra(
      <StatCard label="Uptime" value="99.9%" />,
    )
    expect(queryByText('Last 30 days')).toBeNull()
  })
})

describe('StatCard — Test 5: smoke render does not throw', () => {
  it('renders with the minimal props set', () => {
    expect(() =>
      renderWithChakra(<StatCard label="x" value="y" />),
    ).not.toThrow()
  })
})

describe('StatCard — Test 6: mobile word-break props (N-01 regression)', () => {
  /** Collect all CSS text from Emotion-injected stylesheets in JSDOM. */
  function collectStyleSheetText(): string {
    return Array.from(document.styleSheets)
      .flatMap((sheet) => {
        try {
          return Array.from(sheet.cssRules).map((r) => r.cssText)
        } catch {
          return []
        }
      })
      .join('\n')
  }

  it('applies word-break control props to label text element', () => {
    const { getAllByText } = renderWithChakra(
      <StatCard label="pending-approvals で対応" value="42" />,
    )
    // Label renders at least once (visible header)
    expect(getAllByText('pending-approvals で対応').length).toBeGreaterThanOrEqual(1)
    // N-01 regression: Emotion must inject word-break: break-word rule
    // (StatCard.tsx L99: wordBreak="break-word")
    const cssText = collectStyleSheetText()
    expect(/word-break\s*:\s*break-word/.test(cssText)).toBe(true)
  })

  it('applies overflow-wrap anywhere to label text element (N-01 regression)', () => {
    renderWithChakra(
      <StatCard label="overflow-wrap-check" value="0" />,
    )
    // N-01 regression: Emotion must inject overflow-wrap: anywhere rule
    // (StatCard.tsx L100: overflowWrap="anywhere")
    const cssText = collectStyleSheetText()
    expect(/overflow-wrap\s*:\s*anywhere/.test(cssText)).toBe(true)
  })

  it('applies word-break control props to value text element', () => {
    const { getByText } = renderWithChakra(
      <StatCard label="Role" value="admin / member / viewer" />,
    )
    expect(getByText('admin / member / viewer')).toBeTruthy()
    // N-01 regression: word-break rule present (StatCard.tsx L124)
    const cssText = collectStyleSheetText()
    expect(/word-break\s*:\s*break-word/.test(cssText)).toBe(true)
  })

  it('applies word-break control props to helperText element', () => {
    const { getByText } = renderWithChakra(
      <StatCard
        label="Approvals"
        value="3"
        helperText="pending-approvals で対応"
      />,
    )
    expect(getByText('pending-approvals で対応')).toBeTruthy()
    // N-01 regression: word-break rule present (StatCard.tsx L159)
    const cssText = collectStyleSheetText()
    expect(/word-break\s*:\s*break-word/.test(cssText)).toBe(true)
  })
})
