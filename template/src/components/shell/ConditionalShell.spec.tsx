/**
 * ConditionalShell unit tests — task-37 Step 5 FIX-B
 *
 * Behaviour:
 *   - `/auth/*` routes → bare children only; AppShell (Sidebar/Topbar) NOT rendered
 *   - all other routes → AppShell wraps children
 *   - null from usePathname → AppShell side (??false → false → AppShell branch)
 */
import * as React from 'react'
import { cleanup } from '@testing-library/react'
import { afterEach, describe, it, expect, vi } from 'vitest'
import { renderWithChakra as render } from '@/test-utils'
import { ConditionalShell } from './ConditionalShell'

// ------------------------------------------------------------------
// Stub AppShell to a minimal sentinel so render presence is assertable
// without pulling in the full Sidebar / Topbar / store machinery.
// ------------------------------------------------------------------
vi.mock('@/components/shell/AppShell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-shell">{children}</div>
  ),
}))

// next/navigation — controlled per test via mockReturnValue
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

async function mockPathname(value: string | null) {
  const nav = await import('next/navigation')
  vi.mocked(nav.usePathname).mockReturnValue(value as string)
}

describe('ConditionalShell', () => {
  describe('auth routes — bare render (no AppShell)', () => {
    it('/auth/sign-in renders children directly without AppShell', async () => {
      await mockPathname('/auth/sign-in')

      const { getByText, queryByTestId } = render(
        <ConditionalShell>
          <p>Login page</p>
        </ConditionalShell>,
      )

      expect(getByText('Login page')).toBeInTheDocument()
      // AppShell sentinel must NOT be present on auth routes.
      expect(queryByTestId('app-shell')).toBeNull()
    })

    it('/auth/callback renders children without AppShell', async () => {
      await mockPathname('/auth/callback')

      const { getByText, queryByTestId } = render(
        <ConditionalShell>
          <p>Callback</p>
        </ConditionalShell>,
      )

      expect(getByText('Callback')).toBeInTheDocument()
      expect(queryByTestId('app-shell')).toBeNull()
    })
  })

  describe('non-auth routes — AppShell wraps children', () => {
    it('/dashboard wraps children in AppShell', async () => {
      await mockPathname('/dashboard')

      const { getByTestId, getByText } = render(
        <ConditionalShell>
          <p>Dashboard page</p>
        </ConditionalShell>,
      )

      const shell = getByTestId('app-shell')
      expect(shell).toBeInTheDocument()
      // Children are rendered inside the AppShell wrapper.
      expect(shell).toContainElement(getByText('Dashboard page'))
    })

    it('/ (root) wraps children in AppShell', async () => {
      await mockPathname('/')

      const { getByTestId } = render(
        <ConditionalShell>
          <p>Home</p>
        </ConditionalShell>,
      )

      expect(getByTestId('app-shell')).toBeInTheDocument()
    })
  })

  describe('null pathname — defaults to AppShell (??false path)', () => {
    it('null from usePathname falls through to AppShell (isAuthRoute = false via ?? false)', async () => {
      // Arrange: usePathname returns null
      // ConditionalShell: const isAuthRoute = pathname?.startsWith('/auth') ?? false
      // null?.startsWith('/auth') → undefined ?? false → false → AppShell branch
      await mockPathname(null)

      const { getByTestId } = render(
        <ConditionalShell>
          <p>Unknown route</p>
        </ConditionalShell>,
      )

      expect(getByTestId('app-shell')).toBeInTheDocument()
    })
  })
})
