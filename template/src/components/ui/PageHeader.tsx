// src/components/ui/PageHeader.tsx — Page-level header with title + sub + right slot.
// Port: app2/ui.jsx PageHeader

import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/Badge'

export interface PageHeaderProps {
  title: string
  sub?: string
  right?: ReactNode
  breadcrumb?: ReactNode
  live?: boolean
}

export function PageHeader({ title, sub, right, breadcrumb, live }: PageHeaderProps) {
  return (
    <div style={{ marginBottom: 18 }}>
      {breadcrumb}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 16,
          marginTop: breadcrumb ? 10 : 0,
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* eslint-disable-next-line local/no-raw-heading-tag -- plain-CSS port primitive (app2/ui.jsx PageHeader): bespoke inline-styled page title, not the Chakra Heading recipe. */}
            <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-.02em' }}>
              {title}
            </h1>
            {live && (
              <Badge tone="ok" mono>
                <span className="recall-live-dot" style={{ width: 5, height: 5 }} />
                live
              </Badge>
            )}
          </div>
          {sub && (
            <div
              style={{
                marginTop: 4,
                color: 'var(--color-fg-muted)',
                fontSize: 13,
                maxWidth: 760,
                lineHeight: 1.5,
              }}
            >
              {sub}
            </div>
          )}
        </div>
        {right && (
          <div
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              flex: '0 0 auto',
            }}
          >
            {right}
          </div>
        )}
      </div>
    </div>
  )
}
