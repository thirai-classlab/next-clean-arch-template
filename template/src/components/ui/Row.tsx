// src/components/ui/Row.tsx — Horizontal flex row.
// Port: app2/ui.jsx Row

import type { CSSProperties, ReactNode } from 'react'

export interface RowProps {
  gap?: number
  align?: CSSProperties['alignItems']
  children: ReactNode
  style?: CSSProperties
  full?: boolean
}

export function Row({
  gap = 8,
  align = 'center',
  children,
  style,
  full = false,
}: RowProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: align,
        gap,
        ...(full ? { width: '100%' } : {}),
        ...style,
      }}
    >
      {children}
    </div>
  )
}
