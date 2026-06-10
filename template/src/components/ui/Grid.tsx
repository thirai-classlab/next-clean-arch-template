// src/components/ui/Grid.tsx — Layout helpers.
// Port: app2/ui.jsx Grid / Row / Stack

import type { CSSProperties, ReactNode } from 'react'

export interface GridProps {
  /** number → `repeat(N, 1fr)` ; string → raw `grid-template-columns` value */
  cols: number | string
  gap?: number
  children: ReactNode
  style?: CSSProperties
}

export function Grid({ cols, gap = 12, children, style }: GridProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: typeof cols === 'number' ? `repeat(${cols}, 1fr)` : cols,
        gap,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

export interface StackProps {
  gap?: number
  children: ReactNode
  style?: CSSProperties
}

export function Stack({ gap = 12, children, style }: StackProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap, ...style }}>
      {children}
    </div>
  )
}
