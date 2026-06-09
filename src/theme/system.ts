/**
 * Chakra UI v3 — Linear design-token port
 *
 * SSoT: apps/web/src/styles/tokens.css
 * All oklch values and clamp() expressions are lifted verbatim from tokens.css.
 * Chakra v3 tokens accept any valid CSS value string, so oklch() and clamp()
 * are stored directly as token values (§3.2 of chakra-ui-migration.md).
 *
 * Color mode:
 *   - Chakra v3 + next-themes uses `attribute="class"` on <html>
 *   - `_dark` condition fires when `html` has class="dark"
 *   - The existing `data-theme="light|dark"` on <html> is kept for backwards
 *     compat with existing CSS vars; next-themes syncs both via the class attr.
 */

import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react'

const config = defineConfig({
  theme: {
    // ── Raw palette tokens ─────────────────────────────────────
    tokens: {
      colors: {
        // Light palette
        'bg-base-light':         { value: 'oklch(99% 0 0)' },
        'bg-elevated-light':     { value: 'oklch(100% 0 0)' },
        'bg-sunken-light':       { value: 'oklch(93% 0 0)' },
        'bg-overlay-light':      { value: 'oklch(100% 0 0 / 0.95)' },
        'fg-default-light':      { value: 'oklch(18% 0 0)' },
        'fg-muted-light':        { value: 'oklch(50% 0 0)' },
        'fg-subtle-light':       { value: 'oklch(70% 0 0)' },
        'accent-light':          { value: 'oklch(55% 0.18 250)' },
        'accent-text-light':     { value: 'oklch(45% 0.20 250)' },
        'accent-hover-light':    { value: 'oklch(50% 0.18 250)' },
        'accent-subtle-light':   { value: 'oklch(95% 0.05 250)' },
        'danger-light':          { value: 'oklch(55% 0.20 25)' },
        'danger-subtle-light':   { value: 'oklch(96% 0.04 25)' },
        'success-light':         { value: 'oklch(55% 0.18 145)' },
        'success-subtle-light':  { value: 'oklch(96% 0.04 145)' },
        'warning-light':         { value: 'oklch(70% 0.18 75)' },
        'warning-subtle-light':  { value: 'oklch(97% 0.04 75)' },
        'border-light':          { value: 'oklch(88% 0 0)' },
        'border-strong-light':   { value: 'oklch(70% 0 0)' },

        // Dark palette
        'bg-base-dark':          { value: 'oklch(12% 0 0)' },
        'bg-elevated-dark':      { value: 'oklch(16% 0 0)' },
        'bg-sunken-dark':        { value: 'oklch(10% 0 0)' },
        'bg-overlay-dark':       { value: 'oklch(18% 0 0 / 0.95)' },
        'fg-default-dark':       { value: 'oklch(93% 0 0)' },
        'fg-muted-dark':         { value: 'oklch(60% 0 0)' },
        'fg-subtle-dark':        { value: 'oklch(40% 0 0)' },
        'accent-dark':           { value: 'oklch(65% 0.18 250)' },
        'accent-text-dark':      { value: 'oklch(70% 0.20 250)' },
        'accent-hover-dark':     { value: 'oklch(70% 0.18 250)' },
        'accent-subtle-dark':    { value: 'oklch(20% 0.08 250)' },
        'danger-dark':           { value: 'oklch(65% 0.20 25)' },
        'danger-subtle-dark':    { value: 'oklch(18% 0.06 25)' },
        'success-dark':          { value: 'oklch(65% 0.18 145)' },
        'success-subtle-dark':   { value: 'oklch(18% 0.06 145)' },
        'warning-dark':          { value: 'oklch(75% 0.18 75)' },
        'warning-subtle-dark':   { value: 'oklch(18% 0.06 75)' },
        'border-dark':           { value: 'oklch(25% 0 0)' },
        'border-strong-dark':    { value: 'oklch(35% 0 0)' },
      },

      fonts: {
        sans: { value: "'Inter', system-ui, sans-serif" },
        mono: { value: "'JetBrains Mono', 'Fira Code', monospace" },
      },

      // Fluid font sizes — clamp() values lifted verbatim from tokens.css
      fontSizes: {
        xs:   { value: 'clamp(0.7rem, 0.68rem + 0.1vw, 0.75rem)' },
        sm:   { value: 'clamp(0.8rem, 0.78rem + 0.1vw, 0.875rem)' },
        md:   { value: 'clamp(0.9rem, 0.88rem + 0.1vw, 1rem)' },
        lg:   { value: 'clamp(1rem, 0.96rem + 0.2vw, 1.125rem)' },
        xl:   { value: 'clamp(1.125rem, 1.05rem + 0.35vw, 1.25rem)' },
        '2xl': { value: 'clamp(1.25rem, 1.1rem + 0.75vw, 1.5rem)' },
        '3xl': { value: 'clamp(1.5rem, 1.2rem + 1.5vw, 2rem)' },
        '4xl': { value: 'clamp(1.875rem, 1.4rem + 2.4vw, 2.5rem)' },
        '5xl': { value: 'clamp(2.25rem, 1.5rem + 3.75vw, 3.5rem)' },
        '6xl': { value: 'clamp(2.75rem, 1.5rem + 6.25vw, 5rem)' },
      },

      lineHeights: {
        tight:   { value: '1.2' },
        normal:  { value: '1.5' },
        relaxed: { value: '1.75' },
      },

      fontWeights: {
        regular:  { value: '400' },
        medium:   { value: '500' },
        semibold: { value: '600' },
        bold:     { value: '700' },
      },

      // 4px-based spacing scale from tokens.css
      spacing: {
        '1':  { value: '4px' },
        '2':  { value: '8px' },
        '3':  { value: '12px' },
        '4':  { value: '16px' },
        '6':  { value: '24px' },
        '8':  { value: '32px' },
        '12': { value: '48px' },
        '16': { value: '64px' },
      },

      radii: {
        sm:   { value: '4px' },
        md:   { value: '6px' },
        lg:   { value: '8px' },
        xl:   { value: '12px' },
        full: { value: '9999px' },
      },

      shadows: {
        sm:      { value: '0 1px 2px oklch(0% 0 0 / 0.06)' },
        md:      { value: '0 4px 6px oklch(0% 0 0 / 0.08), 0 1px 3px oklch(0% 0 0 / 0.04)' },
        lg:      { value: '0 10px 15px oklch(0% 0 0 / 0.10), 0 4px 6px oklch(0% 0 0 / 0.05)' },
        overlay: { value: '0 20px 40px oklch(0% 0 0 / 0.16)' },
      },

      durations: {
        fast:   { value: '100ms' },
        normal: { value: '200ms' },
        slow:   { value: '350ms' },
      },

      easings: {
        out:     { value: 'cubic-bezier(0.16, 1, 0.3, 1)' },
        inOut:   { value: 'cubic-bezier(0.4, 0, 0.2, 1)' },
        spring:  { value: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
      },
    },

    // ── Semantic tokens (light / dark via _dark condition) ─────
    semanticTokens: {
      colors: {
        // Backgrounds
        'bg.base': {
          value: {
            base: '{colors.bg-base-light}',
            _dark: '{colors.bg-base-dark}',
          },
        },
        'bg.elevated': {
          value: {
            base: '{colors.bg-elevated-light}',
            _dark: '{colors.bg-elevated-dark}',
          },
        },
        'bg.sunken': {
          value: {
            base: '{colors.bg-sunken-light}',
            _dark: '{colors.bg-sunken-dark}',
          },
        },
        'bg.overlay': {
          value: {
            base: '{colors.bg-overlay-light}',
            _dark: '{colors.bg-overlay-dark}',
          },
        },

        // Foregrounds
        'fg.default': {
          value: {
            base: '{colors.fg-default-light}',
            _dark: '{colors.fg-default-dark}',
          },
        },
        'fg.muted': {
          value: {
            base: '{colors.fg-muted-light}',
            _dark: '{colors.fg-muted-dark}',
          },
        },
        'fg.subtle': {
          value: {
            base: '{colors.fg-subtle-light}',
            _dark: '{colors.fg-subtle-dark}',
          },
        },

        // Accent (Linear blue — resolves to #2A6FDB in light mode)
        'accent.default': {
          value: {
            base: '{colors.accent-light}',
            _dark: '{colors.accent-dark}',
          },
        },
        'accent.text': {
          value: {
            base: '{colors.accent-text-light}',
            _dark: '{colors.accent-text-dark}',
          },
        },
        'accent.hover': {
          value: {
            base: '{colors.accent-hover-light}',
            _dark: '{colors.accent-hover-dark}',
          },
        },
        'accent.subtle': {
          value: {
            base: '{colors.accent-subtle-light}',
            _dark: '{colors.accent-subtle-dark}',
          },
        },

        // Status — danger
        'status.danger': {
          value: {
            base: '{colors.danger-light}',
            _dark: '{colors.danger-dark}',
          },
        },
        'status.dangerSubtle': {
          value: {
            base: '{colors.danger-subtle-light}',
            _dark: '{colors.danger-subtle-dark}',
          },
        },

        // Status — success
        'status.success': {
          value: {
            base: '{colors.success-light}',
            _dark: '{colors.success-dark}',
          },
        },
        'status.successSubtle': {
          value: {
            base: '{colors.success-subtle-light}',
            _dark: '{colors.success-subtle-dark}',
          },
        },

        // Status — warning
        'status.warning': {
          value: {
            base: '{colors.warning-light}',
            _dark: '{colors.warning-dark}',
          },
        },
        'status.warningSubtle': {
          value: {
            base: '{colors.warning-subtle-light}',
            _dark: '{colors.warning-subtle-dark}',
          },
        },

        // Borders
        'border.default': {
          value: {
            base: '{colors.border-light}',
            _dark: '{colors.border-dark}',
          },
        },
        'border.strong': {
          value: {
            base: '{colors.border-strong-light}',
            _dark: '{colors.border-strong-dark}',
          },
        },
      },
    },
  },
})

export const system = createSystem(defaultConfig, config)
