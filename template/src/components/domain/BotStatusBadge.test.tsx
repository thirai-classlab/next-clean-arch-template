import * as React from 'react'
import { screen, cleanup } from '@testing-library/react'
import { afterEach, describe, it, expect } from 'vitest'
import { renderWithChakra as render } from '@/test-utils'
import { BotStatusBadge } from './BotStatusBadge'
import { BOT_STATUSES, type BotStatus } from '@/lib/domain/value-objects/bot-status'

afterEach(() => {
  cleanup()
})

describe('BotStatusBadge', () => {
  it('exports a stable displayName', () => {
    expect(BotStatusBadge.displayName).toBe('BotStatusBadge')
  })

  // One test per status — coverage for all 7 BotStatus literals.
  const cases: Array<{
    status: BotStatus
    tone: string
    label: string
  }> = [
    { status: 'ready', tone: 'neutral', label: 'Ready' },
    { status: 'joining_call', tone: 'info', label: 'Joining' },
    { status: 'in_call_not_recording', tone: 'warn', label: 'In call' },
    { status: 'in_call_recording', tone: 'live', label: 'Recording' },
    { status: 'call_ended', tone: 'neutral', label: 'Ended' },
    { status: 'done', tone: 'ok', label: 'Done' },
    { status: 'fatal', tone: 'err', label: 'Fatal' },
  ]

  it.each(cases)(
    'renders status "$status" with tone "$tone" and label "$label"',
    ({ status, tone, label }) => {
      render(<BotStatusBadge status={status} />)
      const badge = screen.getByRole('status')
      expect(badge).toHaveAttribute('data-status', status)
      expect(badge).toHaveAttribute('data-tone', tone)
      expect(badge).toHaveTextContent(label)
    }
  )

  // Pulse contract: only `joining_call` and `in_call_recording` animate the
  // icon (they convey a "live"/in-progress state). The icon is a lucide <svg>
  // carrying `animate-pulse` when pulse=true. These asserts guard against the
  // pulse silently disappearing (or being added to the wrong status).
  it.each(['joining_call', 'in_call_recording'] as const)(
    'applies animate-pulse to the icon for the pulsing status "%s"',
    (status) => {
      const { container } = render(<BotStatusBadge status={status} />)
      const icon = container.querySelector('svg')
      expect(icon).not.toBeNull()
      expect(icon?.getAttribute('class')).toMatch(/animate-pulse/)
    }
  )

  it.each([
    'ready',
    'in_call_not_recording',
    'call_ended',
    'done',
    'fatal',
  ] as const)(
    'does NOT animate the icon for the static status "%s"',
    (status) => {
      const { container } = render(<BotStatusBadge status={status} />)
      const icon = container.querySelector('svg')
      expect(icon).not.toBeNull()
      expect(icon?.getAttribute('class')).not.toMatch(/animate-pulse/)
    }
  )

  it('covers every BotStatus literal exposed by the VO', () => {
    // Guard against drift between the VO enum and the badge mapping.
    const covered = new Set(cases.map((c) => c.status))
    for (const s of BOT_STATUSES) {
      expect(covered.has(s)).toBe(true)
    }
  })

  it('hides the textual label when showLabel=false but keeps it for screen readers', () => {
    render(<BotStatusBadge status="in_call_recording" showLabel={false} />)
    const badge = screen.getByRole('status')
    expect(badge).not.toHaveTextContent('Recording')
    expect(badge.getAttribute('aria-label')).toMatch(/recording/i)
  })

  it('shows the textual label by default', () => {
    render(<BotStatusBadge status="ready" />)
    expect(screen.getByText('Ready')).toBeInTheDocument()
  })

  it('exposes a descriptive aria-label that includes the status meaning', () => {
    render(<BotStatusBadge status="fatal" />)
    expect(screen.getByLabelText(/fatal/i)).toBeInTheDocument()
  })

  it('merges className overrides', () => {
    render(<BotStatusBadge status="done" className="custom-badge" />)
    expect(screen.getByRole('status').className).toContain('custom-badge')
  })
})
