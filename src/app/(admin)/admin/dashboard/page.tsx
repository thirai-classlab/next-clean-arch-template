// src/app/(admin)/admin/dashboard/page.tsx
// task-5 Step 5 — Admin dashboard (KPI cards). Server Component.
// Gates on admin role server-side; renders placeholder metrics when Supabase
// env is unset (draft 08 §5.6).
//
// F-04 fix: replaced local StatCard inline definition with composite/StatCard
// (Chakra v3 Card + Stat semantics, dark-mode adaptive via semantic tokens).

import type { Metadata } from 'next'
import { Grid } from '@/components/ui/layout'
import { StatCard } from '@/components/ui/composite'
import { requireAdminPage } from '../_lib/require-admin-page'
import { loadDashboardMetrics } from '../_lib/admin-data'
import { AdminPageShell } from '../_components/AdminPageShell'

export const metadata: Metadata = {
  title: 'Dashboard — Admin',
}

export default async function AdminDashboardPage() {
  const { envDeferred } = await requireAdminPage()
  const { data } = await loadDashboardMetrics()

  return (
    <AdminPageShell
      title="Dashboard"
      sub="管理者向け KPI。総 user 数 / 承認待ち / 直近の audit / role 分布。"
      envDeferred={envDeferred}
    >
      <Grid cols={4} gap={16} responsive={false}>
        <StatCard label="総 User 数" value={data.totalUsers} />
        <StatCard
          label="承認待ち"
          value={data.pendingUsers}
          helperText="pending-approvals で対応"
        />
        <StatCard label="直近 30 日 audit" value={data.recentAuditCount} />
        <StatCard
          label="Role 分布"
          value={`${data.roleDistribution.admin} / ${data.roleDistribution.member} / ${data.roleDistribution.viewer}`}
          helperText="admin / member / viewer"
        />
      </Grid>
    </AdminPageShell>
  )
}
