import * as React from 'react'
import { screen, cleanup } from '@testing-library/react'
import { describe, it, expect, afterEach } from 'vitest'
import { renderWithChakra } from '@/test-utils'
import { Avatar } from './Avatar'

/**
 * Avatar unit tests — Chakra v3 (task-32 Batch 3a).
 *
 * Coverage:
 *  - renders img with correct src and alt
 *  - renders initials fallback when no src provided
 *  - renders generic icon fallback when neither src nor fallback provided
 *  - size prop applies (DOM attribute presence check)
 *  - Avatar.Group renders multiple avatars
 */

afterEach(() => {
  cleanup()
})

describe('Avatar', () => {
  describe('Test 1: image rendering', () => {
    it('renders an img element with the provided src and alt', () => {
      renderWithChakra(
        <Avatar src="https://example.com/avatar.png" alt="Takuma Hirai" />
      )
      // Chakra v3 Avatar.Image renders with data-state="hidden" and the HTML
      // hidden attribute until the image fires onLoad (which jsdom does not do).
      // The img is therefore hidden from the a11y tree. Query the DOM directly.
      const img = document.querySelector('img[data-part="image"]') as HTMLImageElement | null
      expect(img).not.toBeNull()
      expect(img?.getAttribute('src')).toBe('https://example.com/avatar.png')
      expect(img?.getAttribute('alt')).toBe('Takuma Hirai')
    })
  })

  describe('Test 2: initials fallback', () => {
    it('renders fallback text when src is not provided', () => {
      renderWithChakra(<Avatar fallback="TH" alt="Takuma Hirai" />)
      expect(screen.getByText('TH')).not.toBeNull()
    })
  })

  describe('Test 3: icon fallback', () => {
    it('renders without crashing when neither src nor fallback is given', () => {
      renderWithChakra(<Avatar alt="Unknown user" />)
      // The Avatar.Icon should render; we assert the root element exists.
      // We find it via aria-label on the fallback.
      expect(document.querySelector('[aria-label="Unknown user"]')).not.toBeNull()
    })
  })

  describe('Test 4: size prop', () => {
    it('renders each size variant without crashing', () => {
      const sizes = ['xs', 'sm', 'md', 'lg', 'xl'] as const
      for (const size of sizes) {
        const { unmount } = renderWithChakra(
          <Avatar fallback={size.toUpperCase()} size={size} />
        )
        expect(screen.getByText(size.toUpperCase())).not.toBeNull()
        unmount()
      }
    })
  })

  describe('Test 5: Avatar.Group', () => {
    it('renders multiple avatars inside a group', () => {
      renderWithChakra(
        <Avatar.Group size="sm">
          <Avatar fallback="A" alt="User A" />
          <Avatar fallback="B" alt="User B" />
          <Avatar fallback="C" alt="User C" />
        </Avatar.Group>
      )
      expect(screen.getByText('A')).not.toBeNull()
      expect(screen.getByText('B')).not.toBeNull()
      expect(screen.getByText('C')).not.toBeNull()
    })
  })

  describe('Test 6: Avatar.Group a11y (HC-13)', () => {
    it('renders group with role="group" and default aria-label', () => {
      renderWithChakra(
        <Avatar.Group>
          <Avatar fallback="X" alt="User X" />
        </Avatar.Group>
      )
      const group = screen.getByRole('group')
      expect(group).not.toBeNull()
      expect(group.getAttribute('aria-label')).toBe('Avatars')
    })

    it('accepts custom aria-label on Avatar.Group', () => {
      renderWithChakra(
        <Avatar.Group aria-label="Members">
          <Avatar fallback="Y" alt="User Y" />
        </Avatar.Group>
      )
      const group = screen.getByRole('group')
      expect(group.getAttribute('aria-label')).toBe('Members')
    })
  })
})
