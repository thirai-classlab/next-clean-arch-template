/**
 * Sidebar — Chakra UI v3 (Phase 6 Batch 1 / task-32)
 *
 * Left navigation: workspace badge + search field + 2 grouped link sections
 * (3 routes total) + user footer. Re-implemented on top of Chakra v3 `Box`/
 * `Flex` (was raw `<aside>` + inline `style` + `var(--bg-sunk)` CSS vars).
 *
 * Public API (preserved verbatim — Topbar / route helpers depend on the
 * exported `PAGE_DEFS`, `PageItem`, `PageGroup`):
 *   - `PAGE_DEFS: readonly PageGroup[]`
 *   - `interface PageItem { route, label, icon, live? }`
 *   - `interface PageGroup { group, items }`
 *
 * Recipe convention (see primitive/Button.tsx + theme/system.ts):
 *   1. Chakra v3 layout primitives only (`Box`, `Flex`) — no raw HTML +
 *      inline style. The semantic root remains `<aside>` via `as="aside"`.
 *   2. Semantic tokens (`bg.sunken`, `fg.default`, `border.default`,
 *      `accent.default`) — no CSS var() strings or oklch literals.
 *   3. Spacing token keys ('1'=4px, '2'=8px, '3'=12px, '4'=16px) — no raw px
 *      where the 4px-aligned scale covers it. Off-grid micro-spacing keeps
 *      raw px values verbatim from the pre-Chakra port (e.g. 5/9/14) so the
 *      Linear pixel-perfect look is preserved.
 *   4. `'use client'` required (uses `usePathname`).
 *
 * a11y:
 *   - `<aside>` element with `role="navigation"` + `aria-label="Primary"`.
 *   - Each group rendered with a heading-styled label (`<h3>`) so screen
 *     readers can navigate via headings.
 *   - Active link advertises `aria-current="page"`.
 *   - Live indicator badges expose `aria-label="live"` for SR users.
 */
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Box, Flex } from '@chakra-ui/react'
import { Icon, type IconName } from '@/components/icons'
import { UserMenu } from '@/components/shell/UserMenu'
import type { AuthenticatedSession } from '@/lib/interfaces/actions/_shared/auth-helper'

// ─── PAGE DEFS (exported for Topbar / external nav generators) ───
export interface PageItem {
  route: string
  label: string
  icon: IconName
  live?: boolean
}

export interface PageGroup {
  group: string
  items: readonly PageItem[]
}

export const PAGE_DEFS: readonly PageGroup[] = [
  {
    group: '概要',
    items: [{ route: '/', label: 'Home', icon: 'Home' }],
  },
  {
    // 開発者向けツール群 (Component gallery / Admin panel)
    // Recall.ai 11 機能 placeholder は Phase 2 task-10 で再構築予定 (orphan route として残存)
    group: '開発者ツール',
    items: [
      { route: '/admin/dev/components', label: 'Component 一覧', icon: 'Layers' },
      { route: '/admin/dashboard',      label: '管理画面',        icon: 'Shield' },
    ],
  },
]

export interface SidebarProps {
  /**
   * Called when the user activates the search widget (click, Enter, or Space).
   * Wire this to a CommandPalette open handler at the call site.
   * Defaults to a no-op so Sidebar renders correctly without CommandPalette.
   */
  onOpenPalette?: () => void
  /**
   * Signed-in session used by the footer avatar menu (email / role / logout).
   * `null` / omitted → the footer shows a「ログイン」CTA instead. Optional so
   * existing unit tests can render `<Sidebar />` bare (unauthenticated footer).
   */
  session?: AuthenticatedSession | null
}

export function Sidebar({ onOpenPalette, session = null }: SidebarProps) {
  const pathname = usePathname() ?? '/'

  return (
    <Flex
      as="aside"
      role="navigation"
      aria-label="Primary"
      data-testid="primary-nav"
      direction="column"
      borderRightWidth="1px"
      borderRightColor="border.default"
      bg="bg.sunken"
      overflow="hidden"
      position="sticky"
      top={0}
      height="100vh"
      data-shell-sidebar
    >
      {/* ── Workspace badge ─────────────────────────── */}
      <Flex
        align="center"
        gap="9px"
        height="48px"
        px="14px"
        borderBottomWidth="1px"
        borderBottomColor="border.default"
      >
        <Flex
          align="center"
          justify="center"
          width="22px"
          height="22px"
          borderRadius="6px"
          bg="accent.default"
          color="white"
          fontWeight="bold"
          fontSize="12px"
          letterSpacing="-0.04em"
        >
          R
        </Flex>
        {/*
          Single-workspace POC: there is no workspace switcher, so the former
          no-op ▼ (Icon.ChevronDown with no handler) is removed to avoid implying
          an interaction that does not exist (user dogfooding 指摘 #4). The badge
          is a plain, non-interactive project label.
        */}
        <Flex flex="1" minWidth={0} align="center">
          <Box
            fontWeight="semibold"
            fontSize="12.5px"
            letterSpacing="-0.01em"
            title="recall-poc (現在のプロジェクト)"
          >
            recall-poc
          </Box>
        </Flex>
      </Flex>

      {/* ── Search ───────────────────────────────── */}
      <Box px="3" pt="10px" pb="6px">
        <Box
          asChild
          display="flex"
          alignItems="center"
          gap="7px"
          px="9px"
          py="5px"
          width="full"
          bg="bg.elevated"
          borderWidth="1px"
          borderColor="border.default"
          borderRadius="sm"
          color="fg.muted"
          fontSize="12px"
          cursor="pointer"
          _hover={{ bg: 'bg.hover', borderColor: 'border.strong' }}
          _focusVisible={{
            outline: '2px solid',
            outlineColor: 'accent.default',
            outlineOffset: '2px',
          }}
        >
          <button
            type="button"
            onClick={onOpenPalette}
            aria-label="Open command palette (Cmd+K)"
          >
            <Icon.Search size={12} aria-hidden />
            <Box as="span" flex="1" textAlign="left">検索</Box>
            <Box
              as="span"
              fontFamily="mono"
              fontSize="10px"
              px="5px"
              py="1px"
              bg="bg.sunken"
              borderRadius="3px"
              color="fg.subtle"
            >
              ⌘K
            </Box>
          </button>
        </Box>
      </Box>

      {/* ── Groups / Links ───────────────────────── */}
      <Box
        className="recall-scroll"
        flex="1"
        overflowY="auto"
        px="2"
        pt="1"
        pb="1"
        display="flex"
        flexDirection="column"
        gap="10px"
      >
        {PAGE_DEFS.map((g) => (
          <Box key={g.group}>
            <Box
              as="h3"
              fontSize="10px"
              fontWeight="semibold"
              color="fg.subtle"
              letterSpacing="0.06em"
              textTransform="uppercase"
              px="2"
              pt="2"
              pb="1"
              margin={0}
            >
              {g.group}
            </Box>
            <Box display="flex" flexDirection="column" gap="1px">
              {g.items.map((it) => {
                const IconC = Icon[it.icon] ?? Icon.Dot
                const active = pathname === it.route
                return (
                  <Box
                    key={it.route}
                    asChild
                    display="flex"
                    alignItems="center"
                    gap="9px"
                    px="2"
                    py="5px"
                    borderRadius="sm"
                    bg={active ? 'bg.elevated' : 'transparent'}
                    borderWidth={active ? '1px' : '0'}
                    borderColor="border.default"
                    color={active ? 'fg.default' : 'fg.muted'}
                    fontWeight={active ? 'semibold' : 'medium'}
                    fontSize="12.5px"
                    cursor="pointer"
                    justifyContent="flex-start"
                    _hover={{ bg: 'bg.elevated', color: 'fg.default' }}
                  >
                    <Link
                      href={it.route}
                      aria-current={active ? 'page' : undefined}
                    >
                      <IconC size={14} aria-hidden />
                      <Box
                        as="span"
                        flex="1"
                        minWidth={0}
                        whiteSpace="nowrap"
                        overflow="hidden"
                        textOverflow="ellipsis"
                      >
                        {it.label}
                      </Box>

                      {it.live && (
                        <Box
                          as="span"
                          className="recall-live-dot"
                          width="5px"
                          height="5px"
                          aria-label="live"
                        />
                      )}
                    </Link>
                  </Box>
                )
              })}
            </Box>
          </Box>
        ))}
      </Box>

      {/* ── User footer (avatar menu / login CTA) ──── */}
      <UserMenu session={session} />
    </Flex>
  )
}

Sidebar.displayName = 'Sidebar'
