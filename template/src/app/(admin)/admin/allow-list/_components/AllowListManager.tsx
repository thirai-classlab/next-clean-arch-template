'use client'
// src/app/(admin)/admin/allow-list/_components/AllowListManager.tsx
// task-5 Step 5 — client island: allow-list CRUD (draft 08 §5.3).
// Add (Modal + Form) + remove (confirm) wired through the audited Server Actions
// addAllowList / removeAllowList. Renders the list via the Table compound.

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Table, type Column, Modal } from '@/components/ui/composite'
import { EmptyState, useToast } from '@/components/ui/feedback'
import { Btn } from '@/components/ui/Btn'
import { Input } from '@/components/ui/primitive/Input'
import { addAllowList, removeAllowList } from '../../_lib/admin-actions'
import type { AdminAllowedUserRow } from '../../_lib/admin-data'

export function AllowListManager({
  rows,
}: {
  rows: readonly AdminAllowedUserRow[]
}) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [email, setEmail] = React.useState('')
  const [pending, setPending] = React.useState(false)
  const toast = useToast()

  const onAdd = async () => {
    const value = email.trim()
    if (!value) {
      toast.warning('Email / domain を入力してください')
      return
    }
    setPending(true)
    try {
      const result = await addAllowList(value)
      if ('error' in result) {
        toast.error(`追加失敗: ${result.error}`)
      } else {
        toast.success('Allow list に追加しました')
        setEmail('')
        setOpen(false)
        // revalidatePath() in the Server Action only marks the route cache
        // stale on the server; an awaited action called from a plain event
        // handler (not <form action>) does NOT push the refreshed RSC payload
        // to the client. router.refresh() dispatches ACTION_REFRESH which
        // re-fetches the segment's RSC data so the new row appears without a
        // full page reload. (Next.js App Router data-mutation pattern.)
        router.refresh()
      }
    } finally {
      setPending(false)
    }
  }

  const onRemove = async (target: string) => {
    setPending(true)
    try {
      const result = await removeAllowList(target)
      if ('error' in result) {
        toast.error(`削除失敗: ${result.error}`)
      } else {
        toast.success('Allow list から削除しました')
        // Force the client to re-fetch the RSC tree so the removed row
        // disappears immediately (see onAdd note re: revalidatePath).
        router.refresh()
      }
    } finally {
      setPending(false)
    }
  }

  const columns: Column<AdminAllowedUserRow>[] = React.useMemo(
    () => [
      { key: 'email', header: 'Email / Domain' },
      { key: 'addedBy', header: '追加者' },
      { key: 'addedAt', header: '追加日' },
      {
        key: 'id',
        header: '',
        align: 'right',
        render: (_value, row) => (
          <Btn variant="danger" size="sm" disabled={pending} onClick={() => onRemove(row.email)}>
            削除
          </Btn>
        ),
      },
    ],
    [pending],
  )

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Btn variant="primary" onClick={() => setOpen(true)}>
          Allow list に追加
        </Btn>
      </div>

      <Table<AdminAllowedUserRow>
        columns={columns}
        data={rows as AdminAllowedUserRow[]}
        keyExtractor={(row) => row.id}
        caption="Allow list"
        empty={
          <EmptyState
            title="Allow list 空"
            description="@classlab.co.jp 以外を許可するには email / domain を追加します。"
          />
        }
      />

      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Allow list に追加"
        description="email (user@example.com) または domain (example.com) を入力します。"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setOpen(false)}>
              キャンセル
            </Btn>
            <Btn data-testid="allow-list-add-button" variant="primary" disabled={pending} onClick={onAdd}>
              追加
            </Btn>
          </>
        }
      >
        <Input
          data-testid="allow-list-email-input"
          label="Email / Domain"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@example.com or example.com"
        />
      </Modal>
    </>
  )
}
