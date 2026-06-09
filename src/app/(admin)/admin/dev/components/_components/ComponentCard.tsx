// apps/web/src/app/(admin)/admin/dev/components/_components/ComponentCard.tsx
//
// Single-component card on the dev gallery. Receives the catalog entry and
// the rendered preview as a slot — keeping render logic for the 50 previews
// in GalleryClient (one place to import + render) while this surface stays
// pure presentation.
//
// Changes in task-34 R2-F5:
//   - preview minHeight 80px → 120px, maxHeight 240px + overflow auto
//     (M-J: AlertPreview 等大きい preview の card 高さ統一、grid auto-fill との相性改善)
//
// Changes (provider badge + reference link):
//   - ProviderBadge: Chakra v3 (blue) / Chakra partial (teal) / Custom (gray)
//   - ExternalLink icon links to official Chakra docs when referenceUrl is set

import type { ReactNode } from 'react'
import type { ComponentCatalogEntry, ComponentProvider } from '../_data/component-catalog'

// ─── Provider badge styles ────────────────────────────────────────────────────

interface ProviderBadgeConfig {
  label: string
  background: string
  color: string
  borderColor: string
}

const PROVIDER_BADGE: Record<ComponentProvider, ProviderBadgeConfig> = {
  chakra: {
    label: 'Chakra v3 公式',
    background: 'var(--color-accent-subtle)',
    color: 'var(--color-accent-text)',
    borderColor: 'var(--color-accent)',
  },
  'chakra-partial': {
    label: 'Chakra (部分的)',
    background: 'color-mix(in srgb, var(--color-accent-subtle) 60%, transparent)',
    color: 'var(--color-accent-text)',
    borderColor: 'color-mix(in srgb, var(--color-accent) 60%, transparent)',
  },
  custom: {
    label: 'カスタム',
    background: 'var(--color-bg-elevated)',
    color: 'var(--color-fg-muted)',
    borderColor: 'var(--color-border)',
  },
}

interface ProviderBadgeProps {
  provider: ComponentProvider
  referenceUrl?: string
}

function ProviderBadge({ provider, referenceUrl }: ProviderBadgeProps) {
  const config = PROVIDER_BADGE[provider]

  return (
    <span
      data-testid="component-card-provider"
      data-provider={provider}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 8px',
        borderRadius: 'var(--radius-sm)',
        border: `1px solid ${config.borderColor}`,
        background: config.background,
        fontSize: 'var(--text-xs)',
        color: config.color,
        whiteSpace: 'nowrap',
      }}
    >
      <span aria-label={`provider: ${config.label}`}>{config.label}</span>
      {referenceUrl && (
        <a
          href={referenceUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${config.label} 公式リファレンス (新しいタブで開く)`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            color: 'inherit',
            opacity: 0.75,
            textDecoration: 'none',
          }}
        >
          {/* External link icon (12×12 SVG — no extra dependency) */}
          <svg
            aria-hidden="true"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ flexShrink: 0 }}
          >
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </a>
      )}
    </span>
  )
}

export interface ComponentCardProps {
  entry: ComponentCatalogEntry
  /** Rendered visual preview. Required for implemented entries; omit for placeholders. */
  preview?: ReactNode
}

// ─── Status badge styles ──────────────────────────────────────────────────────

interface StatusBadgeConfig {
  label: string
  background: string
}

const STATUS_BADGE: Record<string, StatusBadgeConfig> = {
  implemented: {
    label: '✅ 実装済',
    background: 'var(--color-success-subtle)',
  },
  placeholder: {
    label: '🚧 placeholder',
    background: 'var(--color-warning-subtle)',
  },
  'official-only': {
    label: '📚 公式のみ',
    background: 'color-mix(in srgb, var(--color-accent-subtle) 40%, transparent)',
  },
}

export function ComponentCard({ entry, preview }: ComponentCardProps) {
  const isPlaceholder = entry.status === 'placeholder'
  const isOfficialOnly = entry.status === 'official-only'
  const statusConfig = STATUS_BADGE[entry.status] ?? STATUS_BADGE['placeholder']
  const phaseLabel =
    entry.phase === 'future'
      ? 'future'
      : entry.phase === 'chakra-v3'
        ? 'Chakra v3 公式'
        : `Phase ${entry.phase}`

  return (
    <article
      data-testid="component-card"
      data-entry-id={entry.id}
      data-status={entry.status}
      data-category={entry.category}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        background: 'var(--color-bg-elevated)',
        padding: 'var(--space-4)',
        // Dim official-only cards to visually distinguish from implemented
        // Stage 1: opacity reduced from 0.65 to 0.85 now that real previews are rendered
        opacity: isOfficialOnly ? 0.85 : 1,
        transition: 'opacity 150ms',
      }}
      // Restore full opacity on hover so reference links remain easily readable
      onMouseEnter={
        isOfficialOnly
          ? (e) => {
              ;(e.currentTarget as HTMLElement).style.opacity = '1'
            }
          : undefined
      }
      onMouseLeave={
        isOfficialOnly
          ? (e) => {
              ;(e.currentTarget as HTMLElement).style.opacity = '0.85'
            }
          : undefined
      }
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 'var(--space-3)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
          {/* eslint-disable-next-line local/no-raw-heading-tag -- dev gallery: token-styled component-card heading, not the Chakra Heading recipe. */}
          <h3
            style={{
              margin: 0,
              fontSize: 'var(--text-md)',
              fontWeight: 'var(--weight-semibold)',
              color: 'var(--color-fg-default)',
            }}
          >
            {entry.name}
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: 'var(--text-sm)',
              color: 'var(--color-fg-muted)',
            }}
          >
            {entry.description}
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 'var(--space-1)' }}>
          <span
            data-testid="component-card-status"
            aria-label={`status: ${statusConfig.label}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '2px 8px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              background: statusConfig.background,
              fontSize: 'var(--text-xs)',
              color: 'var(--color-fg-default)',
              whiteSpace: 'nowrap',
            }}
          >
            {statusConfig.label}
          </span>
          <ProviderBadge provider={entry.provider} referenceUrl={entry.referenceUrl} />
          <span
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--color-fg-muted)',
            }}
          >
            {phaseLabel}
          </span>
        </div>
      </header>

      <section
        data-testid="component-card-preview"
        aria-label={`${entry.name} preview`}
        // tabIndex={0} is required by WCAG 2.1.1/2.1.3 (scrollable-region-focusable):
        // overflow:auto makes this element potentially scrollable, so it must be
        // keyboard-reachable. The dev-only gallery is the only consumer; this is
        // not a production user-facing element, but axe-core still enforces the rule.
        tabIndex={0}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '120px',
          maxHeight: '240px',
          overflow: 'auto',
          padding: 'var(--space-3)',
          background: 'var(--color-bg-sunken)',
          borderRadius: 'var(--radius-sm)',
          border: '1px dashed var(--color-border)',
        }}
      >
        {isPlaceholder ? (
          <span
            style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--color-fg-muted)',
              fontStyle: 'italic',
            }}
          >
            🚧 未実装 — task-5 (Auth + Admin Panel) / future expansion で実装予定
          </span>
        ) : preview ? (
          // Render real preview (implemented or official-only with preview registered)
          preview
        ) : isOfficialOnly ? (
          // Fallback for official-only entries that have no preview registered yet
          <span
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 'var(--space-2)',
              fontSize: 'var(--text-sm)',
              color: 'var(--color-fg-muted)',
              fontStyle: 'italic',
              textAlign: 'center',
            }}
          >
            <span>📚 Chakra UI v3 公式 component</span>
            {entry.referenceUrl && (
              <a
                href={entry.referenceUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${entry.name} Chakra UI 公式 docs を新しいタブで開く`}
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-accent-text)',
                  textDecoration: 'underline',
                }}
              >
                公式 docs を見る
              </a>
            )}
          </span>
        ) : (
          <span
            style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--color-fg-muted)',
            }}
          >
            (プレビューなし)
          </span>
        )}
      </section>

      <pre
        data-testid="component-card-snippet"
        style={{
          margin: 0,
          padding: 'var(--space-3)',
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--text-xs)',
          lineHeight: 1.5,
          overflowX: 'auto',
          background: 'var(--color-bg-sunken)',
          color: 'var(--color-fg-default)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--color-border)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        <code>{entry.snippet}</code>
      </pre>
    </article>
  )
}
