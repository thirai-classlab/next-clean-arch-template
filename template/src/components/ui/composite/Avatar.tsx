/**
 * Avatar — Chakra UI v3 (task-32 Batch 3a baseline)
 *
 * Wraps Chakra v3 `Avatar.*` compound parts with Linear semantic tokens.
 * Supports single avatar and avatar group rendering.
 *
 * Recipe convention (matches Tooltip.tsx / Menu.tsx):
 *   1. Chakra Avatar.* parts as the rendering base — no raw HTML.
 *   2. Linear semantic tokens only — no hardcoded oklch/hex.
 *   3. a11y: img alt text delegated to Avatar.Image; fallback text for
 *      screen readers when no image is available.
 *   4. Static surface (no hooks) → no 'use client' needed; but kept for
 *      consistency with the composite layer convention.
 */
'use client'

import * as React from 'react'
import { Avatar as ChakraAvatar, AvatarGroup as ChakraAvatarGroup, Box } from '@chakra-ui/react'

// ── Size map ──────────────────────────────────────────────────────────────────

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

const SIZE_MAP: Record<AvatarSize, string> = {
  xs: '1.5rem',   // 24px
  sm: '2rem',     // 32px
  md: '2.5rem',   // 40px
  lg: '3rem',     // 48px
  xl: '4rem',     // 64px
}

const FONT_SIZE_MAP: Record<AvatarSize, string> = {
  xs: 'xs',
  sm: 'xs',
  md: 'sm',
  lg: 'md',
  xl: 'lg',
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface AvatarProps {
  /** URL of the avatar image. */
  src?: string
  /** Alt text for the image (required for accessibility when src is provided). */
  alt?: string
  /** Fallback text shown when the image fails to load or is not provided.
   *  Typically initials like "TH". */
  fallback?: string
  /** Visual size of the avatar. Defaults to `md`. */
  size?: AvatarSize
  className?: string
}

export interface AvatarGroupProps {
  /** Avatar items in the group. */
  children: React.ReactNode
  /**
   * Visual size applied to all avatars in the group. Defaults to `md`.
   * Note: Chakra v3 AvatarGroup does not accept size/max props directly;
   * size is applied to each Avatar individually inside the group.
   */
  size?: AvatarSize
  /** Accessible label for the group (e.g. "Members"). Defaults to "Avatars". */
  'aria-label'?: string
  className?: string
}

// ── Sub-components for slot API ───────────────────────────────────────────────

function AvatarGroupSlot({
  children,
  className,
  'aria-label': ariaLabel = 'Avatars',
}: AvatarGroupProps): React.ReactElement {
  return (
    <Box
      role="group"
      aria-label={ariaLabel}
      display="flex"
      flexDirection="row"
      className={className}
    >
      <ChakraAvatarGroup gap="-2">
        {children}
      </ChakraAvatarGroup>
    </Box>
  )
}
AvatarGroupSlot.displayName = 'Avatar.Group'

// ── Primary component ─────────────────────────────────────────────────────────

/**
 * Avatar — circular user image with initials fallback.
 *
 * Renders a Chakra v3 Avatar with Linear semantic token surface and border.
 * When `src` is absent or fails to load, the `fallback` text (initials) is
 * shown on a `bg.sunken` background.
 */
export function Avatar({
  src,
  alt,
  fallback,
  size = 'md',
  className,
}: AvatarProps): React.ReactElement {
  const dimension = SIZE_MAP[size]
  const fontSize = FONT_SIZE_MAP[size]

  return (
    <ChakraAvatar.Root
      w={dimension}
      h={dimension}
      borderRadius="full"
      borderWidth="1px"
      borderColor="border.default"
      overflow="hidden"
      flexShrink={0}
      className={className}
    >
      {src ? (
        <ChakraAvatar.Image
          src={src}
          alt={alt ?? fallback ?? 'avatar'}
          w="full"
          h="full"
          objectFit="cover"
        />
      ) : null}
      <ChakraAvatar.Fallback
        bg="bg.sunken"
        color="fg.muted"
        fontSize={fontSize}
        fontWeight="medium"
        display="flex"
        alignItems="center"
        justifyContent="center"
        w="full"
        h="full"
        aria-label={alt ?? fallback}
      >
        {fallback ?? <ChakraAvatar.Icon color="fg.subtle" />}
      </ChakraAvatar.Fallback>
    </ChakraAvatar.Root>
  )
}

Avatar.displayName = 'Avatar'

// Attach slot sub-components.
Avatar.Group = AvatarGroupSlot
