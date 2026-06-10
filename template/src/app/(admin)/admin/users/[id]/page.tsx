// src/app/(admin)/admin/users/[id]/page.tsx
// task-5 Step 5 — User detail + role change (draft 08 §5.2). Server Component.
//
// Next.js 14: `params` is a plain object (NOT a Promise — that is Next 15+).
// Looks up the user from the list loader (no single-user loader exists until
// Step 3); when env-deferred / not found, renders a placeholder detail card.

import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Card } from '@/components/ui/Card'
import { Stack } from '@/components/ui/layout'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/feedback'
import type { Role } from '@/lib/domain/value-objects/role'
import { requireAdminPage } from '../../_lib/require-admin-page'
import { loadUsers, type AdminUserRow } from '../../_lib/admin-data'
import { AdminPageShell } from '../../_components/AdminPageShell'
import { UserRoleControl } from './_components/UserRoleControl'

export const metadata: Metadata = {
  title: 'User Detail — Admin',
}

interface FieldProps {
  label: string
  value: ReactNode
}

function Field({ label, value }: FieldProps) {
  return (
    <div style={{ display: 'flex', gap: 12, fontSize: 13 }}>
      <span style={{ width: 120, color: 'var(--color-fg-muted)' }}>{label}</span>
      <span>{value}</span>
    </div>
  )
}

export default async function AdminUserDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const { envDeferred } = await requireAdminPage()
  const { data } = await loadUsers()
  const user: AdminUserRow | undefined = data.find((u) => u.id === params.id)

  return (
    <AdminPageShell
      title="User Detail"
      sub={`User ID: ${params.id}`}
      envDeferred={envDeferred}
    >
      {user ? (
        <Card>
          <Stack gap={16}>
            <Field label="Email" value={user.email} />
            <Field label="Status" value={<Badge>{user.status}</Badge>} />
            <Field label="作成日" value={user.createdAt} />
            <Field
              label="Role"
              value={<UserRoleControl userId={user.id} currentRole={user.role as Role} />}
            />
          </Stack>
        </Card>
      ) : (
        <Card>
          <EmptyState
            title="User が見つかりません"
            description="この ID のユーザーは未取得です (Supabase env 設定後に取得・表示されます)。"
          />
        </Card>
      )}
    </AdminPageShell>
  )
}
