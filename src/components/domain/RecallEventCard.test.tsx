import * as React from 'react'
import { screen, fireEvent, cleanup } from '@testing-library/react'
import { afterEach, describe, it, expect, vi } from 'vitest'
import { renderWithChakra as render } from '@/test-utils'
import { RecallEventCard, type RecallEvent } from './RecallEventCard'

afterEach(() => {
  cleanup()
})

function event(overrides: Partial<RecallEvent> = {}): RecallEvent {
  return {
    id: 'evt_001',
    type: 'bot.joined',
    timestamp: new Date(2026, 4, 27, 9, 0, 0),
    ...overrides,
  }
}

describe('RecallEventCard', () => {
  it('exports a stable displayName', () => {
    expect(RecallEventCard.displayName).toBe('RecallEventCard')
  })

  it('renders the known label for a known event type', () => {
    render(<RecallEventCard event={event({ type: 'bot.joined' })} />)
    expect(screen.getByText('Bot joined')).toBeInTheDocument()
  })

  // Exhaustive coverage of the TYPE_META mapping (all 9 known event types).
  // Guards against label typos and icon swaps/deletions: lucide renders each
  // icon as an <svg class="lucide lucide-<kebab-name>">, so the icon class is a
  // stable, render-level contract for "this type → this icon".
  const typeMetaCases: Array<{
    type: string
    label: string
    iconClass: string
  }> = [
    { type: 'bot.joined', label: 'Bot joined', iconClass: 'lucide-video' },
    { type: 'bot.left', label: 'Bot left', iconClass: 'lucide-video-off' },
    {
      type: 'recording.started',
      label: 'Recording started',
      iconClass: 'lucide-video',
    },
    {
      type: 'recording.done',
      label: 'Recording done',
      iconClass: 'lucide-file-text',
    },
    {
      type: 'transcript.data',
      label: 'Transcript chunk',
      iconClass: 'lucide-file-text',
    },
    {
      type: 'transcript.partial',
      label: 'Partial transcript',
      iconClass: 'lucide-file-text',
    },
    {
      type: 'calendar.scheduled',
      label: 'Calendar scheduled',
      iconClass: 'lucide-calendar',
    },
    {
      type: 'webhook.received',
      label: 'Webhook received',
      iconClass: 'lucide-webhook',
    },
    {
      type: 'bot.permission_denied',
      label: 'Permission denied',
      // lucide-react aliases AlertOctagon → OctagonAlert (class lucide-octagon-alert)
      iconClass: 'lucide-octagon-alert',
    },
  ]

  it.each(typeMetaCases)(
    'maps known type "$type" to label "$label" and icon "$iconClass"',
    ({ type, label, iconClass }) => {
      const { container } = render(<RecallEventCard event={event({ type })} />)
      // label is rendered (and is NOT the raw type fallback)
      expect(screen.getByText(label)).toBeInTheDocument()
      // exactly the mapped lucide icon is present
      expect(container.querySelector(`svg.${iconClass}`)).not.toBeNull()
    }
  )

  it('uses the fallback Activity icon for an unknown event type', () => {
    const { container } = render(
      <RecallEventCard event={event({ type: 'bot.totally_new_event' })} />
    )
    expect(container.querySelector('svg.lucide-activity')).not.toBeNull()
  })

  it('renders the raw event.type as label when type is unknown', () => {
    render(
      <RecallEventCard event={event({ type: 'bot.totally_new_event' })} />
    )
    expect(screen.getByText('bot.totally_new_event')).toBeInTheDocument()
  })

  it('renders the event id', () => {
    render(<RecallEventCard event={event({ id: 'evt_xyz' })} />)
    expect(screen.getByTestId('recall-event-id')).toHaveTextContent('evt_xyz')
  })

  it('formats the timestamp as HH:MM:SS', () => {
    const ts = new Date(2026, 4, 27, 12, 34, 56)
    render(<RecallEventCard event={event({ timestamp: ts })} />)
    expect(screen.getByTestId('recall-event-timestamp')).toHaveTextContent(
      '12:34:56'
    )
  })

  it('exposes a machine-readable dateTime on the <time> element', () => {
    const ts = new Date(2026, 4, 27, 12, 34, 56)
    render(<RecallEventCard event={event({ timestamp: ts })} />)
    const time = screen.getByTestId('recall-event-timestamp')
    expect(time.tagName.toLowerCase()).toBe('time')
    expect(time).toHaveAttribute('datetime', ts.toISOString())
  })

  it('formats string timestamps by parsing them via Date', () => {
    // Parser-local string — converted via `new Date(value)`.
    const iso = '2026-05-27T12:34:56'
    const expected = (() => {
      const d = new Date(iso)
      const pad = (n: number) => (n < 10 ? `0${n}` : String(n))
      return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    })()
    render(<RecallEventCard event={event({ timestamp: iso })} />)
    expect(screen.getByTestId('recall-event-timestamp')).toHaveTextContent(
      expected
    )
  })

  it('falls back to --:--:-- for an invalid timestamp string', () => {
    render(<RecallEventCard event={event({ timestamp: 'not-a-date' })} />)
    expect(screen.getByTestId('recall-event-timestamp')).toHaveTextContent(
      '--:--:--'
    )
  })

  it('exposes data-event-type and data-event-id attributes', () => {
    render(
      <RecallEventCard event={event({ id: 'evt_777', type: 'recording.done' })} />
    )
    const article = screen.getByRole('article')
    expect(article).toHaveAttribute('data-event-type', 'recording.done')
    expect(article).toHaveAttribute('data-event-id', 'evt_777')
  })

  it('omits the action footer when onAction is undefined', () => {
    render(<RecallEventCard event={event()} />)
    expect(
      screen.queryByTestId('recall-event-actions')
    ).not.toBeInTheDocument()
  })

  it('renders Retry and Dismiss buttons and invokes onAction', () => {
    const handler = vi.fn()
    render(<RecallEventCard event={event()} onAction={handler} />)

    const retry = screen.getByRole('button', { name: 'Retry' })
    const dismiss = screen.getByRole('button', { name: 'Dismiss' })
    expect(retry).toBeInTheDocument()
    expect(dismiss).toBeInTheDocument()

    fireEvent.click(retry)
    fireEvent.click(dismiss)

    expect(handler).toHaveBeenCalledTimes(2)
    expect(handler).toHaveBeenNthCalledWith(1, 'retry')
    expect(handler).toHaveBeenNthCalledWith(2, 'dismiss')
  })

  it('provides an aria-label that includes label + timestamp', () => {
    const ts = new Date(2026, 4, 27, 9, 0, 1)
    render(
      <RecallEventCard
        event={event({ type: 'transcript.data', timestamp: ts })}
      />
    )
    expect(
      screen.getByLabelText('Event: Transcript chunk at 09:00:01')
    ).toBeInTheDocument()
  })
})
