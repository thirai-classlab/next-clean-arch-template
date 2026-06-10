'use client'

// apps/web/src/app/(admin)/admin/dev/components/_components/CategoryNav.tsx
//
// Sticky top-tab navigation for the component gallery.
// Renders one tab per category. Active tab tracks scroll position via
// IntersectionObserver — clicking a tab calls onSelectCategory which triggers
// scroll in the parent (GalleryClient).
//
// Accessibility:
//   - role="tablist" with aria-label
//   - Each button carries role="tab" + aria-selected + aria-controls (pointing
//     to the matching section id `category-section-<category>`)
//   - aria-current="true" mirrors aria-selected for landmark navigation
//   - focus-visible outline via CSS class (see .category-nav-tab:focus-visible)
//   - APG Tabs Pattern: roving tabindex (active=0, others=-1) + Arrow/Home/End keyboard nav

import * as React from 'react'
import {
  CATEGORY_ORDER,
  CATEGORY_LABELS,
  type ComponentCategory,
} from '../_data/component-catalog'

export interface CategoryNavProps {
  /** Currently active (visible in viewport) category. null → defaults to CATEGORY_ORDER[0]. */
  activeCategory: ComponentCategory | null
  /** Callback to programmatically activate a category (scroll-to). */
  onSelectCategory: (category: ComponentCategory) => void
}

export function CategoryNav({ activeCategory, onSelectCategory }: CategoryNavProps) {
  const effectiveActive: ComponentCategory = activeCategory ?? CATEGORY_ORDER[0]

  // Scoped ref to the tablist container — used for querySelector-based focus
  // to avoid global document.getElementById which risks collision when multiple
  // CategoryNav instances are rendered on the same page.
  const tablistRef = React.useRef<HTMLDivElement>(null)

  // APG Tabs Pattern: Arrow/Home/End keyboard navigation on the tablist.
  // After updating the active category, move DOM focus to the newly active tab button.
  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return
    e.preventDefault()

    const currentIndex = CATEGORY_ORDER.indexOf(effectiveActive)
    let nextIndex: number

    switch (e.key) {
      case 'ArrowLeft':
        nextIndex = currentIndex === 0 ? CATEGORY_ORDER.length - 1 : currentIndex - 1
        break
      case 'ArrowRight':
        nextIndex = currentIndex === CATEGORY_ORDER.length - 1 ? 0 : currentIndex + 1
        break
      case 'Home':
        nextIndex = 0
        break
      case 'End':
        nextIndex = CATEGORY_ORDER.length - 1
        break
      default:
        return
    }

    const nextCategory = CATEGORY_ORDER[nextIndex]
    onSelectCategory(nextCategory)

    // Move DOM focus to the newly active tab button.
    // Use tablistRef-scoped querySelector instead of global document.getElementById
    // to prevent multi-instance race conditions.
    const nextTab = tablistRef.current?.querySelector<HTMLButtonElement>(
      `[id="category-nav-tab-${nextCategory}"]`,
    )
    nextTab?.focus()
  }

  return (
    <>
      <style>{`.category-nav-tab:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }`}</style>
      <nav
        aria-label="Component ギャラリー カテゴリナビゲーション"
        data-testid="category-nav"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          background: 'var(--color-bg-base)',
          borderBottom: '1px solid var(--color-border)',
          paddingBlock: 'var(--space-2)',
        }}
      >
        <div
          ref={tablistRef}
          role="tablist"
          aria-label="カテゴリタブ"
          onKeyDown={handleKeyDown}
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 'var(--space-1)',
            paddingInline: 'var(--space-2)',
            maxWidth: '1280px',
            marginInline: 'auto',
          }}
        >
          {CATEGORY_ORDER.map((category) => {
            const isActive = category === effectiveActive
            return (
              <CategoryNavTab
                key={category}
                category={category}
                label={CATEGORY_LABELS[category]}
                isActive={isActive}
                onSelect={onSelectCategory}
              />
            )
          })}
        </div>
      </nav>
    </>
  )
}

interface CategoryNavTabProps {
  category: ComponentCategory
  label: string
  isActive: boolean
  onSelect: (category: ComponentCategory) => void
}

function CategoryNavTab({ category, label, isActive, onSelect }: CategoryNavTabProps) {
  // Scroll responsibility is delegated to GalleryClient (parent).
  // Do NOT call scrollIntoView here to avoid double-scroll (F-M-01).
  const handleClick = React.useCallback(() => {
    onSelect(category)
  }, [category, onSelect])

  return (
    <button
      id={`category-nav-tab-${category}`}
      type="button"
      role="tab"
      aria-selected={isActive}
      aria-controls={`category-section-${category}`}
      aria-current={isActive ? 'true' : undefined}
      data-testid={`category-nav-tab-${category}`}
      data-active={isActive ? 'true' : 'false'}
      className="category-nav-tab"
      // APG Tabs Pattern roving tabindex: active tab is Tab-focusable (0),
      // inactive tabs are skipped by Tab key and reachable via Arrow keys only (-1).
      tabIndex={isActive ? 0 : -1}
      onClick={handleClick}
      style={{
        padding: '4px 14px',
        borderRadius: 'var(--radius-sm)',
        border: `1px solid ${isActive ? 'var(--color-accent)' : 'transparent'}`,
        background: isActive ? 'var(--color-accent-subtle)' : 'transparent',
        color: isActive ? 'var(--color-accent-text)' : 'var(--color-fg-muted)',
        fontSize: 'var(--text-sm)',
        fontWeight: isActive ? 'var(--weight-semibold)' : 'var(--weight-regular)',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'background 150ms, color 150ms, border-color 150ms',
      }}
    >
      {label}
    </button>
  )
}
