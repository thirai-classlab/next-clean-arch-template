/**
 * Steps — Chakra UI v3 native (Batch 3b, task-32)
 *
 * A controlled / uncontrolled step indicator built on Chakra v3 `Steps.*`
 * slot-recipe primitives. Wraps the Ark/Zag state machine so callers only
 * need a `steps` definition array and an optional `step` + `onStepChange`
 * pair for controlled mode.
 *
 * Visual design follows the Linear semantic token palette:
 *   completed step  → accent.default (indicator fill) + accent.text (text)
 *   current  step   → accent.default (ring) + fg.default (text)
 *   pending  step   → border.default (indicator) + fg.muted (text)
 *   separator       → border.default (inactive) → accent.default (active)
 *
 * Composition:
 *   Steps.Root            ← Ark/Zag state machine + orientation
 *     Steps.List           ← <ol> wrapper
 *       Steps.Item (×N)    ← per-step container (index prop)
 *         Steps.Trigger    ← interactive / decorative trigger
 *           Steps.Indicator ← circle with number / check / current dot
 *             Steps.Status   ← swaps content by step state
 *           Steps.Title    ← label text
 *           Steps.Description ← optional sub-label
 *         Steps.Separator  ← connecting line
 *     Steps.Content (×N)  ← per-step panel (index prop)
 *     Steps.CompletedContent ← panel shown after all steps complete
 *
 * a11y:
 *   - Ark wires aria-current="step" on the active trigger automatically.
 *   - linear=true blocks keyboard navigation past invalid/incomplete steps.
 *   - Check icon uses aria-hidden; circle numbers convey position.
 *
 * 'use client' is required: Steps.Root uses useState (Zag state machine).
 */
'use client'

import * as React from 'react'
import {
  Steps,
  Box,
  HStack,
  Text,
} from '@chakra-ui/react'
import { Check } from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

export interface StepItem {
  /** Unique label shown in the indicator row. */
  title: string
  /** Optional sub-label below the title. */
  description?: string
  /** Per-step panel content rendered when the step is active. */
  content?: React.ReactNode
}

export interface StepsProps {
  /** Ordered list of step definitions. Length determines `count`. */
  steps: StepItem[]
  /**
   * Controlled: index of the currently active step (0-based).
   * Omit to let the component manage state internally.
   */
  step?: number
  /** Controlled: called when the user navigates (next/prev/click). */
  onStepChange?: (details: { step: number }) => void
  /**
   * If true, the user must complete steps in order.
   * Clicking future steps is disabled. Default: false.
   */
  linear?: boolean
  /** Layout direction of the step indicator row. Default: "horizontal". */
  orientation?: 'horizontal' | 'vertical'
  /**
   * Optional content rendered when all steps are completed
   * (after the last step's content).
   */
  completedContent?: React.ReactNode
  /** Show next/prev navigation buttons below the content panel. Default: true. */
  showNavigation?: boolean
  /** Optional className forwarded to Steps.Root for layout overrides. */
  className?: string
}

// ── Component ────────────────────────────────────────────────────────────────

/**
 * Steps — multi-step wizard / progress tracker.
 *
 * Uncontrolled usage (simplest):
 *   <Steps steps={[{ title: 'Plan' }, { title: 'Execute' }]} />
 *
 * Controlled usage:
 *   <Steps steps={items} step={current} onStepChange={({ step }) => setCurrent(step)} />
 */
export function StepsComponent({
  steps,
  step,
  onStepChange,
  linear = false,
  orientation = 'horizontal',
  completedContent,
  showNavigation = true,
  className,
}: StepsProps): React.ReactElement {
  return (
    <Steps.Root
      count={steps.length}
      step={step}
      onStepChange={onStepChange}
      linear={linear}
      orientation={orientation}
      className={className}
      width="full"
    >
      {/* ── Indicator row ───────────────────────────────────────── */}
      <Steps.List>
        {steps.map((item, index) => (
          <Steps.Item key={item.title} index={index}>
            <Steps.Trigger
              as="button"
              disabled={linear ? true : undefined}
              cursor={linear ? 'default' : 'pointer'}
              _focusVisible={{ outline: '2px solid', outlineColor: 'accent.default', outlineOffset: '2px' }}
            >
              <Steps.Indicator
                borderRadius="full"
                width="8"
                height="8"
                display="flex"
                alignItems="center"
                justifyContent="center"
                borderWidth="2px"
                flexShrink={0}
                /* Completed: filled accent. Current: accent ring. Pending: border only. */
                _complete={{
                  bg: 'accent.default',
                  borderColor: 'accent.default',
                  color: 'white',
                }}
                _current={{
                  bg: 'bg.elevated',
                  borderColor: 'accent.default',
                  color: 'accent.text',
                }}
                _incomplete={{
                  bg: 'bg.sunken',
                  borderColor: 'border.default',
                  color: 'fg.muted',
                }}
              >
                <Steps.Status
                  complete={<Check size={14} aria-hidden />}
                  incomplete={
                    <Text fontSize="xs" fontWeight="semibold" lineHeight="1">
                      {index + 1}
                    </Text>
                  }
                  current={
                    <Text fontSize="xs" fontWeight="semibold" lineHeight="1">
                      {index + 1}
                    </Text>
                  }
                />
              </Steps.Indicator>

              {/* Title + optional description */}
              <Box ml="2" textAlign="start">
                <Steps.Title
                  fontSize="sm"
                  fontWeight="medium"
                  color="fg.default"
                  _current={{ color: 'accent.text' }}
                  _complete={{ color: 'fg.muted' }}
                  _incomplete={{ color: 'fg.muted' }}
                >
                  {item.title}
                </Steps.Title>
                {item.description ? (
                  <Steps.Description fontSize="xs" color="fg.subtle" mt="0.5">
                    {item.description}
                  </Steps.Description>
                ) : null}
              </Box>
            </Steps.Trigger>

            {/* Connecting line (hidden on last item) */}
            {index < steps.length - 1 ? (
              <Steps.Separator
                flex="1"
                borderTopWidth="2px"
                _complete={{ borderColor: 'accent.default' }}
                _incomplete={{ borderColor: 'border.default' }}
                _current={{ borderColor: 'border.default' }}
                mx="2"
              />
            ) : null}
          </Steps.Item>
        ))}
      </Steps.List>

      {/* ── Per-step content panels ──────────────────────────────── */}
      {steps.map((item, index) =>
        item.content ? (
          <Steps.Content
            key={item.title}
            index={index}
            pt="4"
            color="fg.default"
          >
            {item.content}
          </Steps.Content>
        ) : null,
      )}

      {/* ── Completed state panel ────────────────────────────────── */}
      {completedContent ? (
        <Steps.CompletedContent pt="4" color="fg.default">
          {completedContent}
        </Steps.CompletedContent>
      ) : null}

      {/* ── Navigation buttons ───────────────────────────────────── */}
      {showNavigation ? (
        <HStack mt="4" gap="2" justify="flex-end">
          <Steps.PrevTrigger
            px="4"
            py="2"
            fontSize="sm"
            fontWeight="medium"
            borderRadius="md"
            borderWidth="1px"
            borderColor="border.default"
            color="fg.default"
            bg="transparent"
            cursor="pointer"
            _hover={{ bg: 'bg.sunken' }}
            _disabled={{ opacity: 0.4, cursor: 'not-allowed', pointerEvents: 'none' }}
          >
            前へ
          </Steps.PrevTrigger>

          <Steps.NextTrigger
            px="4"
            py="2"
            fontSize="sm"
            fontWeight="medium"
            borderRadius="md"
            color="white"
            bg="accent.default"
            cursor="pointer"
            _hover={{ bg: 'accent.hover' }}
            _disabled={{ opacity: 0.4, cursor: 'not-allowed', pointerEvents: 'none' }}
          >
            次へ
          </Steps.NextTrigger>
        </HStack>
      ) : null}
    </Steps.Root>
  )
}

StepsComponent.displayName = 'Steps'
