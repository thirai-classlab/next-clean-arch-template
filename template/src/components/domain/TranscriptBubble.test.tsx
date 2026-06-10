import * as React from 'react'
import { screen, cleanup } from '@testing-library/react'
import { afterEach, describe, it, expect } from 'vitest'
import { renderWithChakra as render } from '@/test-utils'
import { TranscriptBubble } from './TranscriptBubble'

afterEach(() => {
  cleanup()
})

describe('TranscriptBubble', () => {
  it('exports a stable displayName', () => {
    expect(TranscriptBubble.displayName).toBe('TranscriptBubble')
  })

  it('renders speaker, text, and formatted timestamp', () => {
    const ts = new Date(2026, 4, 27, 14, 5, 9) // local TZ → 14:05:09
    render(
      <TranscriptBubble speaker="Alice" text="Hello world" timestamp={ts} />
    )
    expect(screen.getByTestId('transcript-speaker')).toHaveTextContent('Alice')
    expect(screen.getByTestId('transcript-text')).toHaveTextContent(
      'Hello world'
    )
    expect(screen.getByTestId('transcript-timestamp')).toHaveTextContent(
      '14:05:09'
    )
  })

  it('formats string timestamps by parsing them via Date', () => {
    // Use a deterministic local-time string the platform parses.
    const iso = '2026-05-27T14:05:09'
    const expected = (() => {
      const d = new Date(iso)
      const pad = (n: number) => (n < 10 ? `0${n}` : String(n))
      return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    })()
    render(
      <TranscriptBubble speaker="Bob" text="Hi" timestamp={iso} />
    )
    expect(screen.getByTestId('transcript-timestamp')).toHaveTextContent(
      expected
    )
  })

  it('falls back to placeholder when timestamp is invalid', () => {
    render(
      <TranscriptBubble speaker="Carol" text="?" timestamp="not-a-date" />
    )
    expect(screen.getByTestId('transcript-timestamp')).toHaveTextContent(
      '--:--:--'
    )
  })

  it('uses role="article" with an aria-label containing speaker and time', () => {
    const ts = new Date(2026, 4, 27, 9, 0, 1)
    render(<TranscriptBubble speaker="Dan" text="x" timestamp={ts} />)
    const article = screen.getByRole('article')
    expect(article).toHaveAttribute('aria-label', 'Dan at 09:00:01')
  })

  it('dims text and surfaces low-confidence warning when confidence < 0.5', () => {
    const ts = new Date()
    render(
      <TranscriptBubble
        speaker="E"
        text="muffled"
        timestamp={ts}
        confidence={0.3}
      />
    )
    expect(screen.getByRole('article')).toHaveAttribute(
      'data-low-confidence',
      'true'
    )
    expect(screen.getByTestId('transcript-low-confidence')).toBeInTheDocument()
    // Dimming is applied via a SINGLE Chakra `opacity` prop (0.6). The state is
    // surfaced through `data-low-confidence` so the test does not couple to the
    // styling implementation (regression guard for the old double-opacity bug
    // where a Tailwind `opacity-60` class AND `opacity={0.6}` compounded to 0.36).
    const text = screen.getByTestId('transcript-text')
    expect(text).toHaveAttribute('data-low-confidence', 'true')
    // The Tailwind utility class must be gone — only the Chakra `opacity` prop
    // (a single emotion class) applies the dimming now.
    expect(text.className).not.toMatch(/opacity-60/)
    // emotion applies opacity:0.6 via a generated class; the computed style
    // resolves to a single 0.6 (NOT the old compounded 0.36).
    expect(window.getComputedStyle(text).opacity).toBe('0.6')
  })

  it('renders the confidence percentage when >= 0.5', () => {
    const ts = new Date()
    render(
      <TranscriptBubble
        speaker="F"
        text="clear"
        timestamp={ts}
        confidence={0.9}
      />
    )
    expect(screen.getByRole('article')).not.toHaveAttribute(
      'data-low-confidence'
    )
    expect(screen.getByTestId('transcript-confidence')).toHaveTextContent('90%')
    expect(
      screen.queryByTestId('transcript-low-confidence')
    ).not.toBeInTheDocument()
  })

  it('omits any confidence indicator when confidence is undefined', () => {
    const ts = new Date()
    render(<TranscriptBubble speaker="G" text="silent" timestamp={ts} />)
    expect(
      screen.queryByTestId('transcript-confidence')
    ).not.toBeInTheDocument()
    expect(
      screen.queryByTestId('transcript-low-confidence')
    ).not.toBeInTheDocument()
  })

  it('treats confidence === 0.5 as high (not low)', () => {
    // Boundary: < 0.5 is "low", >= 0.5 is "high". 0.5 must be on the high side.
    const ts = new Date()
    render(
      <TranscriptBubble
        speaker="H"
        text="exact boundary"
        timestamp={ts}
        confidence={0.5}
      />
    )
    expect(screen.getByRole('article')).not.toHaveAttribute(
      'data-low-confidence'
    )
    expect(screen.getByTestId('transcript-confidence')).toHaveTextContent('50%')
    expect(
      screen.queryByTestId('transcript-low-confidence')
    ).not.toBeInTheDocument()
  })

  it('handles confidence === 0 as the lowest value (data-low-confidence + 0%)', () => {
    const ts = new Date()
    render(
      <TranscriptBubble
        speaker="I"
        text="zero"
        timestamp={ts}
        confidence={0}
      />
    )
    expect(screen.getByRole('article')).toHaveAttribute(
      'data-low-confidence',
      'true'
    )
    expect(screen.getByTestId('transcript-low-confidence')).toHaveTextContent(
      '0%'
    )
    // confidence === 0 is the lowest value: still a SINGLE opacity application.
    const text = screen.getByTestId('transcript-text')
    expect(text).toHaveAttribute('data-low-confidence', 'true')
    expect(text.className).not.toMatch(/opacity-60/)
  })

  it('renders the timestamp inside the header (alongside speaker)', () => {
    const ts = new Date(2026, 4, 27, 14, 5, 9)
    render(<TranscriptBubble speaker="J" text="hi" timestamp={ts} />)
    const speaker = screen.getByTestId('transcript-speaker')
    const time = screen.getByTestId('transcript-timestamp')
    // header is the closest <header> ancestor of the speaker span
    const header = speaker.closest('header')
    expect(header).not.toBeNull()
    // timestamp must be inside that same header
    expect(header?.contains(time)).toBe(true)
  })
})
