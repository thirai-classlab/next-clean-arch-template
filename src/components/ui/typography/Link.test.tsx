/**
 * Link tests — Phase 5 (behavior + a11y)
 *
 * Chakra v3 `Link asChild` renders the child as the DOM node and merges its
 * styles via an emotion class, so the old `style.color = var(--color-accent-text)`
 * assertion is dropped (color is verified by visual verification). The
 * external/internal contract — target, rel, icon, aria-label, className merge,
 * regex detection, external override — is preserved.
 *
 * next/link needs a router context, so it is mocked to render as <a> while
 * forwarding the props Chakra merges onto it (href, className, aria-label).
 */
import { forwardRef } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { renderWithChakra } from '@/test-utils'
import { Link } from './Link'

// next/link is forwardRef in real life; mock it the same way so Chakra's
// asChild ref forwarding does not emit a "function components cannot be given
// refs" warning.
vi.mock('next/link', () => ({
  default: forwardRef<HTMLAnchorElement, {
    href: string
    children: React.ReactNode
    className?: string
    style?: React.CSSProperties
    'aria-label'?: string
  }>(function NextLinkMock(
    { href, children, className, style, 'aria-label': ariaLabel, ...rest },
    ref
  ) {
    return (
      <a
        ref={ref}
        href={href}
        className={className}
        style={style}
        aria-label={ariaLabel}
        {...rest}
      >
        {children}
      </a>
    )
  }),
}))

describe('Link', () => {
  describe('internal link (no http prefix)', () => {
    it('renders via next/link (mocked as <a>)', () => {
      const { container } = renderWithChakra(<Link href="/about">About</Link>)
      expect(container.querySelector('a')).not.toBeNull()
    })

    it('does NOT have target="_blank"', () => {
      const { container } = renderWithChakra(<Link href="/about">About</Link>)
      expect(container.querySelector('a')?.getAttribute('target')).toBeNull()
    })

    it('does NOT have rel="noopener noreferrer"', () => {
      const { container } = renderWithChakra(<Link href="/about">About</Link>)
      expect(container.querySelector('a')?.getAttribute('rel')).toBeNull()
    })

    it('does NOT render ExternalLink icon', () => {
      const { container } = renderWithChakra(<Link href="/docs">Docs</Link>)
      expect(container.querySelector('svg')).toBeNull()
    })

    it('renders children text', () => {
      const { container } = renderWithChakra(<Link href="/home">Home</Link>)
      expect(container.querySelector('a')?.textContent).toBe('Home')
    })
  })

  describe('external link (http prefix)', () => {
    it('has target="_blank"', () => {
      const { container } = renderWithChakra(
        <Link href="https://example.com">External</Link>
      )
      expect(container.querySelector('a')?.getAttribute('target')).toBe('_blank')
    })

    it('has rel="noopener noreferrer"', () => {
      const { container } = renderWithChakra(
        <Link href="https://example.com">External</Link>
      )
      expect(container.querySelector('a')?.getAttribute('rel')).toBe('noopener noreferrer')
    })

    it('renders ExternalLink icon (svg)', () => {
      const { container } = renderWithChakra(
        <Link href="https://example.com">Go</Link>
      )
      expect(container.querySelector('svg')).not.toBeNull()
    })

    it('icon has aria-hidden="true"', () => {
      const { container } = renderWithChakra(
        <Link href="https://example.com">Go</Link>
      )
      const svg = container.querySelector('svg')
      expect(svg?.getAttribute('aria-hidden')).toBe('true')
    })
  })

  describe('external prop override', () => {
    it('external=true forces external treatment for non-http href', () => {
      const { container } = renderWithChakra(
        <Link href="/internal" external>Force External</Link>
      )
      const a = container.querySelector('a')
      expect(a?.getAttribute('target')).toBe('_blank')
      expect(a?.getAttribute('rel')).toBe('noopener noreferrer')
    })

    it('external=false forces internal treatment for http href', () => {
      const { container } = renderWithChakra(
        <Link href="https://example.com" external={false}>Not External</Link>
      )
      expect(container.querySelector('a')?.getAttribute('target')).toBeNull()
    })
  })

  it('applies aria-label', () => {
    const { container } = renderWithChakra(
      <Link href="/about" aria-label="About page">About</Link>
    )
    expect(container.querySelector('a')?.getAttribute('aria-label')).toBe('About page')
  })

  it('merges custom className', () => {
    const { container } = renderWithChakra(
      <Link href="/home" className="custom-link">Home</Link>
    )
    expect(container.querySelector('a')?.className).toContain('custom-link')
  })

  describe('external link detection — regex-based', () => {
    it('protocol-relative URL (//example.com) is treated as external', () => {
      const { container } = renderWithChakra(
        <Link href="//example.com">Protocol Relative</Link>
      )
      const a = container.querySelector('a')
      expect(a?.getAttribute('target')).toBe('_blank')
      expect(a?.getAttribute('rel')).toBe('noopener noreferrer')
    })

    it('http:// URL is treated as external', () => {
      const { container } = renderWithChakra(
        <Link href="http://example.com">HTTP Link</Link>
      )
      expect(container.querySelector('a')?.getAttribute('target')).toBe('_blank')
    })
  })

  it('has no axe accessibility violations (internal link)', async () => {
    const { container } = renderWithChakra(<Link href="/about">About page</Link>)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('has no axe accessibility violations (external link)', async () => {
    const { container } = renderWithChakra(
      <Link href="https://example.com" aria-label="Visit example.com (opens in new tab)">External</Link>
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})
