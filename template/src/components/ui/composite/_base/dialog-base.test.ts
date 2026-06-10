import { describe, it, expect } from 'vitest'
import {
  modalSizeClass,
  drawerSizeClass,
  drawerSideClass,
  dialogAnimationStyle,
  dialogReducedMotionStyle,
  dialogContentBase,
  dialogOverlayBase,
} from './dialog-base'

// Pure unit tests for the dialog-base design tokens. These guard the
// SSoT (single source of truth) for size / side / animation mappings so
// regressions are caught at the token level before they propagate into
// Modal / Drawer (and future Sheet / Popover) consumers.
//
// NOTE (Chakra v3 migration): dialog-base.ts intentionally retains Tailwind
// utility class strings (e.g. 'max-w-sm', 'w-96') because those classes are
// applied via className on the Chakra Dialog.Content / Drawer.Content
// wrappers for sizing, and are not replaced by Chakra semantic tokens. The
// tests below asserting specific class strings ('max-w-sm', 'w-72', etc.)
// are therefore correct and should remain until dialog-base is refactored to
// use pure Chakra style props. See also: Modal.tsx, Drawer.tsx consumers.

describe('dialog-base — modal size token map', () => {
  it('maps every ModalSize variant to a non-empty utility class', () => {
    const variants = ['sm', 'md', 'lg', 'xl', 'full'] as const
    for (const v of variants) {
      expect(modalSizeClass[v]).toBeTruthy()
      expect(typeof modalSizeClass[v]).toBe('string')
      expect(modalSizeClass[v].length).toBeGreaterThan(0)
    }
  })

  it('uses progressively wider max-width tokens from sm → xl', () => {
    expect(modalSizeClass.sm).toBe('max-w-sm')
    expect(modalSizeClass.md).toBe('max-w-md')
    expect(modalSizeClass.lg).toBe('max-w-2xl')
    expect(modalSizeClass.xl).toBe('max-w-4xl')
    expect(modalSizeClass.full).toContain('max-w-[95vw]')
    expect(modalSizeClass.full).toContain('max-h-[95vh]')
  })
})

describe('dialog-base — drawer size token map', () => {
  it('maps every DrawerSize variant to a non-empty utility class', () => {
    const variants = ['sm', 'md', 'lg'] as const
    for (const v of variants) {
      expect(drawerSizeClass[v]).toBeTruthy()
      expect(typeof drawerSizeClass[v]).toBe('string')
    }
  })

  it('exposes width tokens for sm / md / lg', () => {
    expect(drawerSizeClass.sm).toBe('w-72')
    expect(drawerSizeClass.md).toBe('w-96')
    expect(drawerSizeClass.lg).toBe('w-[32rem]')
  })
})

describe('dialog-base — drawer side token map', () => {
  it('left side anchors to inset-left + border-right', () => {
    expect(drawerSideClass.left).toContain('left-0')
    expect(drawerSideClass.left).toContain('border-r')
    expect(drawerSideClass.left).toContain('top-0')
    expect(drawerSideClass.left).toContain('bottom-0')
  })

  it('right side anchors to inset-right + border-left', () => {
    expect(drawerSideClass.right).toContain('right-0')
    expect(drawerSideClass.right).toContain('border-l')
    expect(drawerSideClass.right).toContain('top-0')
    expect(drawerSideClass.right).toContain('bottom-0')
  })

  it('left and right both reference the design-system border token', () => {
    expect(drawerSideClass.left).toContain('var(--color-border)')
    expect(drawerSideClass.right).toContain('var(--color-border)')
  })
})

describe('dialog-base — animation style references CSS custom properties', () => {
  it('dialogAnimationStyle references --duration-normal verbatim', () => {
    expect(dialogAnimationStyle.transitionDuration).toBe('var(--duration-normal)')
  })

  it('dialogAnimationStyle references --ease-out verbatim', () => {
    expect(dialogAnimationStyle.transitionTimingFunction).toBe('var(--ease-out)')
  })

  it('dialogAnimationStyle animates only transform + opacity (compositor-friendly)', () => {
    expect(dialogAnimationStyle.transitionProperty).toBe('transform, opacity')
  })

  it('serialized animation style includes both token names', () => {
    const serialized = JSON.stringify(dialogAnimationStyle)
    expect(serialized).toContain('--duration-normal')
    expect(serialized).toContain('--ease-out')
  })
})

describe('dialog-base — reduced motion style flattens duration only', () => {
  it('dialogReducedMotionStyle has transitionDuration "0s"', () => {
    expect(dialogReducedMotionStyle.transitionDuration).toBe('0s')
  })

  it('dialogReducedMotionStyle keeps the same transition-property surface', () => {
    expect(dialogReducedMotionStyle.transitionProperty).toBe('transform, opacity')
  })

  it('dialogReducedMotionStyle still references --ease-out (kept for consistency)', () => {
    expect(dialogReducedMotionStyle.transitionTimingFunction).toBe('var(--ease-out)')
  })
})

describe('dialog-base — shared content / overlay class strings', () => {
  it('dialogContentBase includes a z-index + bg-elevated surface', () => {
    expect(dialogContentBase).toContain('z-50')
    expect(dialogContentBase).toContain('var(--color-bg-elevated)')
    expect(dialogContentBase).toContain('shadow-[var(--shadow-lg)]')
  })

  it('dialogOverlayBase covers fixed inset-0 with semi-transparent black', () => {
    expect(dialogOverlayBase).toContain('fixed inset-0')
    expect(dialogOverlayBase).toContain('bg-black/40')
  })

  it('dialogOverlayBase wires fade-in / fade-out animation states', () => {
    expect(dialogOverlayBase).toContain('data-[state=open]:animate-in')
    expect(dialogOverlayBase).toContain('data-[state=open]:fade-in-0')
    expect(dialogOverlayBase).toContain('data-[state=closed]:animate-out')
    expect(dialogOverlayBase).toContain('data-[state=closed]:fade-out-0')
  })
})
