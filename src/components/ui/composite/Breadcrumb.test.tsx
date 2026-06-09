import * as React from 'react'
import { screen, cleanup } from '@testing-library/react'
import { describe, it, expect, afterEach } from 'vitest'
import { renderWithChakra } from '@/test-utils'
import { Breadcrumb } from './Breadcrumb'

/**
 * Breadcrumb unit tests — Chakra v3 (task-32 Batch 3a).
 *
 * Coverage:
 *  - nav landmark with accessible label
 *  - link items rendered as anchors with correct href
 *  - last item rendered as current page (aria-current="page", no link)
 *  - slot composition API (Breadcrumb.Root / .Item / .CurrentItem)
 *  - single-item edge case (current page only)
 */

afterEach(() => {
  cleanup()
})

const ITEMS = [
  { label: 'Home', href: '/' },
  { label: 'Settings', href: '/settings' },
  { label: 'API Keys' },
]

describe('Breadcrumb (data-driven)', () => {
  describe('Test 1: nav landmark', () => {
    it('renders a nav element with the default aria-label', () => {
      renderWithChakra(<Breadcrumb items={ITEMS} />)
      const nav = screen.getByRole('navigation', { name: 'パンくずリスト' })
      expect(nav).not.toBeNull()
    })

    it('accepts a custom aria-label', () => {
      renderWithChakra(<Breadcrumb items={ITEMS} aria-label="Breadcrumb" />)
      const nav = screen.getByRole('navigation', { name: 'Breadcrumb' })
      expect(nav).not.toBeNull()
    })
  })

  describe('Test 2: link items', () => {
    it('renders non-last items as anchor links with correct href', () => {
      renderWithChakra(<Breadcrumb items={ITEMS} />)
      const homeLink = screen.getByRole('link', { name: 'Home' })
      expect(homeLink.getAttribute('href')).toBe('/')
      const settingsLink = screen.getByRole('link', { name: 'Settings' })
      expect(settingsLink.getAttribute('href')).toBe('/settings')
    })
  })

  describe('Test 3: current page item', () => {
    it('renders the last item with aria-current="page"', () => {
      renderWithChakra(<Breadcrumb items={ITEMS} />)
      // The current page text is present
      expect(screen.getByText('API Keys')).not.toBeNull()
      // Chakra v3 BreadcrumbCurrentLink renders role="link" with aria-current="page"
      // so we assert aria-current="page" is present on the element.
      const currentEl = screen.getByText('API Keys').closest('[aria-current="page"]')
      expect(currentEl).not.toBeNull()
      // The non-last link items (Home, Settings) should have href; API Keys should not.
      const links = screen.queryAllByRole('link')
      const apiKeyLink = links.find((l) => l.textContent?.trim() === 'API Keys')
      // If it renders as role="link", it must have aria-current="page" and no href.
      if (apiKeyLink) {
        expect(apiKeyLink.getAttribute('aria-current')).toBe('page')
        expect(apiKeyLink.getAttribute('href')).toBeFalsy()
      }
    })
  })

  describe('Test 4: single-item edge case', () => {
    it('renders a single current-page item with aria-current="page"', () => {
      renderWithChakra(<Breadcrumb items={[{ label: 'Dashboard' }]} />)
      expect(screen.getByText('Dashboard')).not.toBeNull()
      // Chakra v3 CurrentLink uses aria-current="page" regardless of role
      const currentEl = screen.getByText('Dashboard').closest('[aria-current="page"]')
      expect(currentEl).not.toBeNull()
    })
  })
})

describe('Breadcrumb (slot composition)', () => {
  describe('Test 5: slot API renders nav + items', () => {
    it('renders nav landmark and items via slot composition', () => {
      renderWithChakra(
        <Breadcrumb.Root aria-label="Slot breadcrumb">
          <Breadcrumb.Item href="/home">Home</Breadcrumb.Item>
          <Breadcrumb.CurrentItem>Current</Breadcrumb.CurrentItem>
        </Breadcrumb.Root>
      )
      const nav = screen.getByRole('navigation', { name: 'Slot breadcrumb' })
      expect(nav).not.toBeNull()
      const homeLink = screen.getByRole('link', { name: 'Home' })
      expect(homeLink.getAttribute('href')).toBe('/home')
      expect(screen.getByText('Current')).not.toBeNull()
    })
  })
})
