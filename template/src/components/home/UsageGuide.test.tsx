import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithChakra as render } from '@/test-utils'
import { UsageGuide } from './UsageGuide'

describe('UsageGuide', () => {
  it('renders the usage-guide section with testid', () => {
    render(<UsageGuide />)
    expect(screen.getByTestId('usage-guide')).toBeInTheDocument()
  })

  it('renders 5 guide items as headings', () => {
    render(<UsageGuide />)
    const items = screen.getAllByRole('heading', { level: 3 })
    expect(items).toHaveLength(5)
    const texts = items.map((el) => el.textContent ?? '')
    expect(texts.some((t) => /起動コマンド/.test(t))).toBe(true)
    expect(texts.some((t) => /MOCK_MODE/.test(t))).toBe(true)
    expect(texts.some((t) => /Component gallery/.test(t))).toBe(true)
    expect(texts.some((t) => /Admin panel/.test(t))).toBe(true)
    expect(texts.some((t) => /Clean architecture/.test(t))).toBe(true)
  })

  it('Component gallery link points to /admin/dev/components', () => {
    render(<UsageGuide />)
    const link = screen.getByRole('link', { name: /Component gallery/ })
    expect(link).toHaveAttribute('href', '/admin/dev/components')
  })

  it('Admin panel link points to /admin/dashboard', () => {
    render(<UsageGuide />)
    const link = screen.getByRole('link', { name: /Admin panel/ })
    expect(link).toHaveAttribute('href', '/admin/dashboard')
  })

  it('renders in expected order (起動コマンド first)', () => {
    render(<UsageGuide />)
    const items = screen.getAllByRole('heading', { level: 3 })
    expect(items[0]).toHaveTextContent(/起動コマンド/)
    expect(items[1]).toHaveTextContent(/MOCK_MODE/)
    expect(items[2]).toHaveTextContent(/Component gallery/)
    expect(items[3]).toHaveTextContent(/Admin panel/)
    expect(items[4]).toHaveTextContent(/Clean architecture/)
  })
})
