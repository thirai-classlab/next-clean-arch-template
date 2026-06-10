import * as React from 'react'
import { screen, cleanup } from '@testing-library/react'
import { afterEach, describe, it, expect } from 'vitest'
// EmptyState now renders Chakra v3 EmptyState.* parts, which read the token
// system from a ChakraProvider in context. renderWithChakra supplies it.
import { renderWithChakra as render } from '@/test-utils'
import { EmptyState } from './EmptyState'

afterEach(() => {
  cleanup()
})

describe('EmptyState', () => {
  it('renders title with role="status"', () => {
    render(<EmptyState title="No data" />)
    const status = screen.getByRole('status')
    expect(status).toBeInTheDocument()
    expect(status).toHaveTextContent('No data')
  })

  it('renders description when provided', () => {
    render(<EmptyState title="No items" description="Add the first one" />)
    expect(screen.getByText('Add the first one')).toBeInTheDocument()
  })

  it('does not render description when omitted', () => {
    render(<EmptyState title="Empty" />)
    // Only the title text should be in the status node
    expect(screen.queryByText('Add the first one')).not.toBeInTheDocument()
  })

  it('renders icon node when provided', () => {
    render(
      <EmptyState
        icon={<span data-testid="ic">ICON</span>}
        title="Nothing here"
      />
    )
    expect(screen.getByTestId('ic')).toBeInTheDocument()
  })

  it('renders action node when provided', () => {
    render(
      <EmptyState
        title="Empty"
        action={<button type="button">Create</button>}
      />
    )
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument()
  })

  it('omits action region when action is not provided', () => {
    render(<EmptyState title="Empty" />)
    // No button rendered by default
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
