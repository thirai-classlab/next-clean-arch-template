/**
 * IconButton tests — Phase 2 (behavior + a11y, no className assertions)
 */
import { screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { renderWithChakra } from '@/test-utils'
import { IconButton } from './IconButton'
import { Settings, X } from 'lucide-react'

describe('IconButton', () => {
  describe('aria-label (required)', () => {
    it('exposes accessible name via aria-label', () => {
      renderWithChakra(<IconButton icon={Settings} aria-label="Settings" />)
      expect(screen.getByRole('button', { name: 'Settings' })).toBeTruthy()
    })
  })

  describe('variant rendering', () => {
    it('renders solid variant without error', () => {
      renderWithChakra(<IconButton icon={Settings} aria-label="Settings" variant="solid" />)
      expect(screen.getByRole('button', { name: 'Settings' })).toBeTruthy()
    })

    it('renders outline variant without error', () => {
      renderWithChakra(<IconButton icon={Settings} aria-label="Settings" variant="outline" />)
      expect(screen.getByRole('button', { name: 'Settings' })).toBeTruthy()
    })

    it('renders ghost variant by default', () => {
      renderWithChakra(<IconButton icon={Settings} aria-label="Settings" />)
      expect(screen.getByRole('button', { name: 'Settings' })).toBeTruthy()
    })
  })

  describe('size rendering', () => {
    it('renders sm size without error', () => {
      renderWithChakra(<IconButton icon={Settings} aria-label="Settings" size="sm" />)
      expect(screen.getByRole('button', { name: 'Settings' })).toBeTruthy()
    })

    it('renders md size by default without error', () => {
      renderWithChakra(<IconButton icon={Settings} aria-label="Settings" />)
      expect(screen.getByRole('button', { name: 'Settings' })).toBeTruthy()
    })

    it('renders lg size without error', () => {
      renderWithChakra(<IconButton icon={Settings} aria-label="Settings" size="lg" />)
      expect(screen.getByRole('button', { name: 'Settings' })).toBeTruthy()
    })
  })

  describe('loading state', () => {
    it('is disabled when loading=true', () => {
      renderWithChakra(<IconButton icon={Settings} aria-label="Settings" loading />)
      expect(screen.getByRole('button', { name: 'Settings' })).toHaveProperty('disabled', true)
    })

    it('renders a spinner svg when loading=true', () => {
      const { container } = renderWithChakra(
        <IconButton icon={Settings} aria-label="Settings" loading />
      )
      expect(container.querySelector('svg')).not.toBeNull()
    })
  })

  describe('click handler', () => {
    it('calls onClick when clicked', () => {
      const handleClick = vi.fn()
      renderWithChakra(<IconButton icon={X} aria-label="Close" onClick={handleClick} />)
      fireEvent.click(screen.getByRole('button', { name: 'Close' }))
      expect(handleClick).toHaveBeenCalledOnce()
    })

    it('does not call onClick when disabled', () => {
      const handleClick = vi.fn()
      renderWithChakra(
        <IconButton icon={X} aria-label="Close" disabled onClick={handleClick} />
      )
      fireEvent.click(screen.getByRole('button', { name: 'Close' }))
      expect(handleClick).not.toHaveBeenCalled()
    })
  })

  it('has no axe violations', async () => {
    const { container } = renderWithChakra(
      <IconButton icon={Settings} aria-label="Open settings" />
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})
