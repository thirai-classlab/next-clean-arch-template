// apps/web/src/app/(admin)/layout.tsx
//
// Admin route-group layout. Currently passes children through unchanged —
// the root layout's AppShell still wraps every page (Sidebar + Topbar).
// task-5 (Auth + Admin Panel) will swap this for a dedicated admin shell
// (role badge, role-aware sidebar, audit log surface).

import type { ReactNode } from 'react'

// SECURITY (#8 HIGH): admin route group は必ず動的レンダリングし、Full Route Cache /
// bfcache に乗せない。`force-dynamic` は Next.js が応答に
// `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate` を付与するため、
// logout 後の「戻る」で admin UI (role badge / user 一覧 / audit log) が復元されない。
export const dynamic = 'force-dynamic'

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
