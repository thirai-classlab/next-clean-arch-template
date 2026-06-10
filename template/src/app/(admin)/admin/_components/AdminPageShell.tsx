// src/app/(admin)/admin/_components/AdminPageShell.tsx
// task-5 Step 5 — shared chrome for the admin panel pages.
// Server Component: title + subtitle (reusing PageHeader) + an optional
// "env-deferred" notice when data could not be loaded (Supabase not wired yet).

import type { ReactNode } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { NoteBanner } from '@/components/ui/NoteBanner'

export interface AdminPageShellProps {
  title: string
  sub?: string
  /** Right-aligned header slot (e.g. an "Add" action). */
  right?: ReactNode
  /** When true, render a banner explaining placeholder data (Supabase unset). */
  envDeferred?: boolean
  children: ReactNode
}

export function AdminPageShell({
  title,
  sub,
  right,
  envDeferred,
  children,
}: AdminPageShellProps) {
  return (
    <div className="recall-page" style={{ width: '100%', maxWidth: 1280, marginInline: 'auto' }}>
      <PageHeader title={title} sub={sub} right={right} />
      {envDeferred ? (
        <div style={{ marginBottom: 16 }}>
          <NoteBanner kind="info">
            Supabase 環境変数が未設定のため、プレースホルダ表示です。Step 3
            (DB schema + RLS) を apply し env を設定すると実データが表示されます。
          </NoteBanner>
        </div>
      ) : null}
      {children}
    </div>
  )
}
