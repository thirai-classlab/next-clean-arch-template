// src/components/ui/Btn.tsx — Button primitive.
// Port: app2/ui.jsx Btn

import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react'
import type { IconProps } from '@/components/icons'

export type BtnVariant = 'primary' | 'ghost' | 'soft' | 'danger' | 'link'
export type BtnSize = 'sm' | 'md'

type IconComponent = (props?: IconProps) => JSX.Element

export interface BtnProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: BtnVariant
  size?: BtnSize
  icon?: IconComponent
  iconRight?: IconComponent
  children?: ReactNode
  style?: CSSProperties
}

const VARIANT_STYLES: Record<BtnVariant, CSSProperties> = {
  primary: { background: 'var(--color-accent)', color: '#fff' },
  ghost:   { background: 'var(--color-bg-elevated)', color: 'var(--color-fg-default)', boxShadow: 'inset 0 0 0 1px var(--color-border)' },
  soft:    { background: 'var(--color-bg-sunken)', color: 'var(--color-fg-muted)' },
  danger:  { background: 'var(--color-bg-elevated)', color: 'var(--color-danger)', boxShadow: 'inset 0 0 0 1px var(--color-danger)' },
  link:    { background: 'transparent', color: 'var(--color-accent-text)', padding: 0 },
}

export function Btn({
  variant = 'ghost',
  size = 'md',
  icon,
  iconRight,
  children,
  style,
  ...rest
}: BtnProps) {
  const padY = size === 'sm' ? 4 : 6
  const padX = size === 'sm' ? 8 : 12
  const fontSize = size === 'sm' ? 11.5 : 12.5
  const iconSize = size === 'sm' ? 11 : 13
  const variantStyle = VARIANT_STYLES[variant]

  return (
    <button
      {...rest}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: variant === 'link' ? 0 : `${padY}px ${padX}px`,
        borderRadius: 'var(--radius-md)',
        fontSize,
        fontWeight: 500,
        lineHeight: 1.2,
        cursor: 'pointer',
        transition: 'background .15s, opacity .15s',
        whiteSpace: 'nowrap',
        ...variantStyle,
        ...style,
      }}
    >
      {icon && icon({ size: iconSize, stroke: 1.8 })}
      {children}
      {iconRight && iconRight({ size: iconSize, stroke: 1.8 })}
    </button>
  )
}
