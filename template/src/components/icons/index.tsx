// src/components/icons/index.tsx — Inline SVG icon set.
//
// Port: docs/design-import/project/app/icons.jsx
//   - 24x24 grid, currentColor stroke, 1.5 default width.
//   - All icons accept { size, stroke, style, className } and forward DOM props.
//
// Usage:
//   import { Icon } from '@/components/icons'
//   <Icon.Bot size={14} />
//   <Icon.Plus size={11} stroke={2} />

import type { CSSProperties, SVGProps } from 'react'

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'stroke'> {
  size?: number
  stroke?: number
  style?: CSSProperties
  className?: string
}

type IconComponent = (props?: IconProps) => JSX.Element

function makeIcon(path: JSX.Element, viewBox = '0 0 24 24'): IconComponent {
  const Component = (props: IconProps = {}) => {
    const { size = 16, stroke = 1.5, ...rest } = props
    return (
      <svg
        width={size}
        height={size}
        viewBox={viewBox}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        {...rest}
      >
        {path}
      </svg>
    )
  }
  return Component
}

export const Icon = {
  Home: makeIcon(
    <>
      <path d="M3 11.5L12 4l9 7.5" />
      <path d="M5 10v10h14V10" />
    </>,
  ),
  Bot: makeIcon(
    <>
      <rect x="4" y="8" width="16" height="11" rx="2" />
      <path d="M12 8V4" />
      <circle cx="9" cy="13" r="1" />
      <circle cx="15" cy="13" r="1" />
      <path d="M9 17h6" />
    </>,
  ),
  Plus: makeIcon(<path d="M12 5v14M5 12h14" />),
  ArrowRight: makeIcon(<path d="M5 12h14M13 6l6 6-6 6" />),
  ArrowUpRight: makeIcon(<path d="M7 17L17 7M8 7h9v9" />),
  Mic: makeIcon(
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3" />
    </>,
  ),
  Radio: makeIcon(
    <>
      <circle cx="12" cy="12" r="2" />
      <path d="M8 8a5 5 0 0 0 0 8M16 8a5 5 0 0 1 0 8" />
      <path d="M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14" />
    </>,
  ),
  Calendar: makeIcon(
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>,
  ),
  Layers: makeIcon(
    <>
      <path d="M12 3l9 5-9 5-9-5 9-5z" />
      <path d="M3 13l9 5 9-5M3 18l9 5 9-5" />
    </>,
  ),
  Webhook: makeIcon(
    <path d="M9 13l-2 4a3 3 0 1 1-3-5M15 7l2 4a3 3 0 1 1-5 2M14 18l-5-9a3 3 0 1 0-2 5" />,
  ),
  Server: makeIcon(
    <>
      <rect x="3" y="4" width="18" height="7" rx="1.5" />
      <rect x="3" y="13" width="18" height="7" rx="1.5" />
      <circle cx="7" cy="7.5" r=".7" fill="currentColor" />
      <circle cx="7" cy="16.5" r=".7" fill="currentColor" />
    </>,
  ),
  Phone: makeIcon(
    <>
      <rect x="6" y="2" width="12" height="20" rx="2.5" />
      <path d="M11 18h2" />
    </>,
  ),
  Shield: makeIcon(<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" />),
  User: makeIcon(
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>,
  ),
  LogOut: makeIcon(
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </>,
  ),
  Download: makeIcon(<path d="M12 4v12M6 11l6 6 6-6M5 20h14" />),
  Settings: makeIcon(
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.5-2.4.9a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.5a7 7 0 0 0-2 1.2L5 5.8l-2 3.5 2 1.5A7 7 0 0 0 5 12a7 7 0 0 0 .1 1.2l-2 1.5 2 3.5 2.4-.9a7 7 0 0 0 2 1.2L10 21h4l.5-2.5a7 7 0 0 0 2-1.2l2.4.9 2-3.5-2-1.5c.1-.4.1-.8.1-1.2z" />
    </>,
  ),
  Book: makeIcon(
    <>
      <path d="M4 4h11a4 4 0 0 1 4 4v13H8a4 4 0 0 1-4-4z" />
      <path d="M4 17a4 4 0 0 1 4-4h11" />
    </>,
  ),
  Search: makeIcon(
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </>,
  ),
  Chevron: makeIcon(<path d="M9 6l6 6-6 6" />),
  ChevronDown: makeIcon(<path d="M6 9l6 6 6-6" />),
  Dot: makeIcon(<circle cx="12" cy="12" r="3" fill="currentColor" />),
  Activity: makeIcon(<path d="M3 12h4l3-8 4 16 3-8h4" />),
  Check: makeIcon(<path d="M5 12l5 5L20 7" />),
  X: makeIcon(<path d="M6 6l12 12M18 6L6 18" />),
  Zap: makeIcon(<path d="M13 2L5 14h7l-1 8 8-12h-7l1-8z" />),
  Sparkle: makeIcon(
    <>
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" />
      <path d="M19 3l.7 1.8L21.5 5.5l-1.8.7L19 8l-.7-1.8L16.5 5.5l1.8-.7L19 3z" />
    </>,
  ),
  Filter: makeIcon(<path d="M4 5h16l-6 8v6l-4-2v-4z" />),
  Folder: makeIcon(<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />),
  Clock: makeIcon(
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>,
  ),
  Mail: makeIcon(
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </>,
  ),
  Users: makeIcon(
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 20a6 6 0 0 1 12 0" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M15 20a5 5 0 0 1 7 0" />
    </>,
  ),
  ChartBar: makeIcon(
    <>
      <path d="M3 20h18" />
      <rect x="5" y="12" width="3" height="8" />
      <rect x="10.5" y="7" width="3" height="13" />
      <rect x="16" y="14" width="3" height="6" />
    </>,
  ),
  Terminal: makeIcon(
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 10l3 2-3 2M13 14h4" />
    </>,
  ),
  Command: makeIcon(<path d="M9 6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3z" />),
  Wifi: makeIcon(
    <>
      <path d="M5 12a10 10 0 0 1 14 0M8 15.5a5 5 0 0 1 8 0" />
      <circle cx="12" cy="19" r="1" fill="currentColor" />
    </>,
  ),
  Globe: makeIcon(
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </>,
  ),
} as const

export type IconName = keyof typeof Icon
