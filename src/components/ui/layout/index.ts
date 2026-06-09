// Layout layer (Phase C, Step 2-A) barrel — Stack / Inline / Grid / Container /
// Spacer. These primitives compose pages and surfaces; pair them with the
// primitive / typography / composite / feedback layers for full pages.

export { Stack } from './Stack'
export type {
  StackProps,
  StackGap,
  StackDirection,
  StackAlign,
  StackJustify,
} from './Stack'

export { Inline } from './Inline'
export type {
  InlineProps,
  InlineGap,
  InlineAlign,
  InlineJustify,
} from './Inline'

export { Grid } from './Grid'
export type { GridProps, GridCols, GridGap } from './Grid'

export { Container } from './Container'
export type { ContainerProps, ContainerMaxWidth, ContainerPadding } from './Container'

export { Spacer } from './Spacer'
export type { SpacerProps, SpacerSize, SpacerAxis } from './Spacer'
