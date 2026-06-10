// src/app/(admin)/admin/users/page.tsx
// task-5 Step 5 — User list + inline role change (draft 08 §5.1 / §5.2).
// Server Component: gates on admin, loads users, delegates interactivity to the
// UsersTable client island.

import type { Metadata } from 'next'
import { requireAdminPage } from '../_lib/require-admin-page'
import { loadUsers } from '../_lib/admin-data'
import { AdminPageShell } from '../_components/AdminPageShell'
import { UsersTable } from './_components/UsersTable'

export const metadata: Metadata = {
  title: 'Users — Admin',
}

export default async function AdminUsersPage() {
  const { envDeferred } = await requireAdminPage()
  const { data } = await loadUsers()

  return (
    <AdminPageShell
      title="Users"
      sub="ユーザー一覧。role の切替は即時 audit log に記録される。"
      envDeferred={envDeferred}
    >
      <UsersTable rows={data} />
    </AdminPageShell>
  )
}
