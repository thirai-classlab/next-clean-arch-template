// src/app/(admin)/admin/pending-approvals/page.tsx
// task-5 Step 5 — Pending user approval (draft 08 §5.7). Server Component.

import type { Metadata } from 'next'
import { requireAdminPage } from '../_lib/require-admin-page'
import { loadPendingUsers } from '../_lib/admin-data'
import { AdminPageShell } from '../_components/AdminPageShell'
import { PendingApprovalsTable } from './_components/PendingApprovalsTable'

export const metadata: Metadata = {
  title: 'Pending Approvals — Admin',
}

export default async function AdminPendingApprovalsPage() {
  const { envDeferred } = await requireAdminPage()
  const { data } = await loadPendingUsers()

  return (
    <AdminPageShell
      title="Pending Approvals"
      sub="承認待ちユーザーの承認 / 拒否。操作は audit log に記録される。"
      envDeferred={envDeferred}
    >
      <PendingApprovalsTable rows={data} />
    </AdminPageShell>
  )
}
