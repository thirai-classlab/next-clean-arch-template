// apps/web/src/app/(admin)/admin/dev/components/_components/CategorySection.tsx
//
// Renders one of the 7 category groupings as a labelled section with a
// responsive card grid inside it.
//
// Changes in task-34 Step 3:
//   - Section id added (`category-section-<category>`) for sticky nav scroll-to
//   - Header expanded to include count badge + one-sentence category description
//   - Visual separation between sections strengthened (background tint + padding)
//
// Changes in task-34 R2-F5:
//   - APG Tabs Pattern: role="tabpanel" + aria-labelledby pointing to tab button id
//     (category-nav-tab-<category>) added to resolve axe-core aria-required-children

import type { ReactNode } from 'react'
import type { ComponentCatalogEntry, ComponentCategory } from '../_data/component-catalog'
import { CATEGORY_DESCRIPTIONS } from '../_data/component-catalog'

export interface CategorySectionProps {
  category: ComponentCategory
  /** Short display title (e.g. "Typography"). */
  label: string
  entries: ReadonlyArray<ComponentCatalogEntry>
  /** Renders each entry's preview / card body. Receives the entry verbatim. */
  renderCard: (entry: ComponentCatalogEntry) => ReactNode
}

export function CategorySection({ category, label, entries, renderCard }: CategorySectionProps) {
  // h2 element's own id — used as a URL anchor only.
  // APG Tabs Pattern: aria-labelledby MUST point to the tab button id (tabId),
  // NOT headingId. Do not change aria-labelledby to reference headingId.
  const headingId = `category-${category}`
  const sectionId = `category-section-${category}`
  // APG Tabs Pattern: tabpanel is labelled by its corresponding tab button.
  // CategoryNav renders <button id="category-nav-tab-${category}" role="tab" aria-controls={sectionId}>.
  const tabId = `category-nav-tab-${category}`
  const description = CATEGORY_DESCRIPTIONS[category]

  return (
    <section
      id={sectionId}
      role="tabpanel"
      aria-labelledby={tabId}
      tabIndex={0} // APG Tabs Pattern: tabpanel must be focusable when no focusable first child
      data-testid="category-section"
      data-category={category}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4)',
        paddingTop: 'var(--space-4)',
        scrollMarginTop: '60px', // compensate for sticky nav height
      }}
    >
      <header
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-2)',
          paddingBottom: 'var(--space-3)',
          borderBottom: '2px solid var(--color-border)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 'var(--space-3)',
          }}
        >
          {/* eslint-disable-next-line local/no-raw-heading-tag -- dev gallery: token-styled section heading with anchor id, not the Chakra Heading recipe. */}
          <h2
            id={headingId}
            style={{
              margin: 0,
              fontSize: 'var(--text-xl)',
              fontWeight: 'var(--weight-semibold)',
              color: 'var(--color-fg-default)',
            }}
          >
            {label}
          </h2>
          <span
            data-testid="category-count"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '1px 8px',
              borderRadius: '999px',
              background: 'var(--color-bg-sunken)',
              border: '1px solid var(--color-border)',
              fontSize: 'var(--text-xs)',
              fontWeight: 'var(--weight-medium)',
              color: 'var(--color-fg-muted)',
              whiteSpace: 'nowrap',
            }}
          >
            {entries.length} component{entries.length === 1 ? '' : 's'}
          </span>
        </div>

        <p
          data-testid="category-description"
          style={{
            margin: 0,
            fontSize: 'var(--text-sm)',
            color: 'var(--color-fg-muted)',
            lineHeight: 1.6,
            maxWidth: '72ch',
          }}
        >
          {description}
        </p>
      </header>

      <div
        data-testid="category-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))',
          gap: 'var(--space-3)',
        }}
      >
        {entries.map((entry) => (
          <div key={entry.id}>{renderCard(entry)}</div>
        ))}
      </div>
    </section>
  )
}
