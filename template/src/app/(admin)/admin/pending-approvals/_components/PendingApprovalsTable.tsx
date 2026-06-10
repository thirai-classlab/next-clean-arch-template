'use client'
// src/app/(admin)/admin/pending-approvals/_components/PendingApprovalsTable.tsx
// task-5 Step 5 — client island: pending user approve / reject (draft 08 §5.7).
// Wired through the audited approveUser / rejectUser Server Actions.

import * as React from 'react'
import { Table, type Column } from '@/components/ui/composite'
import { EmptyState, useToast } from '@/components/ui/feedback'
import { Btn } from '@/components/ui/Btn'
import { approveUser, rejectUser } from '../../_lib/admin-actions'
import type { AdminUserRow } from '../../_lib/admin-data'

const REJECT_REASON = 'rejected via admin panel'

export function PendingApprovalsTable({
  rows,
}: {
  rows: readonly AdminUserRow[]
}) {
  const [pending, startTransition] = React.useTransition()
  const toast = useToast()

  const onApprove = (userId: string) => {
    startTransition(async () => {
      const result = await approveUser(userId)
      if ('error' in result) toast.error(`承認失敗: ${result.error}`)
      else toast.success('ユーザーを承認しました')
    })
  }

  const onReject = (userId: string) => {
    startTransition(async () => {
      const result = await rejectUser(userId, REJECT_REASON)
      if ('error' in result) toast.error(`拒否失敗: ${result.error}`)
      else toast.success('ユーザーを拒否しました')
    })
  }

  const columns: Column<AdminUserRow>[] = React.useMemo(
    () => [
      { key: 'email', header: 'Email' },
      { key: 'createdAt', header: '申請日' },
      {
        key: 'id',
        header: '',
        align: 'right',
        render: (_value, row) => (
          <span style={{ display: 'inline-flex', gap: 8 }}>
            <Btn variant="primary" size="sm" disabled={pending} onClick={() => onApprove(row.id)}>
              承認
            </Btn>
            <Btn variant="danger" size="sm" disabled={pending} onClick={() => onReject(row.id)}>
              拒否
            </Btn>
          </span>
        ),
      },
    ],
    [pending],
  )

  return (
    <Table<AdminUserRow>
      columns={columns}
      data={rows as AdminUserRow[]}
      keyExtractor={(row) => row.id}
      caption="承認待ちユーザー"
      empty={
        <EmptyState
          title="承認待ちなし"
          description="承認待ちのユーザーはいません。"
        />
      }
    />
  )
}
