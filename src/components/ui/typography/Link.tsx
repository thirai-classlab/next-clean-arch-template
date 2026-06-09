/**
 * Link — Chakra UI v3 (Phase 5 migration)
 *
 * Recipe convention: §3.1 of chakra-ui-migration.md — Chakra `Link` wrapping
 * the framework link via the `asChild` slot pattern (replaces @chakra-ui/next-js).
 *   1. Internal href → <ChakraLink asChild><NextLink/></ChakraLink>.
 *   2. External href → <ChakraLink asChild><a target=_blank rel=...></ChakraLink>
 *      with the trailing ExternalLink icon (aria-hidden) preserved.
 *   3. Auto-detection of external (http(s):// or //) and the explicit `external`
 *      override are unchanged.
 *   4. Linear-theme color via the `accent.text` semantic token (WCAG AA
 *      contrast) — no raw var() / oklch / hex.
 *   5. Public API (href / external / aria-label / className / children) is
 *      unchanged. "use client" required (Chakra factory).
 *
 * NOTE: asChild renders the single child as the DOM node and merges Chakra
 * styles onto it; the child therefore owns the href / target / rel attributes.
 */
'use client'

import NextLink from 'next/link'
import { ExternalLink } from 'lucide-react'
import { Link as ChakraLink } from '@chakra-ui/react'
import { cn } from '@/lib/utils/cn'

export interface LinkProps {
  href: string
  /** Force external treatment. Auto-detected when href starts with "http" */
  external?: boolean
  'aria-label'?: string
  className?: string
  children: React.ReactNode
}

export function Link({
  href,
  external,
  'aria-label': ariaLabel,
  className,
  children,
}: LinkProps) {
  const isExternal = external ?? /^(?:https?:|\/\/)/.test(href)

  const sharedProps = {
    className: cn(className),
    color: 'accent.text',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5',
    textUnderlineOffset: '2px',
    _hover: { textDecoration: 'underline' },
  } as const

  if (isExternal) {
    return (
      <ChakraLink asChild {...sharedProps}>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={ariaLabel}
        >
          {children}
          <ExternalLink className="inline-block" size={12} aria-hidden="true" />
        </a>
      </ChakraLink>
    )
  }

  return (
    <ChakraLink asChild {...sharedProps}>
      <NextLink href={href} aria-label={ariaLabel}>
        {children}
      </NextLink>
    </ChakraLink>
  )
}
