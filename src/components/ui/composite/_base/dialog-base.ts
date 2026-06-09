/**
 * Dialog base — shared types, size token maps, and helpers for Modal / Drawer.
 *
 * Both Modal and Drawer wrap @radix-ui/react-dialog (which provides focus trap,
 * Escape dismiss, aria-modal, aria-labelledby semantics out of the box). This
 * file centralizes:
 *
 * - Size → max-width / width token mapping
 * - Side variant → translate / inset class mapping (Drawer only)
 * - Common animation token references (`--duration-normal`, `--ease-out`)
 *
 * Test 4 (Drawer slide animation token) and Test 3 (aria-* attributes) both
 * lean on these tokens, so they are declared here to keep Modal and Drawer
 * consistent (and to make future Sheet / Popover variants reuse the same map).
 */

import type * as React from 'react'

// ---- Modal sizes ----

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full'

export const modalSizeClass: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-[95vw] max-h-[95vh]',
}

// ---- Drawer sizes ----

export type DrawerSize = 'sm' | 'md' | 'lg'

export const drawerSizeClass: Record<DrawerSize, string> = {
  sm: 'w-72',
  md: 'w-96',
  lg: 'w-[32rem]',
}

// ---- Drawer side variant ----

export type DrawerSide = 'left' | 'right'

export const drawerSideClass: Record<DrawerSide, string> = {
  left: 'left-0 top-0 bottom-0 border-r border-[var(--color-border)]',
  right: 'right-0 top-0 bottom-0 border-l border-[var(--color-border)]',
}

// ---- Animation tokens (referenced by inline style for Test 4 detection) ----
//
// Inline style is used so JSDOM-based tests can read the values via
// `getAttribute('style')` without needing a full CSS engine. The CSS
// variables resolve at render time on real browsers; in JSDOM the literal
// `var(--duration-normal)` token text is preserved in the style attribute,
// which is exactly what Test 4 asserts on.

export const dialogAnimationStyle: React.CSSProperties = {
  transitionDuration: 'var(--duration-normal)',
  transitionTimingFunction: 'var(--ease-out)',
  transitionProperty: 'transform, opacity',
}

/**
 * Reduced-motion variant of {@link dialogAnimationStyle}. Used by Drawer
 * when `prefers-reduced-motion: reduce` is active. Transitions are
 * collapsed to `0s` so the slide animation completes instantly, while
 * the same animation properties remain present (so radix can still drive
 * mount/unmount state transitions without layout flash).
 */
export const dialogReducedMotionStyle: React.CSSProperties = {
  transitionDuration: '0s',
  transitionTimingFunction: 'var(--ease-out)',
  transitionProperty: 'transform, opacity',
}

// ---- Shared content base classes ----

export const dialogContentBase = [
  'fixed z-50',
  'bg-[var(--color-bg-elevated)] text-[var(--color-fg-default)]',
  'shadow-[var(--shadow-lg)]',
  'focus:outline-none',
].join(' ')

export const dialogOverlayBase = [
  'fixed inset-0 z-40',
  'bg-black/40',
  'data-[state=open]:animate-in data-[state=open]:fade-in-0',
  'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
].join(' ')
