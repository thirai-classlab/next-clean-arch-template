// src/app/(admin)/admin/allow-list/page.tsx
// task-5 Step 5 — Allow list CRUD (draft 08 §5.3). Server Component.

import type { Metadata } from 'next'
import { requireAdminPage } from '../_lib/require-admin-page'
import { loadAllowList } from '../_lib/admin-data'
import { AdminPageShell } from '../_components/AdminPageShell'
import { AllowListManager } from './_components/AllowListManager'

export const metadata: Metadata = {
  title: 'Allow List — Admin',
}

export default async function AdminAllowListPage() {
  const { envDeferred } = await requireAdminPage()
  const { data } = await loadAllowList()

  return (
    <AdminPageShell
      title="Allow List"
      sub="@classlab.co.jp 以外で自動 active を許可する email / domain。追加・削除は audit log に記録。"
      envDeferred={envDeferred}
    >
      <AllowListManager rows={data} />
    </AdminPageShell>
  )
}
