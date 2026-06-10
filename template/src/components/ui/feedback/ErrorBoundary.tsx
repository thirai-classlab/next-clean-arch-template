'use client'

import * as React from 'react'
import { Box, Button, Stack } from '@chakra-ui/react'
import { Alert } from './Alert'

export type ErrorBoundaryFallback =
  | React.ReactNode
  | ((error: Error, reset: () => void) => React.ReactNode)

export interface ErrorBoundaryProps {
  children: React.ReactNode
  /**
   * Fallback rendered when a descendant throws. Can be:
   * - A ReactNode (static fallback)
   * - A function `(error, reset) => ReactNode` so the consumer can render
   *   the error details and a custom retry button
   *
   * When omitted, a default Alert + reset button is rendered.
   */
  fallback?: ErrorBoundaryFallback
  /** Logging hook invoked from componentDidCatch. */
  onError?: (error: Error, info: React.ErrorInfo) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * ErrorBoundary — React class component that catches descendant errors
 * and renders a fallback. The fallback can call `reset()` to clear the
 * error state and remount children for a retry.
 *
 * Class component is required because Error Boundaries are not yet
 * expressible as hooks (React 19 may change this, but we target React 18).
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    if (this.props.onError) {
      this.props.onError(error, info)
      return
    }
    // onError 未指定時の default 動作:
    // - development: console.error で開発者に可視化
    // - production: React のデフォルト動作に委譲 (silent、boundary が捕捉した時点で再 throw されない)
    // production で console.error を呼ばないのは、運用 log を汚さず error tracking SDK
    // (Sentry / Datadog 等) の意図的な統合点を残すため。
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.error('[ErrorBoundary]', error, info)
    }
  }

  reset = (): void => {
    this.setState({ hasError: false, error: null })
  }

  render(): React.ReactNode {
    if (!this.state.hasError || this.state.error === null) {
      return this.props.children
    }

    const { fallback } = this.props
    if (typeof fallback === 'function') {
      return fallback(this.state.error, this.reset)
    }
    if (fallback !== undefined) {
      return fallback
    }

    // Default fallback: a danger Alert with a 再試行 button (Chakra v3 primitives
    // + Linear semantic tokens — replaces the prior plain-CSS button/divs).
    return (
      <Alert variant="danger" title="エラーが発生しました">
        <Stack gap="2">
          <Box as="span">{this.state.error.message || 'Unknown error'}</Box>
          <Box>
            <Button
              type="button"
              onClick={this.reset}
              variant="outline"
              size="sm"
              h="8"
              px="3"
              fontSize="sm"
              bg="transparent"
              color="fg.default"
              borderColor="border.strong"
              _hover={{ bg: 'bg.sunken' }}
              _focusVisible={{
                outline: 'none',
                boxShadow: '0 0 0 2px var(--chakra-colors-border-strong)',
              }}
            >
              再試行
            </Button>
          </Box>
        </Stack>
      </Alert>
    )
  }
}
