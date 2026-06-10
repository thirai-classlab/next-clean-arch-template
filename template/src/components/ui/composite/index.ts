// Composite component barrel — re-exports radix-dialog-based and other
// compound surfaces. Step 1 (Table) and Step 2 (Modal/Drawer) live here.

export { Modal } from './Modal'
export type { ModalProps } from './Modal'
export { Drawer } from './Drawer'
export type { DrawerProps } from './Drawer'
export type {
  ModalSize,
  DrawerSize,
  DrawerSide,
} from './_base/dialog-base'

// Re-export Table compound from its subdirectory barrel
export * from './Table'

// Phase 6 Batch 2 — baseline components
export { DataTable } from './DataTable'
export type { DataTableProps } from './DataTable'

export { StatCard } from './StatCard'
export type {
  StatCardProps,
  StatDelta,
  StatTrend,
} from './StatCard'

export { ConfirmDialog } from './ConfirmDialog'
export type {
  ConfirmDialogProps,
  ConfirmDialogTone,
} from './ConfirmDialog'

export { ColorModeToggle } from './ColorModeToggle'
export type {
  ColorModeToggleProps,
  ColorModeToggleVariant,
  ColorModeValue,
} from './ColorModeToggle'

// Batch 3b — Steps / Progress / CommandPalette
export { StepsComponent } from './Steps'
export type { StepsProps, StepItem } from './Steps'

export { ProgressBar } from './Progress'
export type { ProgressProps, ProgressTone } from './Progress'

export { CommandPalette } from './CommandPalette'
export type {
  CommandPaletteProps,
  CommandItem,
  CommandGroup,
} from './CommandPalette'
