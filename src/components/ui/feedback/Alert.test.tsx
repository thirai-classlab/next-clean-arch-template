import * as React from 'react'
import { screen, fireEvent, cleanup } from '@testing-library/react'
import { afterEach, describe, it, expect, vi } from 'vitest'
import { renderWithChakra as render } from '@/test-utils'
import { Alert } from './Alert'

afterEach(() => {
  cleanup()
})

describe('Alert', () => {
  it('renders children content with role="alert"', () => {
    render(<Alert variant="info">Hello</Alert>)
    const alert = screen.getByRole('alert')
    expect(alert).toBeInTheDocument()
    expect(alert).toHaveTextContent('Hello')
  })

  it('renders title when provided', () => {
    render(
      <Alert variant="success" title="完了しました">
        詳細はこちら
      </Alert>
    )
    expect(screen.getByText('完了しました')).toBeInTheDocument()
    expect(screen.getByText('詳細はこちら')).toBeInTheDocument()
  })

  it('applies polite aria-live for info variant', () => {
    render(<Alert variant="info">i</Alert>)
    expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'polite')
  })

  it('applies polite aria-live for success variant', () => {
    render(<Alert variant="success">s</Alert>)
    expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'polite')
  })

  it('applies assertive aria-live for warning variant', () => {
    render(<Alert variant="warning">w</Alert>)
    expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive')
  })

  it('applies assertive aria-live for danger variant', () => {
    render(<Alert variant="danger">d</Alert>)
    expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive')
  })

  it('does not render dismiss button when dismissible is false', () => {
    render(<Alert variant="info">Body</Alert>)
    expect(
      screen.queryByRole('button', { name: '閉じる' })
    ).not.toBeInTheDocument()
  })

  it('renders dismiss button when dismissible is true and calls onDismiss', () => {
    const onDismiss = vi.fn()
    render(
      <Alert variant="warning" dismissible onDismiss={onDismiss}>
        Body
      </Alert>
    )
    const closeBtn = screen.getByRole('button', { name: '閉じる' })
    fireEvent.click(closeBtn)
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('applies data-variant attribute for css/test targeting', () => {
    render(<Alert variant="danger">D</Alert>)
    expect(screen.getByRole('alert')).toHaveAttribute('data-variant', 'danger')
  })
})
