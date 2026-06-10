/**
 * ConditionalShell — task-37 Step 1 (login 専用画面化、C-A Option B)
 *
 * Root layout (`app/layout.tsx`) must stay a Server Component so it can keep
 * exporting `metadata` (Next.js 14 disallows `metadata` in client modules).
 * Pathname-based shell selection therefore lives in this small client wrapper.
 *
 * Behaviour:
 *   - `/auth/*` routes → render `children` bare (no Sidebar / Topbar / main
 *     padding). The page supplies its own full-viewport centered layout.
 *   - all other routes → wrap in the default `<AppShell>` (Sidebar + Topbar).
 *
 * The body background is supplied globally by ChakraAppProvider, so bare auth
 * routes still get the correct surface even outside AppShell (ui LOW-R3-3).
 *
 * See: docs/draft/auth-login-strategy.md §「Step 1 詳細」R2-4.
 */
'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { AppShell } from '@/components/shell/AppShell'
import type { AuthenticatedSession } from '@/lib/interfaces/actions/_shared/auth-helper'

export interface ConditionalShellProps {
  children: ReactNode
  /**
   * Session resolved by the (Server) root layout. Forwarded to AppShell →
   * Sidebar so the avatar menu can show the real signed-in user. `null` when
   * unauthenticated. Optional so existing unit tests can render bare.
   */
  session?: AuthenticatedSession | null
}

export function ConditionalShell({ children, session = null }: ConditionalShellProps) {
  const pathname = usePathname()
  const isAuthRoute = pathname?.startsWith('/auth') ?? false

  if (isAuthRoute) {
    return <>{children}</>
  }

  return <AppShell session={session}>{children}</AppShell>
}

ConditionalShell.displayName = 'ConditionalShell'
