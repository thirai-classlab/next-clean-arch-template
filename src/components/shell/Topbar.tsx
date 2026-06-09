/**
 * Topbar — Chakra UI v3 (Phase 6 Batch 1 / task-32)
 *
 * Top bar: breadcrumb (workspace > parent > current) + MOCK badge + latency
 * indicator + version label. Re-implemented on top of Chakra v3 `Box`/`Flex`
 * (was raw `<header>` + inline `style` + `var(--bg)` CSS vars).
 *
 * Public API (preserved verbatim — other modules depend on the exported
 * `ROUTE_TITLES`, `RouteTitle`):
 *   - `ROUTE_TITLES: Readonly<Record<string, RouteTitle>>`
 *   - `interface RouteTitle { label, parent?, parentRoute? }`
 *
 * Recipe convention (see primitive/Button.tsx + theme/system.ts):
 *   1. Chakra v3 layout primitives only (`Box`, `Flex`) — no raw HTML +
 *      inline style. Semantic root remains `<header>` via `as="header"`.
 *   2. Semantic tokens (`bg.base`, `fg.default`, `fg.muted`, `fg.subtle`,
 *      `border.default`) — no CSS var() strings or oklch literals.
 *   3. Spacing token keys ('2'=8px, '3'=12px, '6'=24px) — no raw px where
 *      the 4px-aligned scale covers it. Pixel-perfect off-grid values
 *      (e.g. 11.5px font) keep raw px so the Linear look is preserved.
 *   4. `'use client'` required (uses `usePathname` + Zustand selector).
 *
 * a11y:
 *   - `<header>` with `role="banner"` is implicit when it's a top-level
 *     landmark; we keep it as `<header>` (semantic) and add `role="banner"`
 *     explicitly because this `<header>` is nested inside the AppShell `Grid`
 *     rather than directly under `<body>`.
 *   - Breadcrumb wrapped in `<nav aria-label="Breadcrumb">` with an ordered
 *     list so screen readers report position correctly.
 */
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Fragment } from 'react'
import { Box, Flex } from '@chakra-ui/react'
import { Icon } from '@/components/icons'
import { Badge } from '@/components/ui/Badge'
import { LivePulse } from '@/components/ui/LivePulse'
import { ColorModeToggle } from '@/components/ui/composite/ColorModeToggle'
import type { AuthenticatedSession } from '@/lib/interfaces/actions/_shared/auth-helper'
import { useRecallStore } from '@/lib/store'

// ─── ROUTE TITLES (exported for nav helpers) ──────────────────
export interface RouteTitle {
  label: string
  parent?: string
  parentRoute?: string
}

export const ROUTE_TITLES: Readonly<Record<string, RouteTitle>> = {
  '/':              { label: 'Home' },
  '/bots':          { label: 'Bots' },
  '/bots/new':      { label: 'New', parent: 'Bots', parentRoute: '/bots' },
  '/desktop-sdk':   { label: 'Desktop SDK' },
  '/mobile-sdk':    { label: 'Mobile SDK' },
  '/transcription': { label: 'Transcription' },
  '/realtime':      { label: 'Realtime' },
  '/breakout':      { label: 'Breakout' },
  '/media-output':  { label: 'Media Output' },
  '/recordings':    { label: 'Recordings' },
  '/webhooks':      { label: 'Webhooks' },
  '/calendar':      { label: 'Calendar' },
  '/calendar/rules': { label: 'Auto-Trigger Rules', parent: 'Calendar', parentRoute: '/calendar' },
  '/compliance':    { label: 'Compliance' },
}

interface Crumb {
  label: string
  route?: string
}

function buildCrumbs(path: string): Crumb[] {
  if (path === '/') return [{ label: 'Home' }]

  if (path.startsWith('/bots/') && path !== '/bots/new') {
    const id = path.slice(6)
    return [
      { label: 'recall-poc' },
      { label: 'Bots', route: '/bots' },
      { label: `${id.slice(0, 10)}…` },
    ]
  }

  const def = ROUTE_TITLES[path] ?? { label: path }
  const crumbs: Crumb[] = [{ label: 'recall-poc' }]
  if (def.parent) {
    crumbs.push({
      label: def.parent,
      ...(def.parentRoute ? { route: def.parentRoute } : {}),
    })
  }
  crumbs.push({ label: def.label })
  return crumbs
}

export interface TopbarProps {
  /**
   * Signed-in session. Logout moved to the Sidebar avatar menu, and the login
   * CTA lives in the Sidebar footer too, so the Topbar no longer renders any
   * auth control (the previous always-on login/logout buttons are removed —
   * user dogfooding 指摘 #1). The prop is accepted for API symmetry with the
   * other shell parts and future use, but currently does not change rendering.
   * Optional so existing unit tests render `<Topbar />` bare.
   */
  session?: AuthenticatedSession | null
}

export function Topbar(_props: TopbarProps = {}) {
  const pathname = usePathname() ?? '/'
  const latencyMs = useRecallStore((s) => s.latencyMs)
  const crumbs = buildCrumbs(pathname)
  const lastIndex = crumbs.length - 1

  return (
    <Flex
      as="header"
      role="banner"
      align="center"
      justify="space-between"
      height="48px"
      flex="0 0 auto"
      px="6"
      borderBottomWidth="1px"
      borderBottomColor="border.default"
      bg="bg.base"
      position="sticky"
      top={0}
      zIndex={10}
      overflowX="hidden"
      minWidth="0"
      data-shell-topbar
    >
      {/* ── Breadcrumb ───────────────────────────── */}
      <Box as="nav" aria-label="Breadcrumb">
        <Flex
          as="ol"
          align="center"
          gap="2"
          fontSize="12.5px"
          margin={0}
          padding={0}
          listStyleType="none"
        >
          {crumbs.map((c, i) => {
            const isLast = i === lastIndex
            return (
              <Fragment key={`${i}-${c.label}`}>
                {i > 0 && (
                  /* F-09: chevron is purely decorative — use <span aria-hidden>
                     outside the <li> flow so it does not become a list item. */
                  <Box as="span" aria-hidden="true" display="inline-flex" alignItems="center" role="presentation">
                    <Icon.Chevron size={11} style={{ color: 'currentcolor', opacity: 0.5 }} />
                  </Box>
                )}
                <Box
                  as="li"
                  display="inline-flex"
                  alignItems="center"
                  color={isLast ? 'fg.default' : c.route ? 'fg.muted' : 'fg.subtle'}
                  fontWeight={isLast ? 'medium' : 'regular'}
                >
                  {c.route ? (
                    <Link href={c.route} style={{ color: 'inherit' }}>
                      {c.label}
                    </Link>
                  ) : (
                    <Box as="span" aria-current={isLast ? 'page' : undefined}>
                      {c.label}
                    </Box>
                  )}
                </Box>
              </Fragment>
            )
          })}
        </Flex>
      </Box>

      {/* ── Right cluster: ColorModeToggle + MOCK badge + latency + version ──
          Auth actions (login / logout) were removed from the Topbar and moved to
          the Sidebar footer avatar menu (user dogfooding 指摘 #1 + #2). */}
      <Flex align="center" gap="3">
        {/* F-03: ColorModeToggle placed to the left of MOCK badge */}
        <ColorModeToggle />
        <Badge tone="warn">MOCK</Badge>
        <Box
          as="span"
          display="inline-flex"
          alignItems="center"
          gap="6px"
          fontSize="11.5px"
          color="fg.muted"
          fontFamily="mono"
          aria-label={`Latency ${Math.round(latencyMs)}ms`}
        >
          <LivePulse />
          {Math.round(latencyMs)}ms
        </Box>
        <Box
          as="span"
          fontSize="11.5px"
          color="fg.subtle"
          fontFamily="mono"
        >
          v0.1.0-poc
        </Box>
      </Flex>
    </Flex>
  )
}

Topbar.displayName = 'Topbar'
