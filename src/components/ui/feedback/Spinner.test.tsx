import * as React from 'react'
import { screen, cleanup } from '@testing-library/react'
import { afterEach, describe, it, expect } from 'vitest'
import { renderWithChakra as render } from '@/test-utils'
import { Spinner } from './Spinner'

afterEach(() => {
  cleanup()
})

describe('Spinner', () => {
  it('renders with role="status" by default', () => {
    render(<Spinner />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('uses default label "読み込み中…" when label is not provided', () => {
    render(<Spinner />)
    expect(screen.getByRole('status')).toHaveAttribute(
      'aria-label',
      '読み込み中…'
    )
  })

  it('applies custom label when provided', () => {
    render(<Spinner label="送信中" />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', '送信中')
  })

  it('renders visually-hidden text for screen readers', () => {
    render(<Spinner label="保存中" />)
    // The visually hidden span carries the label text
    expect(screen.getByText('保存中')).toBeInTheDocument()
  })

  it('applies sm size data attribute', () => {
    render(<Spinner size="sm" />)
    expect(screen.getByRole('status')).toHaveAttribute('data-size', 'sm')
  })

  it('applies md size data attribute by default', () => {
    render(<Spinner />)
    expect(screen.getByRole('status')).toHaveAttribute('data-size', 'md')
  })

  it('applies lg size data attribute', () => {
    render(<Spinner size="lg" />)
    expect(screen.getByRole('status')).toHaveAttribute('data-size', 'lg')
  })
})
