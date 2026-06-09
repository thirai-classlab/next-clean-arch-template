// apps/web/src/app/(admin)/admin/dev/components/page.tsx
//
// Component Library Gallery — 51 components visualized on one page for
// admin-only developer reference. See task-4 Step 3 (component-library-phase-c).
//
// Routing notes:
//   - URL: /admin/dev/components  (route group `(admin)` is pass-through)
//   - Auth: enforced by apps/web/src/middleware.ts via decideMiddleware()
//     rules. Requires an admin session (real Supabase admin, or a
//     mock_session=admin cookie under MOCK_MODE).
//
// This file is a Server Component; the interactive gallery (with state for
// the category filter + Modal / Drawer / Toast triggers) is mounted via the
// `<GalleryClient />` client island.

import type { Metadata } from 'next'
import { GalleryClient } from './_components/GalleryClient'
import { CATALOG_SUMMARY } from './_data/component-catalog'

export const metadata: Metadata = {
  title: 'Component Library Gallery — recall_poc dev',
  description:
    '51 component visual gallery (Phase A typography + primitive, Phase B composite, Phase C feedback + layout + domain, Nav/Shell placeholders).',
}

export default function ComponentsGalleryPage() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-6)',
        width: '100%',
        maxWidth: '1280px',
        marginInline: 'auto',
      }}
    >
      <header
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-2)',
          paddingBottom: 'var(--space-4)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        {/* eslint-disable-next-line local/no-raw-heading-tag -- dev gallery: token-styled page title, not the Chakra Heading recipe. */}
        <h1
          style={{
            margin: 0,
            fontSize: 'var(--text-3xl)',
            fontWeight: 'var(--weight-bold)',
            color: 'var(--color-fg-default)',
          }}
        >
          Component ライブラリ ギャラリー
        </h1>
        <p
          style={{
            margin: 0,
            fontSize: 'var(--text-md)',
            color: 'var(--color-fg-muted)',
          }}
        >
          {CATALOG_SUMMARY.implemented} / {CATALOG_SUMMARY.total} 実装済 (Phase A:{' '}
          {CATALOG_SUMMARY.byPhase.A} / Phase B: {CATALOG_SUMMARY.byPhase.B} / Phase C:{' '}
          {CATALOG_SUMMARY.byPhase.C}、Nav/Shell {CATALOG_SUMMARY.byPhase.future} placeholder)
        </p>
        <p
          style={{
            margin: 0,
            fontSize: 'var(--text-sm)',
            color: 'var(--color-fg-subtle)',
          }}
        >
          内部開発者向け reference。各 card で visual preview + copy/paste 可能な TSX snippet を表示。
        </p>
      </header>

      <GalleryClient />
    </div>
  )
}
