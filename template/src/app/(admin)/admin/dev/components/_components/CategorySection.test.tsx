import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { CategorySection } from './CategorySection'
import { CATEGORY_DESCRIPTIONS } from '../_data/component-catalog'
import type { ComponentCatalogEntry } from '../_data/component-catalog'

const entries: ReadonlyArray<ComponentCatalogEntry> = Object.freeze([
  {
    id: 'heading',
    name: 'Heading',
    category: 'typography',
    status: 'implemented',
    phase: 'A',
    snippet: '<Heading level={1}>x</Heading>',
    description: 'Semantic h1-h6.',
    provider: 'chakra',
  },
  {
    id: 'text',
    name: 'Text',
    category: 'typography',
    status: 'implemented',
    phase: 'A',
    snippet: '<Text>x</Text>',
    description: 'Body text.',
    provider: 'chakra',
  },
])

describe('CategorySection', () => {
  it('renders the section header with the provided label', () => {
    render(
      <CategorySection
        category="typography"
        label="Typography (4)"
        entries={entries}
        renderCard={(entry) => <span>{entry.name}</span>}
      />,
    )
    expect(screen.getByText('Typography (4)')).toBeInTheDocument()
  })

  it('wires aria-labelledby to the tab button id for APG Tabs Pattern', () => {
    render(
      <CategorySection
        category="typography"
        label="Typography (4)"
        entries={entries}
        renderCard={(entry) => <span>{entry.name}</span>}
      />,
    )
    const section = screen.getByTestId('category-section')
    // APG Tabs Pattern: tabpanel aria-labelledby points to the tab button id,
    // not the internal heading id. CategoryNav sets id="category-nav-tab-<category>".
    const labelledBy = section.getAttribute('aria-labelledby')
    expect(labelledBy).toBe('category-nav-tab-typography')
  })

  it('has role="tabpanel" and aria-labelledby for APG Tabs Pattern', () => {
    render(
      <CategorySection
        category="typography"
        label="Typography"
        entries={entries}
        renderCard={(entry) => <span>{entry.name}</span>}
      />,
    )
    const section = screen.getByTestId('category-section')
    expect(section).toHaveAttribute('role', 'tabpanel')
    expect(section).toHaveAttribute('aria-labelledby', 'category-nav-tab-typography')
  })

  it('tabpanel has tabIndex=0 (APG Tabs Pattern keyboard accessibility)', () => {
    render(
      <CategorySection
        category="typography"
        label="Typography"
        entries={entries}
        renderCard={(entry) => <span>{entry.name}</span>}
      />,
    )
    const section = screen.getByTestId('category-section')
    // APG Tabs Pattern: tabpanel must have tabindex="0" so keyboard users can
    // focus the panel content area when no focusable first child is present.
    expect(section).toHaveAttribute('tabindex', '0')
  })

  it('renders one card per entry via renderCard', () => {
    render(
      <CategorySection
        category="typography"
        label="Typography"
        entries={entries}
        renderCard={(entry) => <span data-testid="render-slot">{entry.name}</span>}
      />,
    )
    const grid = screen.getByTestId('category-grid')
    expect(within(grid).getAllByTestId('render-slot')).toHaveLength(2)
  })

  it('shows the entry count in the header', () => {
    render(
      <CategorySection
        category="typography"
        label="Typography"
        entries={entries}
        renderCard={(entry) => <span>{entry.name}</span>}
      />,
    )
    expect(screen.getByText('2 components')).toBeInTheDocument()
  })

  it('singularizes the count for a single entry', () => {
    render(
      <CategorySection
        category="typography"
        label="Typography"
        entries={[entries[0]]}
        renderCard={(entry) => <span>{entry.name}</span>}
      />,
    )
    expect(screen.getByText('1 component')).toBeInTheDocument()
  })

  it('renders the description matching CATEGORY_DESCRIPTIONS for the category', () => {
    const category = 'typography'
    render(
      <CategorySection
        category={category}
        label="Typography"
        entries={entries}
        renderCard={(entry) => <span>{entry.name}</span>}
      />,
    )
    const description = screen.getByTestId('category-description')
    expect(description).toHaveTextContent(CATEGORY_DESCRIPTIONS[category])
  })

  it('renders different descriptions for different categories', () => {
    const { rerender } = render(
      <CategorySection
        category="primitive"
        label="Primitive"
        entries={entries}
        renderCard={(entry) => <span>{entry.name}</span>}
      />,
    )
    expect(screen.getByTestId('category-description')).toHaveTextContent(
      CATEGORY_DESCRIPTIONS.primitive,
    )

    rerender(
      <CategorySection
        category="composite"
        label="Composite"
        entries={entries}
        renderCard={(entry) => <span>{entry.name}</span>}
      />,
    )
    expect(screen.getByTestId('category-description')).toHaveTextContent(
      CATEGORY_DESCRIPTIONS.composite,
    )
  })
})
