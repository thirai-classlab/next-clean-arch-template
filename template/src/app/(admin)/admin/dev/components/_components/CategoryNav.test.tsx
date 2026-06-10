// apps/web/src/app/(admin)/admin/dev/components/_components/CategoryNav.test.tsx

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CategoryNav } from './CategoryNav'
import { CATEGORY_ORDER } from '../_data/component-catalog'

describe('CategoryNav', () => {
  it('renders all 7 categories as tabs', () => {
    render(<CategoryNav activeCategory={null} onSelectCategory={() => {}} />)
    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(CATEGORY_ORDER.length) // 7
  })

  it('sets aria-selected=true on the active category', () => {
    render(<CategoryNav activeCategory="primitive" onSelectCategory={() => {}} />)
    const primitiveTab = screen.getByRole('tab', { name: /プリミティブ/ })
    expect(primitiveTab).toHaveAttribute('aria-selected', 'true')
    const typographyTab = screen.getByRole('tab', { name: /タイポグラフィ/ })
    expect(typographyTab).toHaveAttribute('aria-selected', 'false')
  })

  it('defaults to first category (typography) when activeCategory is null', () => {
    render(<CategoryNav activeCategory={null} onSelectCategory={() => {}} />)
    const typographyTab = screen.getByRole('tab', { name: /タイポグラフィ/ })
    expect(typographyTab).toHaveAttribute('aria-selected', 'true')
  })

  it('sets aria-controls to category-section-{id}', () => {
    render(<CategoryNav activeCategory={null} onSelectCategory={() => {}} />)
    const primitiveTab = screen.getByRole('tab', { name: /プリミティブ/ })
    expect(primitiveTab).toHaveAttribute('aria-controls', 'category-section-primitive')
  })

  it('calls onSelectCategory on click', () => {
    const handleSelect = vi.fn()
    render(<CategoryNav activeCategory={null} onSelectCategory={handleSelect} />)
    const domainTab = screen.getByRole('tab', { name: /ドメイン/ })
    fireEvent.click(domainTab)
    expect(handleSelect).toHaveBeenCalledWith('domain')
  })

  it('does not call scrollIntoView (scroll is parent responsibility)', () => {
    // jsdom does not implement scrollIntoView; define a no-op before spying
    Element.prototype.scrollIntoView = vi.fn()
    const scrollSpy = vi.spyOn(Element.prototype, 'scrollIntoView')
    const handleSelect = vi.fn()
    render(<CategoryNav activeCategory={null} onSelectCategory={handleSelect} />)
    const domainTab = screen.getByRole('tab', { name: /ドメイン/ })
    fireEvent.click(domainTab)
    expect(scrollSpy).not.toHaveBeenCalled() // scroll is delegated to GalleryClient
    scrollSpy.mockRestore()
  })

  it('each tab button has id matching category-nav-tab-{category}', () => {
    render(<CategoryNav activeCategory={null} onSelectCategory={() => {}} />)
    for (const category of CATEGORY_ORDER) {
      const tab = screen.getByTestId(`category-nav-tab-${category}`)
      expect(tab).toHaveAttribute('id', `category-nav-tab-${category}`)
    }
  })

  it('uses roving tabindex (active=0, others=-1)', () => {
    render(<CategoryNav activeCategory="primitive" onSelectCategory={() => {}} />)
    const primitiveTab = screen.getByRole('tab', { name: /プリミティブ/ })
    expect(primitiveTab).toHaveAttribute('tabindex', '0')
    const typographyTab = screen.getByRole('tab', { name: /タイポグラフィ/ })
    expect(typographyTab).toHaveAttribute('tabindex', '-1')
  })

  it('ArrowRight selects next category', () => {
    const handleSelect = vi.fn()
    // CATEGORY_ORDER[0]='typography', [1]='primitive'
    render(<CategoryNav activeCategory="typography" onSelectCategory={handleSelect} />)
    const tablist = screen.getByRole('tablist')
    fireEvent.keyDown(tablist, { key: 'ArrowRight' })
    expect(handleSelect).toHaveBeenCalledWith('primitive')
  })

  it('ArrowRight moves focus to the next tab (APG keyboard nav)', () => {
    render(
      <CategoryNav
        activeCategory="typography"
        onSelectCategory={() => {}}
      />,
    )
    const typographyTab = screen.getByRole('tab', { name: /タイポグラフィ/ })
    typographyTab.focus()
    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'ArrowRight' })
    // jsdom executes querySelector + focus() synchronously
    const primitiveTab = screen.getByRole('tab', { name: /プリミティブ/ })
    expect(document.activeElement).toBe(primitiveTab)
  })

  it('ArrowRight wraps to first category from last (symmetric with ArrowLeft wrap)', () => {
    const handleSelect = vi.fn()
    render(
      <CategoryNav
        activeCategory={CATEGORY_ORDER[CATEGORY_ORDER.length - 1]}
        onSelectCategory={handleSelect}
      />,
    )
    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'ArrowRight' })
    expect(handleSelect).toHaveBeenCalledWith(CATEGORY_ORDER[0])
  })

  it('ArrowLeft wraps to last category from first', () => {
    const handleSelect = vi.fn()
    // CATEGORY_ORDER[0]='typography' → ArrowLeft wraps to CATEGORY_ORDER[6]='nav-shell'
    render(<CategoryNav activeCategory="typography" onSelectCategory={handleSelect} />)
    const tablist = screen.getByRole('tablist')
    fireEvent.keyDown(tablist, { key: 'ArrowLeft' })
    expect(handleSelect).toHaveBeenCalledWith(CATEGORY_ORDER[CATEGORY_ORDER.length - 1])
  })

  it('Home selects first category', () => {
    const handleSelect = vi.fn()
    render(<CategoryNav activeCategory="domain" onSelectCategory={handleSelect} />)
    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'Home' })
    expect(handleSelect).toHaveBeenCalledWith('typography')
  })

  it('End selects last category', () => {
    const handleSelect = vi.fn()
    render(<CategoryNav activeCategory="typography" onSelectCategory={handleSelect} />)
    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'End' })
    expect(handleSelect).toHaveBeenCalledWith(CATEGORY_ORDER[CATEGORY_ORDER.length - 1])
  })
})
