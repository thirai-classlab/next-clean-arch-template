// src/app/(admin)/admin/audit-log/page.tsx
// task-5 Step 5 — Audit log viewer (draft 08 §5.4). Server Component.
// CSV export is stubbed (exportAuditLog action → Step 7).

import type { Metadata } from 'next'
import { requireAdminPage } from '../_lib/require-admin-page'
import { loadAuditLogs } from '../_lib/admin-data'
import { AdminPageShell } from '../_components/AdminPageShell'
import { AuditLogTable } from './_components/AuditLogTable'

export const metadata: Metadata = {
  title: 'Audit Log — Admin',
}

export default async function AdminAuditLogPage() {
  const { envDeferred } = await requireAdminPage()
  const { data } = await loadAuditLogs()

  return (
    <AdminPageShell
      title="Audit Log"
      sub="監査ログ。全 mutation が actor / action / target で記録される。CSV export は Step 7。"
      envDeferred={envDeferred}
    >
      <AuditLogTable rows={data} />
    </AdminPageShell>
  )
}
