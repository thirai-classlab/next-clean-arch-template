/**
 * UsersTable integration tests — F-05 fix (DataTable integration) + HIGH-4 fix.
 *
 * Verifies that UsersTable now uses composite/DataTable with TanStack-driven
 * sort/pagination rather than the legacy controlled composite/Table.
 *
 * Scope:
 *   - Renders user rows via DataTable (email, role, status, createdAt columns).
 *   - Sortable column headers expose aria-sort (DataTable contract).
 *   - Empty state renders EmptyState when rows is empty.
 *   - Caption "User 一覧" is present.
 *   - [HIGH-4] role change Select → changeUserRole Server Action invocation.
 *   - [HIGH-4] role change success toast display on resolved success.
 *   - [HIGH-4] role change error toast display when SA returns { error }.
 *
 * Out of scope (visual regression, dark-mode token resolution):
 *   agent-browser visual pass at admin/users.
 */
import * as React from 'react'
import { cleanup, fireEvent, waitFor, act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithChakra } from '@/test-utils'
import { UsersTable } from './UsersTable'
import type { AdminUserRow } from '../../_lib/admin-data'

// ── Mock Server Action (admin-actions) ─────────────────────────────────────
// The mock factory returns a wrapper that delegates to a module-level spy so
// individual tests can override the resolved value without re-hoisting the mock.
const mockChangeUserRole = vi.fn().mockResolvedValue({ role: 'member' })
vi.mock('../../_lib/admin-actions', () => ({
  changeUserRole: (...args: unknown[]) => mockChangeUserRole(...args),
}))

// ── Shared toast spies (stable across renders within each test) ────────────
// Exposing named spies outside the factory lets tests assert on the exact
// calls without needing to extract the spy from the rendered component.
const toastSuccess = vi.fn()
const toastError = vi.fn()

vi.mock('@/components/ui/feedback', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/ui/feedback')>()
  return {
    ...actual,
    useToast: () => ({
      success: toastSuccess,
      error: toastError,
      info: vi.fn(),
      warning: vi.fn(),
    }),
  }
})

beforeEach(() => {
  vi.clearAllMocks()
  // Reset to success default before each test; error tests override below.
  mockChangeUserRole.mockResolvedValue({ role: 'member' })
})

afterEach(() => {
  cleanup()
})

// ── Shared fixtures ────────────────────────────────────────────────────────

const SAMPLE_ROWS: AdminUserRow[] = [
  {
    id: 'u1',
    email: 'alice@example.com',
    role: 'admin',
    status: 'active',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'u2',
    email: 'bob@example.com',
    role: 'member',
    status: 'pending',
    createdAt: '2024-02-01T00:00:00.000Z',
  },
]

const SINGLE_ROW: AdminUserRow[] = [
  {
    id: 'u1',
    email: 'alice@example.com',
    role: 'admin',
    status: 'active',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
]

// ── Existing tests (DataTable integration) ────────────────────────────────

describe('UsersTable — Test 1: renders rows with DataTable', () => {
  it('renders all user emails as links', () => {
    const { getByText } = renderWithChakra(<UsersTable rows={SAMPLE_ROWS} />)
    expect(getByText('alice@example.com')).toBeTruthy()
    expect(getByText('bob@example.com')).toBeTruthy()
  })

  it('renders status badges', () => {
    const { getByText } = renderWithChakra(<UsersTable rows={SAMPLE_ROWS} />)
    expect(getByText('active')).toBeTruthy()
    expect(getByText('pending')).toBeTruthy()
  })
})

describe('UsersTable — Test 2: DataTable caption', () => {
  it('renders the "User 一覧" caption', () => {
    const { container } = renderWithChakra(<UsersTable rows={SAMPLE_ROWS} />)
    const caption = container.querySelector('caption')
    expect(caption).not.toBeNull()
    expect(caption?.textContent).toContain('User 一覧')
  })
})

describe('UsersTable — Test 3: sortable headers expose aria-sort', () => {
  it('Email column header has aria-sort attribute (DataTable contract)', () => {
    const { getByRole } = renderWithChakra(<UsersTable rows={SAMPLE_ROWS} />)
    const emailHeader = getByRole('columnheader', { name: /email/i })
    // DataTable sets aria-sort="none" on sortable headers by default
    expect(emailHeader.hasAttribute('aria-sort')).toBe(true)
  })
})

describe('UsersTable — Test 4: empty state', () => {
  it('renders EmptyState when rows is empty', () => {
    const { getByText } = renderWithChakra(<UsersTable rows={[]} />)
    expect(getByText('User なし')).toBeTruthy()
  })
})

// ── HIGH-4: role change interaction ───────────────────────────────────────
// Covers: Select → changeUserRole SA call → success/error toast branching.

describe('UsersTable — Test 5: role change Select invokes changeUserRole', () => {
  it('calls changeUserRole with the correct userId and new role on Select change', async () => {
    const { getByLabelText } = renderWithChakra(<UsersTable rows={SINGLE_ROW} />)
    // The Select label is "Role for <email>" (set via the label prop in UsersTable)
    const select = getByLabelText(/Role for alice@example\.com/i) as HTMLSelectElement

    await act(async () => {
      fireEvent.change(select, { target: { value: 'member' } })
    })

    await waitFor(() => {
      expect(mockChangeUserRole).toHaveBeenCalledWith('u1', 'member')
    })
  })

  it('calls changeUserRole with "viewer" when Select changes to viewer', async () => {
    const { getByLabelText } = renderWithChakra(<UsersTable rows={SINGLE_ROW} />)
    const select = getByLabelText(/Role for alice@example\.com/i) as HTMLSelectElement

    await act(async () => {
      fireEvent.change(select, { target: { value: 'viewer' } })
    })

    await waitFor(() => {
      expect(mockChangeUserRole).toHaveBeenCalledWith('u1', 'viewer')
    })
  })
})

describe('UsersTable — Test 6: role change success shows success toast', () => {
  it('shows success toast after changeUserRole resolves without error field', async () => {
    mockChangeUserRole.mockResolvedValue({ role: 'member' })
    const { getByLabelText } = renderWithChakra(<UsersTable rows={SINGLE_ROW} />)
    const select = getByLabelText(/Role for alice@example\.com/i) as HTMLSelectElement

    await act(async () => {
      fireEvent.change(select, { target: { value: 'member' } })
    })

    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith('Role を変更しました')
    })
    expect(toastError).not.toHaveBeenCalled()
  })
})

describe('UsersTable — Test 7: role change error shows error toast', () => {
  it('shows error toast when changeUserRole returns { error } and does not call success', async () => {
    mockChangeUserRole.mockResolvedValue({ error: 'Forbidden' })
    const { getByLabelText } = renderWithChakra(<UsersTable rows={SINGLE_ROW} />)
    const select = getByLabelText(/Role for alice@example\.com/i) as HTMLSelectElement

    await act(async () => {
      fireEvent.change(select, { target: { value: 'member' } })
    })

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith('Role 変更失敗: Forbidden')
    })
    expect(toastSuccess).not.toHaveBeenCalled()
  })
})
