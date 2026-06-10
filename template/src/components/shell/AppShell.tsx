/**
 * AppShell — Chakra UI v3 (Phase 6 Batch 1 / task-32)
 *
 * Top-level layout container: Sidebar (left, fixed width) + Topbar (top,
 * sticky) + main scrollable content area. Re-implemented on top of Chakra v3
 * `Box`/`Grid`/`Flex` (was raw `<div>` + inline `style` + `var(--bg)` CSS vars).
 *
 * Backward compatibility:
 *   - The existing root layout (`app/layout.tsx`) calls
 *     `<AppShell>{children}</AppShell>` with no slot props. To keep that
 *     consumer working, the default Sidebar + Topbar render whenever
 *     `sidebar` / `topbar` props are omitted (passing `null` opts out).
 *   - The `initTicker('normal')` mock-store bootstrap is preserved.
 *
 * Slot composition (new):
 *   - `sidebar` / `topbar` accept any `ReactNode` so an admin/specialised
 *     layout can swap the defaults:
 *
 *       <AppShell
 *         sidebar={<AdminSidebar items={...} />}
 *         topbar={<AdminTopbar user={...} />}
 *       >
 *         {children}
 *       </AppShell>
 *
 * Recipe convention (see primitive/Button.tsx + theme/system.ts):
 *   1. Chakra v3 layout primitives only (`Box`, `Grid`, `Flex`) — no raw divs.
 *   2. Semantic tokens (`bg.base`, `fg.default`, `border.default`) — no CSS
 *      var() strings or oklch literals.
 *   3. Spacing token keys ('6'=24px, '8'=32px, '10'=40px) — no raw px.
 *   4. Responsive: desktop two-column grid; mobile single column (sidebar
 *      stacks above main). jsdom cannot exercise the breakpoint, so the
 *      responsive collapse is delegated to E2E / visual verification.
 *   5. `'use client'` is required (uses `useEffect` + Chakra factory).
 *
 * a11y:
 *   - `role="application"` on the root Grid + descriptive aria-label so screen
 *     readers announce the workspace context.
 *   - `<main id="main-content">` is a single landmark for skip-link targets.
 */
'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { Box, Grid } from '@chakra-ui/react'
import { Sidebar } from '@/components/shell/Sidebar'
import { Topbar } from '@/components/shell/Topbar'
import { CommandPalette } from '@/components/ui/composite/CommandPalette'
import type { AuthenticatedSession } from '@/lib/interfaces/actions/_shared/auth-helper'
import { initTicker } from '@/lib/store'

export interface AppShellProps {
  /**
   * Sidebar slot. Defaults to the project's `<Sidebar />` when omitted.
   * Pass `null` to render no sidebar (e.g. fullscreen onboarding).
   */
  sidebar?: ReactNode
  /**
   * Topbar slot. Defaults to the project's `<Topbar />` when omitted.
   * Pass `null` to render no topbar.
   */
  topbar?: ReactNode
  /**
   * Signed-in session forwarded to the default Sidebar (avatar menu) and
   * Topbar (login CTA). Ignored when a custom `sidebar` / `topbar` slot is
   * supplied. `null` / omitted → unauthenticated shell.
   */
  session?: AuthenticatedSession | null
  children: ReactNode
}

const SIDEBAR_WIDTH = '232px'

export function AppShell({
  sidebar,
  topbar,
  session = null,
  children,
}: AppShellProps) {
  // Start ticking simulation on first client mount (no-op on subsequent
  // renders). Preserved from the pre-Chakra scaffold so the MOCK store keeps
  // running.
  useEffect(() => {
    initTicker('normal')
  }, [])

  // CommandPalette open state — wired to the default Sidebar search button
  // and the Cmd+K / Ctrl+K global keyboard shortcut.
  // When a custom sidebar slot is provided, the consumer is responsible for
  // calling setPaletteOpen(true) themselves (or rendering their own palette).
  const [paletteOpen, setPaletteOpen] = useState(false)

  // F7 (NF-01): Wire Cmd+K (macOS) / Ctrl+K (other OS) to open the
  // CommandPalette. Only active when the default sidebar is in use;
  // custom sidebar slots are responsible for their own keyboard bindings.
  useEffect(() => {
    if (sidebar !== undefined) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setPaletteOpen(true)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [sidebar])

  // `undefined` → default; `null` → explicitly hidden.
  const sidebarNode =
    sidebar === undefined ? (
      <Sidebar onOpenPalette={() => setPaletteOpen(true)} session={session} />
    ) : sidebar
  const topbarNode = topbar === undefined ? <Topbar session={session} /> : topbar
  const showSidebar = sidebarNode !== null && sidebarNode !== undefined

  return (
    <Grid
      role="application"
      aria-label="recall-poc workspace"
      bg="bg.base"
      color="fg.default"
      fontFamily="sans"
      width="100%"
      minHeight="100vh"
      // Desktop (md+): two-column grid (sidebar | main column).
      // Mobile (base): grid is single-column; sidebar wrapper is display:none
      // so it is removed from the flow and the main content fills the viewport.
      // F-01 / F-07 fix: using display:none on the sidebar wrapper (not contents)
      // ensures position:sticky and height:100vh inside Sidebar do not bleed into
      // the mobile layout.
      templateColumns={{
        base: '1fr',
        md: showSidebar ? `${SIDEBAR_WIDTH} 1fr` : '1fr',
      }}
      data-shell-root
    >
      {showSidebar ? (
        <Box display={{ base: 'none', md: 'flex' }} flexDirection="column">
          {sidebarNode}
        </Box>
      ) : null}

      <Box
        display="flex"
        flexDirection="column"
        minWidth={0}
      >
        {topbarNode}
        <Box
          as="main"
          id="main-content"
          flex="1"
          minWidth={0}
          px={{ base: '4', md: '8' }}
          py={{ base: '6', md: '6' }}
          pb={{ base: '10', md: '10' }}
        >
          {children}
        </Box>
      </Box>

      {/* CommandPalette is mounted at the AppShell level so it overlays the
          entire workspace. It is only wired when the default Sidebar is used;
          custom sidebar slots manage their own palette trigger. */}
      {sidebar === undefined && (
        <CommandPalette
          open={paletteOpen}
          onOpenChange={setPaletteOpen}
          items={[]}
        />
      )}
    </Grid>
  )
}

AppShell.displayName = 'AppShell'
