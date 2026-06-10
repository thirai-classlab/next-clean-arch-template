import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ComponentCard } from './ComponentCard'
import type { ComponentCatalogEntry } from '../_data/component-catalog'

const implementedEntry: ComponentCatalogEntry = Object.freeze({
  id: 'button',
  name: 'Button',
  category: 'primitive',
  status: 'implemented',
  phase: 'A',
  provider: 'chakra',
  referenceUrl: 'https://chakra-ui.com/docs/components/button',
  snippet: '<Button variant="solid">Save</Button>',
  description: 'Primary action button.',
})

const placeholderEntry: ComponentCatalogEntry = Object.freeze({
  id: 'nav-sidebar',
  name: 'Sidebar',
  category: 'nav-shell',
  status: 'placeholder',
  phase: 'future',
  provider: 'custom',
  snippet: '// 🚧 placeholder',
  description: 'Primary navigation rail.',
})

const officialOnlyEntry: ComponentCatalogEntry = Object.freeze({
  id: 'chakra-accordion',
  name: 'Accordion',
  category: 'composite',
  status: 'official-only',
  phase: 'chakra-v3',
  provider: 'chakra',
  referenceUrl: 'https://chakra-ui.com/docs/components/accordion',
  snippet: '// See official Chakra UI v3 docs:\n// https://chakra-ui.com/docs/components/accordion',
  description: 'Collapsible sections with animated panel reveal.',
})

describe('ComponentCard', () => {
  it('renders the component name', () => {
    render(<ComponentCard entry={implementedEntry} preview={<button>Save</button>} />)
    expect(screen.getByText('Button')).toBeInTheDocument()
  })

  it('renders the snippet inside a <pre><code> block', () => {
    render(<ComponentCard entry={implementedEntry} preview={<span>preview</span>} />)
    const snippet = screen.getByTestId('component-card-snippet')
    expect(snippet.tagName).toBe('PRE')
    expect(snippet.textContent).toContain('<Button variant="solid">Save</Button>')
  })

  it('renders the provided preview when status is implemented', () => {
    render(
      <ComponentCard
        entry={implementedEntry}
        preview={<button data-testid="preview-btn">Save</button>}
      />,
    )
    expect(screen.getByTestId('preview-btn')).toBeInTheDocument()
  })

  it('renders 実装済 status badge for implemented entries', () => {
    render(<ComponentCard entry={implementedEntry} preview={<span>x</span>} />)
    expect(screen.getByTestId('component-card-status').textContent).toContain('実装済')
  })

  it('renders 🚧 placeholder badge + no preview slot for placeholder entries', () => {
    render(<ComponentCard entry={placeholderEntry} />)
    expect(screen.getByTestId('component-card-status').textContent).toContain('placeholder')
    expect(screen.getByTestId('component-card-preview').textContent).toContain('未実装')
  })

  it('exposes data attributes for tests / styling', () => {
    render(<ComponentCard entry={implementedEntry} preview={<span>x</span>} />)
    const card = screen.getByTestId('component-card')
    expect(card.getAttribute('data-entry-id')).toBe('button')
    expect(card.getAttribute('data-status')).toBe('implemented')
    expect(card.getAttribute('data-category')).toBe('primitive')
  })

  it('falls back to "no preview provided" when preview is omitted on implemented entries', () => {
    render(<ComponentCard entry={implementedEntry} />)
    expect(screen.getByTestId('component-card-preview').textContent).toContain('プレビューなし')
  })

  it('renders Chakra v3 provider badge for chakra entries', () => {
    render(<ComponentCard entry={implementedEntry} preview={<span>x</span>} />)
    const badge = screen.getByTestId('component-card-provider')
    expect(badge.getAttribute('data-provider')).toBe('chakra')
    expect(badge.textContent).toContain('Chakra v3')
  })

  it('renders a reference link to chakra-ui.com for chakra entries', () => {
    render(<ComponentCard entry={implementedEntry} preview={<span>x</span>} />)
    const link = screen.getByRole('link', { name: /公式リファレンス/i })
    expect(link).toHaveAttribute('href', 'https://chakra-ui.com/docs/components/button')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('renders Custom provider badge for custom (placeholder) entries', () => {
    render(<ComponentCard entry={placeholderEntry} />)
    const badge = screen.getByTestId('component-card-provider')
    expect(badge.getAttribute('data-provider')).toBe('custom')
    expect(badge.textContent).toContain('カスタム')
  })

  it('does not render a reference link for custom entries', () => {
    render(<ComponentCard entry={placeholderEntry} />)
    expect(screen.queryByRole('link', { name: /公式リファレンス/i })).toBeNull()
  })

  describe('official-only entries', () => {
    it('renders 📚 公式のみ status badge', () => {
      render(<ComponentCard entry={officialOnlyEntry} />)
      expect(screen.getByTestId('component-card-status').textContent).toContain('公式のみ')
    })

    it('renders "Chakra v3 official" phase label', () => {
      render(<ComponentCard entry={officialOnlyEntry} />)
      expect(screen.getByTestId('component-card').textContent).toContain('Chakra v3 公式')
    })

    it('renders preview section with 公式 docs link', () => {
      render(<ComponentCard entry={officialOnlyEntry} />)
      const preview = screen.getByTestId('component-card-preview')
      expect(preview.textContent).toContain('Chakra UI v3 公式')
      const docsLink = screen.getByRole('link', { name: /公式 docs を新しいタブで開く/i })
      expect(docsLink).toHaveAttribute('href', 'https://chakra-ui.com/docs/components/accordion')
      expect(docsLink).toHaveAttribute('target', '_blank')
    })

    it('sets data-status="official-only" on the card article', () => {
      render(<ComponentCard entry={officialOnlyEntry} />)
      const card = screen.getByTestId('component-card')
      expect(card.getAttribute('data-status')).toBe('official-only')
    })

    it('applies reduced opacity style for official-only entries', () => {
      render(<ComponentCard entry={officialOnlyEntry} />)
      const card = screen.getByTestId('component-card')
      // Stage 1: opacity updated from 0.65 to 0.85 (dim relaxed now real previews render)
      expect(card.style.opacity).toBe('0.85')
    })
  })
})
