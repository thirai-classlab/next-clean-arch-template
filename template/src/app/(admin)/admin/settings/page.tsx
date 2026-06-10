// src/app/(admin)/admin/settings/page.tsx
// task-5 Step 5 — Organization settings (draft 08 §5.5). Server Component.
// The updateSettings Server Action is a typed stub (Step 5 cont.: needs the
// organization_settings migration, draft 08 L-03), so this page renders the
// current settings read-only with a note.

import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Card } from '@/components/ui/Card'
import { Stack } from '@/components/ui/layout'
import { Badge } from '@/components/ui/Badge'
import { NoteBanner } from '@/components/ui/NoteBanner'
import { requireAdminPage } from '../_lib/require-admin-page'
import { loadOrgSettings } from '../_lib/admin-data'
import { AdminPageShell } from '../_components/AdminPageShell'

export const metadata: Metadata = {
  title: 'Settings — Admin',
}

interface SettingRowProps {
  label: string
  value: ReactNode
}

function SettingRow({ label, value }: SettingRowProps) {
  return (
    <div style={{ display: 'flex', gap: 12, fontSize: 13, alignItems: 'center' }}>
      <span style={{ width: 200, color: 'var(--color-fg-muted)' }}>{label}</span>
      <span>{value}</span>
    </div>
  )
}

export default async function AdminSettingsPage() {
  const { envDeferred } = await requireAdminPage()
  const { data } = await loadOrgSettings()

  return (
    <AdminPageShell
      title="Settings"
      sub="組織設定 (許可ドメイン / セッションタイムアウト / 承認要否)。編集は Step 5 cont. で実装。"
      envDeferred={envDeferred}
    >
      <Stack gap={16}>
        <NoteBanner kind="warn">
          設定編集 (updateSettings) は organization_settings migration 待ちの typed stub
          です (draft 08 L-03 / Step 5 cont.)。現在は read-only 表示です。
        </NoteBanner>
        <Card>
          <Stack gap={16}>
            <SettingRow
              label="許可ドメイン"
              value={data.allowedDomains.map((d) => (
                <Badge key={d}>{d}</Badge>
              ))}
            />
            <SettingRow
              label="セッションタイムアウト"
              value={`${data.sessionTimeoutMinutes} 分`}
            />
            <SettingRow
              label="承認必須"
              value={
                <Badge tone={data.pendingApprovalRequired ? 'warn' : 'ok'}>
                  {data.pendingApprovalRequired ? 'ON' : 'OFF'}
                </Badge>
              }
            />
          </Stack>
        </Card>
      </Stack>
    </AdminPageShell>
  )
}
