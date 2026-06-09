// src/components/ui/SectionHd.tsx — Section heading with optional sub + right slot.
// Port: app2/ui.jsx SectionHd

import type { ReactNode } from 'react'

export interface SectionHdProps {
  title: string
  sub?: string
  right?: ReactNode
  mono?: boolean
}

export function SectionHd({ title, sub, right, mono }: SectionHdProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        {/* eslint-disable-next-line local/no-raw-heading-tag -- plain-CSS port primitive (app2/ui.jsx SectionHd): bespoke inline-styled section heading, not the Chakra Heading recipe. */}
        <h2
          style={{
            fontSize: 13,
            fontWeight: 600,
            fontFamily: mono ? 'var(--font-mono)' : 'inherit',
          }}
        >
          {title}
        </h2>
        {sub && (
          <span
            style={{
              fontSize: 11.5,
              color: 'var(--color-fg-subtle)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {sub}
          </span>
        )}
      </div>
      {right}
    </div>
  )
}
