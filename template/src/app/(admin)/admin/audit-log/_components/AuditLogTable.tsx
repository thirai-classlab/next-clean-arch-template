'use client'
// src/app/(admin)/admin/audit-log/_components/AuditLogTable.tsx
// task-5 Step 5 — client island rendering the audit-log Table (read-only).
// The Table compound uses React context/hooks, so it must render in a Client
// Component. Data is passed down from the Server Component page.

import * as React from 'react'
import { Table, type Column } from '@/components/ui/composite'
import { EmptyState } from '@/components/ui/feedback'
import type { AdminAuditLogRow } from '../../_lib/admin-data'

const PAGE_SIZE = 50

const columns: Column<AdminAuditLogRow>[] = [
  { key: 'createdAt', header: '日時' },
  { key: 'actorId', header: 'Actor' },
  { key: 'action', header: 'Action' },
  { key: 'targetType', header: 'Target Type' },
  { key: 'targetId', header: 'Target ID' },
]

export function AuditLogTable({ rows }: { rows: readonly AdminAuditLogRow[] }) {
  const [page, setPage] = React.useState(1)
  const start = (page - 1) * PAGE_SIZE
  const pageRows = rows.slice(start, start + PAGE_SIZE)

  return (
    <Table<AdminAuditLogRow>
      columns={columns}
      data={pageRows as AdminAuditLogRow[]}
      keyExtractor={(row) => row.id}
      getRowTestId={() => 'audit-log-row'}
      caption="Audit log (直近 30 日)"
      empty={
        <EmptyState
          title="Audit log なし"
          description="記録された監査ログがありません。管理操作 (role 変更 / allow-list 追加 等) を実行すると表示されます。"
        />
      }
      pagination={{
        current: page,
        total: rows.length,
        pageSize: PAGE_SIZE,
        onPageChange: setPage,
      }}
    />
  )
}
