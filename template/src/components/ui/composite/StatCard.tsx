/**
 * StatCard — Chakra UI v3 (Phase 6 Batch 2 baseline)
 *
 * A KPI / metric tile that combines Chakra v3 `Card` + `Stat` slot-recipes.
 * Designed for dashboards (admin overview, recall.ai bot stats, etc).
 *
 * Composition:
 *   Card.Root           ← outer container, semantic-tokenised borders/bg
 *     Card.Body
 *       header row      ← Label + optional icon
 *       Stat.Root       ← number/value group (semantic <dl>/<dt>/<dd>)
 *         Stat.Label    ← visually-hidden re-label (Stat provides its own)
 *         Stat.ValueText ← the number
 *         delta row     ← trend icon + delta value (success/danger/muted)
 *       helperText      ← optional small caption
 *
 * Trend → colour mapping (semantic tokens, light/dark adaptive):
 *   up    → status.success  (ArrowUp icon)
 *   down  → status.danger   (ArrowDown icon)
 *   flat  → fg.muted        (Minus icon)
 *
 * Recipe convention (matches Alert.tsx / DataTable.tsx):
 *   1. Chakra `Card.*` and `Stat.*` compound parts as the rendering base.
 *   2. Semantic tokens only — no oklch/hex hardcode.
 *   3. a11y: <dl>/<dt>/<dd> semantics provided by Stat; icon prop is
 *      decorative (`aria-hidden`).
 *   4. Static surface, no hooks → no `'use client'` directive needed.
 */

import * as React from 'react'
import { Card, Stat, Box, HStack, Text } from '@chakra-ui/react'
import { ArrowUp, ArrowDown, Minus } from 'lucide-react'

export type StatTrend = 'up' | 'down' | 'flat'

export interface StatDelta {
  /** Numeric delta — displayed as "+12%" / "-3" / "0". Sign is added by trend. */
  value: number | string
  /** up = good (green), down = bad (red), flat = neutral (muted). */
  trend: StatTrend
  /** Optional unit/label suffix shown after the delta (e.g. "vs last week"). */
  label?: string
}

export interface StatCardProps {
  /** The metric label (e.g. "Active Bots"). */
  label: string
  /** The metric value — string or React node (for formatted numbers). */
  value: React.ReactNode
  /** Optional change indicator with trend. */
  delta?: StatDelta
  /** Optional icon shown in the top-right corner. Should be decorative. */
  icon?: React.ReactNode
  /** Optional small caption below the value (e.g. "Updated 2 minutes ago"). */
  helperText?: string
  /** Optional className passthrough for layout overrides. */
  className?: string
}

const TREND_STYLE: Record<
  StatTrend,
  { color: string; Icon: React.ElementType }
> = {
  up: { color: 'status.success', Icon: ArrowUp },
  down: { color: 'status.danger', Icon: ArrowDown },
  flat: { color: 'fg.muted', Icon: Minus },
}

/**
 * StatCard — KPI tile with label, value, optional delta and helper text.
 *
 * Layout is mobile-first: the icon (if any) is anchored top-right and the
 * value/delta stack vertically. Width is 100% by default — wrap in a Grid
 * or SimpleGrid in the consumer to lay out multiple cards.
 */
export function StatCard({
  label,
  value,
  delta,
  icon,
  helperText,
  className,
}: StatCardProps): React.ReactElement {
  return (
    <Card.Root
      bg="bg.elevated"
      borderWidth="1px"
      borderColor="border.default"
      borderRadius="lg"
      boxShadow="sm"
      className={className}
    >
      <Card.Body p="6">
        <HStack justify="space-between" align="flex-start" mb="3">
          <Text
            fontSize="sm"
            fontWeight="medium"
            color="fg.muted"
            wordBreak="break-word"
            overflowWrap="anywhere"
            minWidth="0"
          >
            {label}
          </Text>
          {icon ? (
            <Box color="fg.muted" aria-hidden="true" flexShrink={0}>
              {icon}
            </Box>
          ) : null}
        </HStack>

        <Stat.Root>
          {/*
            We render our own visible Label above (HStack) so we hide the
            Stat.Label visually but keep it in the DOM for the <dl>/<dt>
            semantic relationship.
          */}
          <Stat.Label srOnly>{label}</Stat.Label>
          <Stat.ValueText
            fontSize="3xl"
            fontWeight="semibold"
            color="fg.default"
            lineHeight="tight"
            wordBreak="break-word"
            overflowWrap="anywhere"
            minWidth="0"
          >
            {value}
          </Stat.ValueText>

          {delta ? (
            <Stat.HelpText mt="2" display="inline-flex" alignItems="center" gap="1">
              {(() => {
                const { color, Icon } = TREND_STYLE[delta.trend]
                return (
                  <>
                    <Box as="span" color={color} display="inline-flex" alignItems="center">
                      <Icon size={14} aria-hidden={true} />
                    </Box>
                    <Text as="span" fontSize="sm" fontWeight="medium" color={color}>
                      {delta.value}
                    </Text>
                    {delta.label ? (
                      <Text as="span" fontSize="sm" color="fg.muted">
                        {delta.label}
                      </Text>
                    ) : null}
                  </>
                )
              })()}
            </Stat.HelpText>
          ) : null}
        </Stat.Root>

        {helperText ? (
          <Text
            fontSize="xs"
            color="fg.subtle"
            mt="2"
            wordBreak="break-word"
            overflowWrap="anywhere"
            minWidth="0"
          >
            {helperText}
          </Text>
        ) : null}
      </Card.Body>
    </Card.Root>
  )
}

StatCard.displayName = 'StatCard'
