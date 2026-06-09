/**
 * EmptyState — Chakra UI v3 (Phase 4 feedback migration, Batch 2)
 *
 * Re-implemented on top of Chakra v3 `EmptyState` compound parts (was plain
 * <div>/<h3>/<p> + cn() tailwind classes). The exported TypeScript API
 * (EmptyStateProps: icon/title/description/action/className) is kept identical
 * so every consumer compiles unchanged.
 *
 * Recipe convention (see feedback/Alert.tsx + theme/system.ts):
 *   1. Use Chakra EmptyState.* parts as the rendering base — no raw <div>/cn.
 *   2. Apply Linear-theme semantic tokens via style props (fg.muted,
 *      fg.default) — no hardcoded oklch/hex/CSS-var class strings.
 *   3. a11y: role="status" is preserved verbatim so screen readers announce
 *      the empty message; the icon is aria-hidden.
 *   4. No hooks/effects → no 'use client' directive required.
 */

import * as React from 'react'
import { Box, EmptyState as ChakraEmptyState, VStack } from '@chakra-ui/react'

export interface EmptyStateProps {
  /** Optional leading visual (e.g. a lucide-react icon node). */
  icon?: React.ReactNode
  title: string
  description?: string
  /** Optional action region rendered below the description (e.g. a Btn). */
  action?: React.ReactNode
  className?: string
}

/**
 * EmptyState — centered placeholder for "no data yet" surfaces.
 *
 * - role="status" so screen readers announce the message
 * - Icon / description / action are all optional; only `title` is required
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps): React.ReactElement {
  return (
    <ChakraEmptyState.Root role="status" className={className}>
      <ChakraEmptyState.Content
        alignItems="center"
        justifyContent="center"
        gap="3"
        px="6"
        py="12"
        textAlign="center"
      >
        {icon ? (
          <ChakraEmptyState.Indicator color="fg.muted" aria-hidden="true">
            {icon}
          </ChakraEmptyState.Indicator>
        ) : null}

        <VStack gap="2" textAlign="center">
          <ChakraEmptyState.Title
            fontSize="lg"
            fontWeight="semibold"
            color="fg.default"
          >
            {title}
          </ChakraEmptyState.Title>

          {description ? (
            <ChakraEmptyState.Description
              maxW="md"
              fontSize="sm"
              color="fg.muted"
            >
              {description}
            </ChakraEmptyState.Description>
          ) : null}
        </VStack>

        {action ? <Box mt="2">{action}</Box> : null}
      </ChakraEmptyState.Content>
    </ChakraEmptyState.Root>
  )
}

EmptyState.displayName = 'EmptyState'
