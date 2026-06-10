// src/components/ui/NoteBanner.tsx — Inline info / warn / err banner.
// Port: app2/ui.jsx NoteBanner

import type { ReactNode } from 'react'
import type { IconProps } from '@/components/icons'

export type NoteKind = 'info' | 'warn' | 'err' | 'mock'

type IconComponent = (props?: IconProps) => JSX.Element

export interface NoteBannerProps {
  kind?: NoteKind
  children: ReactNode
  icon?: IconComponent
  action?: ReactNode
}

interface ToneStyle {
  bg: string
  border: string
  color: string
}

const TONES: Record<NoteKind, ToneStyle> = {
  info: {
    bg: 'color-mix(in srgb, var(--color-accent) 8%, var(--color-bg-elevated))',
    border: 'color-mix(in srgb, var(--color-accent) 30%, transparent)',
    color: 'var(--color-fg-default)',
  },
  warn: {
    bg: 'var(--color-warning-subtle)',
    border: 'color-mix(in srgb, var(--color-warning) 30%, transparent)',
    color: 'var(--color-warning)',
  },
  err: {
    bg: 'var(--color-danger-subtle)',
    border: 'color-mix(in srgb, var(--color-danger) 30%, transparent)',
    color: 'var(--color-danger)',
  },
  mock: {
    bg: 'var(--color-warning-subtle)',
    border: 'color-mix(in srgb, var(--color-warning) 30%, transparent)',
    color: 'var(--color-warning)',
  },
}

export function NoteBanner({ kind = 'info', children, icon, action }: NoteBannerProps) {
  const t = TONES[kind]
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 12px',
        background: t.bg,
        color: t.color,
        border: `1px solid ${t.border}`,
        borderRadius: 'var(--radius-lg)',
        fontSize: 12.5,
      }}
    >
      {icon && icon({ size: 14 })}
      <div style={{ flex: 1 }}>{children}</div>
      {action}
    </div>
  )
}
