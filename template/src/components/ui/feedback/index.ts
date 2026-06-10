// Feedback layer (Phase C) barrel — Toast / Alert / Spinner / Skeleton /
// EmptyState / ErrorBoundary. The Toaster re-export from ./Toast is mounted
// once in the root layout (apps/web/src/app/layout.tsx).

export { useToast, Toaster } from './Toast'
export type { ToastApi, ToastOptions } from './Toast'

export { Alert } from './Alert'
export type { AlertProps } from './Alert'

export { Spinner } from './Spinner'
export type { SpinnerProps, SpinnerSize } from './Spinner'

export { Skeleton, SkeletonText, SkeletonCircle } from './Skeleton'
export type { SkeletonProps, SkeletonVariant } from './Skeleton'

export { EmptyState } from './EmptyState'
export type { EmptyStateProps } from './EmptyState'

export { ErrorBoundary } from './ErrorBoundary'
export type { ErrorBoundaryProps, ErrorBoundaryFallback } from './ErrorBoundary'
