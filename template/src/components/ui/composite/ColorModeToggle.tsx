/**
 * ColorModeToggle — Chakra UI v3 + next-themes (Phase 6 Batch 2 baseline)
 *
 * Three-state color-mode switcher (light / dark / system) backed by
 * `next-themes` (the Provider wired in P1, see theme/provider.tsx).
 * Visualises the currently active theme with a Lucide icon and cycles
 * through the three modes on click.
 *
 * Cycle order: light → dark → system → light.
 *
 * Recipe convention (matches IconButton.tsx):
 *   1. Render Chakra `IconButton` (icon variant) — no raw <button>.
 *   2. Semantic tokens only — no oklch/hex hardcode.
 *   3. a11y: descriptive `aria-label` reflects the *next* state the click will
 *      produce (e.g. when current is "light" the label says "ダークテーマに切り替え").
 *      Icon is decorative (`aria-hidden`).
 *   4. Uses `useTheme()` and `useState`/`useEffect` for hydration safety →
 *      'use client'.
 *
 * Hydration: next-themes resolves the active theme on the client only, so we
 * render a placeholder icon (Monitor) on the server / first paint, then swap
 * to the resolved icon after mount. This avoids the well-known mismatch
 * warning when SSR'ing under one mode and hydrating under another.
 *
 * The `variant` prop currently only supports `'icon'`. A future `'menu'`
 * variant (dropdown with explicit Light/Dark/System options) will be added in
 * Batch 3 once Chakra `Menu` is migrated.
 */
'use client'

import * as React from 'react'
import { IconButton as ChakraIconButton } from '@chakra-ui/react'
import { useTheme } from 'next-themes'
import { Sun, Moon, Monitor } from 'lucide-react'

export type ColorModeToggleVariant = 'icon' | 'menu'
export type ColorModeValue = 'light' | 'dark' | 'system'

const NEXT_MODE: Record<ColorModeValue, ColorModeValue> = {
  light: 'dark',
  dark: 'system',
  system: 'light',
}

const MODE_LABEL: Record<ColorModeValue, string> = {
  light: 'ライトテーマ',
  dark: 'ダークテーマ',
  system: 'システム設定に合わせる',
}

const MODE_ICON: Record<ColorModeValue, React.ElementType> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
}

export interface ColorModeToggleProps {
  /**
   * `icon` (default) — a single icon button that cycles light → dark → system.
   * `menu` — reserved for a future dropdown variant. Currently falls back to
   * `icon` behaviour with a console warning in dev.
   */
  variant?: ColorModeToggleVariant
  /** Optional className passthrough. */
  className?: string
}

/**
 * ColorModeToggle — cycle between light / dark / system color modes.
 *
 * - Uses `next-themes` (`useTheme`) and writes to `theme` (not
 *   `resolvedTheme`) so that the user's explicit choice is persisted.
 * - Reflects the *active* theme in the icon and labels the *next* state in
 *   aria-label so screen-reader users know what the click will do.
 */
export function ColorModeToggle({
  variant = 'icon',
  className,
}: ColorModeToggleProps): React.ReactElement {
  // Mounted gate avoids SSR/CSR hydration mismatch — see file header.
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => {
    setMounted(true)
  }, [])

  const { theme, setTheme } = useTheme()

  // While unmounted, render the most-neutral icon (Monitor) so the layout is
  // identical pre- and post-hydration.
  const currentMode: ColorModeValue = mounted
    ? ((theme as ColorModeValue | undefined) ?? 'system')
    : 'system'

  // Dev-only warn for the unimplemented `menu` variant.
  if (process.env.NODE_ENV !== 'production' && variant === 'menu' && mounted) {
    // eslint-disable-next-line no-console
    console.warn(
      '[ColorModeToggle] variant="menu" is not yet implemented (Batch 3). Falling back to icon variant.',
    )
  }

  const Icon = MODE_ICON[currentMode]
  const nextMode = NEXT_MODE[currentMode]
  const ariaLabel = `${MODE_LABEL[nextMode]}に切り替え (現在: ${MODE_LABEL[currentMode]})`

  return (
    <ChakraIconButton
      type="button"
      aria-label={ariaLabel}
      onClick={() => setTheme(nextMode)}
      variant="ghost"
      size="md"
      borderRadius="md"
      bg="transparent"
      color="fg.default"
      _hover={{ bg: 'bg.sunken' }}
      className={className}
      data-color-mode={currentMode}
    >
      <Icon size={18} aria-hidden={true} />
    </ChakraIconButton>
  )
}

ColorModeToggle.displayName = 'ColorModeToggle'
