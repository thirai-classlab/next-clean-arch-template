'use client'
// src/app/(admin)/admin/users/_components/UsersTable.tsx
// task-5 Step 5 — client island: user list with inline role-change.
//
// F-05 fix: replaced legacy composite/Table (controlled sort + controlled
// pagination) with composite/DataTable (TanStack uncontrolled).
// DataTable provides aria-sort on every sortable column header out of the box
// and manages sort/page state internally, eliminating the controlled-page state
// that was previously owned by UsersTable.

import * as React from 'react'
import Link from 'next/link'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/composite'
import { EmptyState, useToast } from '@/components/ui/feedback'
import { Badge } from '@/components/ui/Badge'
import { Select, type SelectOption } from '@/components/ui/primitive/Select'
import type { Role } from '@/lib/domain/value-objects/role'
import { changeUserRole } from '../../_lib/admin-actions'
import type { AdminUserRow } from '../../_lib/admin-data'

const PAGE_SIZE = 50
const ROLE_OPTIONS: readonly SelectOption[] = [
  { value: 'admin', label: 'admin' },
  { value: 'member', label: 'member' },
  { value: 'viewer', label: 'viewer' },
]

function statusTone(status: string): React.ComponentProps<typeof Badge>['tone'] {
  if (status === 'active' || status === 'approved') return 'ok'
  if (status === 'pending') return 'warn'
  if (status === 'suspended' || status === 'rejected') return 'err'
  return 'neutral'
}

export function UsersTable({ rows }: { rows: readonly AdminUserRow[] }) {
  const [pending, startTransition] = React.useTransition()
  const toast = useToast()

  const onRoleChange = React.useCallback(
    (userId: string, newRole: Role) => {
      startTransition(async () => {
        const result = await changeUserRole(userId, newRole)
        if ('error' in result) {
          toast.error(`Role 変更失敗: ${result.error}`)
        } else {
          toast.success('Role を変更しました')
        }
      })
    },
    [toast],
  )

  const columns = React.useMemo<ColumnDef<AdminUserRow>[]>(
    () => [
      {
        id: 'email',
        accessorKey: 'email',
        header: 'Email',
        enableSorting: true,
        cell: ({ row }) => (
          <Link href={`/admin/users/${row.original.id}`}>{row.original.email}</Link>
        ),
      },
      {
        id: 'role',
        accessorKey: 'role',
        header: 'Role',
        enableSorting: true,
        cell: ({ row }) => (
          <Select
            label={`Role for ${row.original.email}`}
            options={ROLE_OPTIONS as SelectOption[]}
            value={row.original.role}
            disabled={pending}
            onValueChange={(value) => onRoleChange(row.original.id, value as Role)}
          />
        ),
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: 'Status',
        enableSorting: true,
        cell: ({ row }) => (
          <Badge tone={statusTone(row.original.status)}>{row.original.status}</Badge>
        ),
      },
      {
        id: 'createdAt',
        accessorKey: 'createdAt',
        header: '作成日',
        enableSorting: true,
      },
    ],
    [pending, onRoleChange],
  )

  return (
    <DataTable<AdminUserRow>
      data={rows as AdminUserRow[]}
      columns={columns}
      caption="User 一覧"
      initialPagination={{ pageSize: PAGE_SIZE }}
      getRowTestId={() => 'user-row'}
      empty={
        <EmptyState
          title="User なし"
          description="登録ユーザーがありません (Supabase env 設定後に表示)。"
        />
      }
    />
  )
}
