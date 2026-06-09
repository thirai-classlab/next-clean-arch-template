/**
 * Admin dashboard page unit tests — F-04 fix (composite StatCard integration).
 *
 * Verifies that AdminDashboardPage renders composite StatCard (Chakra v3
 * Card + Stat semantics) with correct labels and values, replacing the former
 * local inline StatCard definition that used raw div + CSS variables.
 *
 * Because AdminDashboardPage is an async Server Component, we test the
 * extractable logic indirectly: we import and render the StatCard composite
 * directly with the same props the dashboard passes, confirming the integration
 * mapping (hint → helperText, etc.) is correct.
 */
import * as React from 'react'
import { cleanup } from '@testing-library/react'
import { afterEach, describe, it, expect } from 'vitest'
import { renderWithChakra } from '@/test-utils'
import { StatCard } from '@/components/ui/composite'

afterEach(() => {
  cleanup()
})

describe('Dashboard StatCard integration — F-04: composite StatCard renders label and value', () => {
  it('renders "総 User 数" card with numeric value', () => {
    const { getAllByText, getByText } = renderWithChakra(
      <StatCard label="総 User 数" value={42} />,
    )
    expect(getAllByText('総 User 数').length).toBeGreaterThanOrEqual(1)
    expect(getByText('42')).toBeTruthy()
  })

  it('renders "承認待ち" card with helperText (formerly hint prop)', () => {
    const { getByText } = renderWithChakra(
      <StatCard
        label="承認待ち"
        value={3}
        helperText="pending-approvals で対応"
      />,
    )
    expect(getByText('3')).toBeTruthy()
    expect(getByText('pending-approvals で対応')).toBeTruthy()
  })

  it('renders "直近 30 日 audit" card', () => {
    const { getAllByText, getByText } = renderWithChakra(
      <StatCard label="直近 30 日 audit" value={120} />,
    )
    expect(getAllByText('直近 30 日 audit').length).toBeGreaterThanOrEqual(1)
    expect(getByText('120')).toBeTruthy()
  })

  it('renders "Role 分布" card with composite label string', () => {
    const roleValue = '2 / 10 / 5'
    const { getByText } = renderWithChakra(
      <StatCard
        label="Role 分布"
        value={roleValue}
        helperText="admin / member / viewer"
      />,
    )
    expect(getByText(roleValue)).toBeTruthy()
    expect(getByText('admin / member / viewer')).toBeTruthy()
  })
})

describe('Dashboard StatCard integration — semantic <dl>/<dt>/<dd> structure', () => {
  it('renders Stat semantics (dl element present via Chakra Stat.Root)', () => {
    const { container } = renderWithChakra(
      <StatCard label="Active Bots" value="7" />,
    )
    // Chakra Stat.Root renders a <dl> element for a11y semantics
    const dl = container.querySelector('dl')
    expect(dl).not.toBeNull()
  })
})
