'use client'

// apps/web/src/app/(admin)/admin/dev/components/_components/GalleryClient.tsx
//
// Client component that owns the catalog filter UI + interactive previews
// (Toast trigger, Modal open / Drawer open / Tabs, etc).
//
// All 32 implemented previews are mounted statically (no lazy import) — the
// gallery total bundle is small relative to the underlying component lib and
// the user explicitly visits this page for a full overview, so a single
// payload is preferable to per-card Suspense churn.
//
// task-34 Step 3 additions:
//   - CategoryNav sticky top-tab with IntersectionObserver scroll-spy
//   - CATEGORY_DESCRIPTIONS imported (consumed by CategorySection internally)
//
// task-34 R2-F4:
//   - FilterBar removed (HIGH-7): CategoryNav is sole category-selection UI
//   - useActiveCategoryScrollSpy deps: [] → [filter] (M-B + F-M-02)
//   - ratioMap initialised from DOM-present categories only
//   - byCategory returns readonly array signature (Reviewer F L-01)

import * as React from 'react'
import { Search, Sparkles, Bot, Star, Eye, EyeOff, ChevronRight, Check, Upload, Copy, X, ChevronDown } from 'lucide-react'
import { Heading } from '@/components/ui/typography/Heading'
import { Text } from '@/components/ui/typography/Text'
import { Code } from '@/components/ui/typography/Code'
import { Link } from '@/components/ui/typography/Link'
import { Button } from '@/components/ui/primitive/Button'
import { IconButton } from '@/components/ui/primitive/IconButton'
import { Input } from '@/components/ui/primitive/Input'
import { Textarea } from '@/components/ui/primitive/Textarea'
import { Select } from '@/components/ui/primitive/Select'
import { Switch } from '@/components/ui/primitive/Switch'
import { RadioGroup } from '@/components/ui/primitive/Radio'
import { Checkbox } from '@/components/ui/primitive/Checkbox'
import {
  Table,
  type Column,
} from '@/components/ui/composite/Table'
import { Form } from '@/components/ui/composite/Form/Form'
import { FormField } from '@/components/ui/composite/Form/FormField'
import { Modal } from '@/components/ui/composite/Modal'
import { Drawer } from '@/components/ui/composite/Drawer'
import { Tooltip } from '@/components/ui/composite/Tooltip'
import { Popover } from '@/components/ui/composite/Popover'
import { Tabs } from '@/components/ui/composite/Tabs'
import {
  Alert,
  Spinner,
  EmptyState,
  ErrorBoundary,
  Skeleton,
  SkeletonText,
  SkeletonCircle,
  useToast,
} from '@/components/ui/feedback'
import {
  Stack,
  Inline,
  Grid,
  Container,
  Spacer,
} from '@/components/ui/layout'
import {
  BotStatusBadge,
  TranscriptBubble,
  RecallEventCard,
} from '@/components/domain'
// task-5 Admin Panel client islands (rendered with static demo props; their
// Server Action mutations fire only inside click handlers, never on render).
import { UsersTable } from '@/app/(admin)/admin/users/_components/UsersTable'
import { UserRoleControl } from '@/app/(admin)/admin/users/[id]/_components/UserRoleControl'
import { AllowListManager } from '@/app/(admin)/admin/allow-list/_components/AllowListManager'
import { AuditLogTable } from '@/app/(admin)/admin/audit-log/_components/AuditLogTable'
import { PendingApprovalsTable } from '@/app/(admin)/admin/pending-approvals/_components/PendingApprovalsTable'
import type {
  AdminUserRow,
  AdminAllowedUserRow,
  AdminAuditLogRow,
} from '@/app/(admin)/admin/_lib/admin-data'
// task-32 shell components — rendered live as nav-shell previews.
import { Sidebar } from '@/components/shell/Sidebar'
import { Topbar } from '@/components/shell/Topbar'
// Chakra UI v3 direct imports for official-only previews
import {
  AccordionRoot,
  AccordionItem,
  AccordionItemTrigger,
  AccordionItemContent,
  ActionBarRoot,
  ActionBarContent,
  ActionBarSeparator,
  ActionBarSelectionTrigger,
  AvatarRoot,
  AvatarImage,
  AvatarFallback,
  AvatarGroup,
  Blockquote,
  BlockquoteRoot,
  BlockquoteContent,
  BlockquoteCaption,
  BreadcrumbRoot,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbCurrentLink,
  BreadcrumbSeparator,
  CarouselRoot,
  CarouselItemGroup,
  CarouselItem,
  CarouselControl,
  CarouselPrevTrigger,
  CarouselNextTrigger,
  CarouselIndicatorGroup,
  CarouselIndicator,
  CheckboxCardRoot,
  CheckboxCard,
  CheckboxCardControl,
  CheckboxCardLabel,
  CheckboxCardDescription,
  CheckboxCardHiddenInput,
  ClipboardRoot,
  ClipboardTrigger,
  ClipboardIndicator,
  ClipboardInput,
  ClipboardControl,
  CloseButton,
  ColorPickerRoot,
  ColorPickerControl,
  ColorPickerTrigger,
  ColorPickerValueSwatch,
  ColorPickerContent,
  ColorPickerArea,
  ColorPickerAreaBackground,
  ColorPickerAreaThumb,
  ColorPickerChannelSlider,
  ColorPickerChannelSliderTrack,
  ColorPickerChannelSliderThumb,
  ColorPickerSwatchGroup,
  ComboboxRoot,
  ComboboxControl,
  ComboboxInput,
  ComboboxTrigger,
  ComboboxContent,
  ComboboxItem,
  ComboboxItemText,
  ComboboxItemIndicator,
  createListCollection,
  DataListRoot,
  DataListItem,
  DataListItemLabel,
  DataListItemValue,
  FieldRoot,
  FieldLabel,
  FieldHelperText,
  FieldErrorText,
  FileUploadRoot,
  FileUploadTrigger,
  FileUploadDropzone,
  FileUploadDropzoneContent,
  FileUploadItems,
  FileUploadItem,
  FileUploadItemName,
  FileUploadItemSizeText,
  FileUploadItemDeleteTrigger,
  HoverCardRoot,
  HoverCardTrigger,
  HoverCardContent,
  InputGroup,
  InputElement,
  Kbd,
  Mark,
  MenuRoot,
  MenuTrigger,
  MenuContent,
  MenuItem,
  MenuSeparator,
  NativeSelectRoot,
  NativeSelectField,
  NativeSelectIndicator,
  NumberInputRoot,
  NumberInputInput,
  NumberInputControl,
  NumberInputIncrementTrigger,
  NumberInputDecrementTrigger,
  NumberInputLabel,
  PaginationRoot,
  PaginationPrevTrigger,
  PaginationItems,
  PaginationNextTrigger,
  PinInputRoot,
  PinInputControl,
  PinInputInput,
  ProgressRoot,
  ProgressTrack,
  ProgressRange,
  ProgressLabel,
  ProgressValueText,
  ProgressCircleRoot,
  ProgressCircleCircle,
  ProgressCircleTrack,
  ProgressCircleRange,
  ProgressCircleValueText,
  QrCodeRoot,
  QrCodeFrame,
  QrCodePattern,
  RadioCardRoot,
  RadioCardLabel,
  RadioCardItem,
  RadioCardItemControl,
  RadioCardItemText,
  RadioCardItemHiddenInput,
  RatingGroupRoot,
  RatingGroupLabel,
  RatingGroupControl,
  RatingGroupItems,
  RatingGroupItem,
  RatingGroupItemIndicator,
  SelectRoot,
  SelectControl,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectItemText,
  SelectItemIndicator,
  SelectValueText,
  SelectIndicatorGroup,
  SelectIndicator,
  SliderRoot,
  SliderTrack,
  SliderRange,
  SliderThumb,
  SliderLabel,
  SplitterRoot,
  SplitterPanel,
  SplitterResizeTrigger,
  StatRoot,
  StatLabel,
  StatValueText,
  StatHelpText,
  StatUpIndicator,
  StatDownIndicator,
  StatusRoot,
  StatusIndicator,
  StepsRoot,
  StepsList,
  StepsItem,
  StepsIndicator,
  StepsNumber,
  StepsStatus,
  StepsTitle,
  StepsSeparator,
  StepsContent,
  StepsCompletedContent,
  StepsNextTrigger,
  StepsPrevTrigger,
  TagsInputRoot,
  TagsInputLabel,
  TagsInputControl,
  TagsInputInput,
  TagsInputItem,
  TagsInputItemText,
  TagsInputItemDeleteTrigger,
  TagsInputItems,
  TagsInputClearTrigger,
  TimelineRoot,
  TimelineItem,
  TimelineContent,
  TimelineTitle,
  TimelineDescription,
  TimelineIndicator,
  TimelineSeparator,
  TimelineConnector,
  ToggleRoot,
  ToggleIndicator,
  Box,
  HStack,
  VStack,
  Badge,
  Link as ChakraLink,
} from '@chakra-ui/react'
import {
  COMPONENT_CATALOG,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  CATALOG_SUMMARY,
  type ComponentCatalogEntry,
  type ComponentCategory,
} from '../_data/component-catalog'
import { CategoryNav } from './CategoryNav'
import { CategorySection } from './CategorySection'
import { ComponentCard } from './ComponentCard'

// ────────────────────────────────────────────────────────────────────────────
// Preview registry — keyed by `entry.id`. Implemented entries must provide a
// render function; placeholders are handled by ComponentCard directly.

const PREVIEWS: Record<string, () => React.ReactNode> = {
  // typography
  heading: () => <Heading level={3}>Page Title</Heading>,
  text: () => (
    <Text size="md" weight="regular">
      The quick brown fox jumps over the lazy dog.
    </Text>
  ),
  code: () => <Code language="ts">{`const x = 42`}</Code>,
  link: () => <Link href="https://recall.ai">Recall.ai</Link>,

  // primitive
  button: () => <Button>Save</Button>,
  'icon-button': () => <IconButton icon={Search} aria-label="Search" />,
  input: () => <Input placeholder="email@example.com" />,
  textarea: () => <Textarea rows={2} placeholder="Notes…" />,
  select: () => (
    <Select
      options={[
        { value: 'a', label: 'Alpha' },
        { value: 'b', label: 'Beta' },
      ]}
      placeholder="Choose…"
    />
  ),
  switch: () => <Switch label="Notify" />,
  radio: () => (
    <RadioGroup
      name="plan-preview"
      items={[
        { value: 'lite', label: 'Lite' },
        { value: 'pro', label: 'Pro' },
      ]}
    />
  ),
  checkbox: () => <Checkbox label="I agree" />,

  // composite
  table: () => <TablePreview />,
  form: () => <FormPreview />,
  modal: () => <ModalPreview />,
  drawer: () => <DrawerPreview />,
  tooltip: () => (
    <Tooltip content="Save (⌘S)">
      <Button>Hover me</Button>
    </Tooltip>
  ),
  popover: () => (
    <Popover
      trigger={<Button variant="outline">Open</Button>}
      content={
        <Text size="sm" color="muted">
          Popover body.
        </Text>
      }
    />
  ),
  tabs: () => (
    <Tabs
      defaultValue="a"
      items={[
        { value: 'a', label: 'Alpha', content: <Text size="sm">Alpha panel</Text> },
        { value: 'b', label: 'Beta', content: <Text size="sm">Beta panel</Text> },
      ]}
    />
  ),

  // feedback
  toast: () => <ToastPreview />,
  alert: () => <AlertPreview />,
  spinner: () => <Spinner size="md" label="Loading…" />,
  skeleton: () => <SkeletonPreview />,
  'empty-state': () => (
    <EmptyState
      icon={<Sparkles size={32} aria-hidden="true" />}
      title="No bots yet"
      description="Create one to start a Recall session."
    />
  ),
  'error-boundary': () => <ErrorBoundaryPreview />,

  // layout
  stack: () => (
    <Stack gap={8}>
      <Text size="sm">First</Text>
      <Text size="sm">Second</Text>
      <Text size="sm">Third</Text>
    </Stack>
  ),
  inline: () => (
    <Inline gap={8}>
      <Button size="sm">One</Button>
      <Button size="sm" variant="outline">
        Two
      </Button>
      <Button size="sm" variant="ghost">
        Three
      </Button>
    </Inline>
  ),
  grid: () => (
    <Grid cols={3} gap={8}>
      <GridCell label="A" />
      <GridCell label="B" />
      <GridCell label="C" />
    </Grid>
  ),
  container: () => (
    <Container maxWidth="sm" padding="sm">
      <Text size="sm" color="muted">
        max-width sm
      </Text>
    </Container>
  ),
  spacer: () => (
    <Stack gap={4}>
      <Text size="xs" color="muted">
        before
      </Text>
      <Spacer size={16} />
      <Text size="xs" color="muted">
        after
      </Text>
    </Stack>
  ),

  // domain
  'bot-status-badge': () => (
    <Inline gap={8}>
      <BotStatusBadge status="ready" />
      <BotStatusBadge status="in_call_recording" />
      <BotStatusBadge status="done" />
    </Inline>
  ),
  'transcript-bubble': () => (
    <TranscriptBubble
      speaker="Speaker A"
      text="This is a transcript segment example."
      timestamp={new Date('2026-05-27T10:00:00Z')}
      confidence={0.92}
    />
  ),
  'recall-event-card': () => (
    <RecallEventCard
      event={{
        id: 'evt-demo-001',
        type: 'bot.joined',
        timestamp: new Date('2026-05-27T10:00:00Z'),
      }}
    />
  ),

  // ── Domain: task-5 Admin Panel client islands ────────────────────────────
  'admin-users-table': () => <UsersTable rows={DEMO_ADMIN_USERS} />,
  'admin-user-role-control': () => (
    <UserRoleControl userId="mock-user-id" currentRole="member" />
  ),
  'admin-allow-list-manager': () => <AllowListManager rows={DEMO_ALLOW_LIST} />,
  'admin-audit-log-table': () => <AuditLogTable rows={DEMO_AUDIT_LOGS} />,
  'admin-pending-approvals-table': () => (
    <PendingApprovalsTable rows={DEMO_PENDING_USERS} />
  ),

  // ── Nav/Shell: implemented (task-32 shell port) ──────────────────────────
  'nav-sidebar': () => <SidebarPreview />,
  'nav-topbar': () => <TopbarPreview />,
  'nav-app-shell': () => <AppShellPreview />,

  // ── Typography: official-only ────────────────────────────────────────────
  'chakra-blockquote': () => <BlockquotePreview />,
  'chakra-kbd': () => (
    <Inline gap={4}>
      <Kbd>⌘</Kbd>
      <Kbd>K</Kbd>
    </Inline>
  ),
  'chakra-mark': () => (
    <p style={{ fontSize: 'var(--text-sm)' }}>
      Recall.ai supports <Mark>real-time transcription</Mark> across 6 platforms.
    </p>
  ),
  'chakra-prose': () => <ProsePreview />,

  // ── Primitive: official-only ─────────────────────────────────────────────
  'chakra-checkbox-card': () => <CheckboxCardPreview />,
  'chakra-color-picker': () => <ColorPickerPreview />,
  'chakra-combobox': () => <ComboboxPreview />,
  'chakra-file-upload': () => <FileUploadPreview />,
  'chakra-input-group': () => <InputGroupPreview />,
  'chakra-link-button': () => <LinkButtonPreview />,
  'chakra-native-select': () => <NativeSelectPreview />,
  'chakra-number-input': () => <NumberInputPreview />,
  'chakra-password-input': () => <PasswordInputPreview />,
  'chakra-pin-input': () => <PinInputPreview />,
  'chakra-radio-card': () => <RadioCardPreview />,
  'chakra-rating': () => <RatingPreview />,
  'chakra-segmented-control': () => <SegmentedControlPreview />,
  'chakra-slider': () => <SliderPreview />,
  'chakra-stepper-input': () => <StepperInputPreview />,
  'chakra-tags-input': () => <TagsInputPreview />,
  'chakra-toggle': () => <TogglePreview />,

  // ── Composite: official-only ─────────────────────────────────────────────
  'chakra-accordion': () => <AccordionPreview />,
  'chakra-carousel': () => <CarouselPreview />,
  'chakra-data-list': () => <DataListPreview />,
  'chakra-floating-panel': () => <FloatingPanelPreview />,
  'chakra-hover-card': () => <HoverCardPreview />,
  'chakra-menu': () => <MenuPreview />,
  'chakra-rich-text-editor': () => <RichTextEditorPreview />,
  'chakra-select': () => <ChakraSelectPreview />,
  'chakra-splitter': () => <SplitterPreview />,
  'chakra-steps': () => <StepsPreview />,
  'chakra-timeline': () => <TimelinePreview />,
  'chakra-toggle-tip': () => <ToggleTipPreview />,

  // ── Feedback: official-only ──────────────────────────────────────────────
  'chakra-action-bar': () => <ActionBarPreview />,
  'chakra-close-button': () => <CloseButton />,
  'chakra-progress': () => <ProgressPreview />,
  'chakra-progress-circle': () => <ProgressCirclePreview />,
  'chakra-stat': () => <StatPreview />,
  'chakra-status': () => <StatusPreview />,

  // ── Layout: official-only ────────────────────────────────────────────────
  'chakra-clipboard': () => <ClipboardPreview />,
  'chakra-color-mode': () => <ColorModePreview />,
  'chakra-field': () => <FieldPreview />,
  'chakra-qr-code': () => <QrCodePreview />,

  // ── Nav/Shell: official-only ─────────────────────────────────────────────
  'chakra-avatar': () => <AvatarPreview />,
  'chakra-breadcrumb': () => <BreadcrumbPreview />,
  'chakra-pagination': () => <PaginationPreview />,
}

// ────────────────────────────────────────────────────────────────────────────
// Sub-preview helpers — kept beside the registry so the heavier interactive
// previews can hold local state without polluting the registry signature.

function GridCell({ label }: { label: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-2)',
        borderRadius: 'var(--radius-sm)',
        background: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border)',
        fontSize: 'var(--text-xs)',
        color: 'var(--color-fg-muted)',
      }}
    >
      {label}
    </span>
  )
}

interface DemoRow {
  id: string
  name: string
  status: string
}

const DEMO_ROWS: DemoRow[] = [
  { id: '1', name: 'Alice', status: 'active' },
  { id: '2', name: 'Bob', status: 'pending' },
]

const DEMO_COLUMNS: Column<DemoRow>[] = [
  { key: 'name', header: 'Name' },
  { key: 'status', header: 'Status' },
]

function TablePreview() {
  return (
    <Table
      columns={DEMO_COLUMNS}
      data={DEMO_ROWS}
      keyExtractor={(row) => row.id}
      caption="Demo table"
    />
  )
}

function FormPreview() {
  return (
    <Form onSubmit={() => undefined} style={{ width: '100%' }}>
      <FormField name="email" label="Email">
        <Input placeholder="email@example.com" />
      </FormField>
    </Form>
  )
}

function ModalPreview() {
  const [open, setOpen] = React.useState(false)
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Open modal
      </Button>
      <Modal open={open} onOpenChange={setOpen} title="Demo modal">
        <Text size="sm">Modal body content goes here.</Text>
      </Modal>
    </>
  )
}

function DrawerPreview() {
  const [open, setOpen] = React.useState(false)
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Open drawer
      </Button>
      <Drawer open={open} onOpenChange={setOpen} side="right" title="Demo drawer">
        <Text size="sm">Drawer body content goes here.</Text>
      </Drawer>
    </>
  )
}

function ToastPreview() {
  const toast = useToast()
  return (
    <Inline gap={8}>
      <Button size="sm" variant="outline" onClick={() => toast.success('Saved!')}>
        success
      </Button>
      <Button size="sm" variant="outline" onClick={() => toast.error('Failed')}>
        error
      </Button>
    </Inline>
  )
}

// All four semantic Alert variants rendered in parallel so the gallery shows
// the full info/success/warning/danger spectrum at a glance. Each Alert carries
// its own role="alert" + data-variant + aria-live (delegated to the component).
function AlertPreview() {
  return (
    <div style={{ width: '100%' }}>
      <Stack gap={8}>
        <Alert variant="info" title="Heads up">
          Informational message — non-urgent (aria-live polite).
        </Alert>
        <Alert variant="success" title="Saved">
          The operation completed successfully.
        </Alert>
        <Alert variant="warning" title="Heads up">
          Something needs your attention soon (aria-live assertive).
        </Alert>
        <Alert variant="danger" title="Error">
          The operation failed and must be retried.
        </Alert>
      </Stack>
    </div>
  )
}

// Skeleton loading placeholders — the rectangular Skeleton plus the text and
// circle variants. `pulse` is the default animation; we leave it implicit.
function SkeletonPreview() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', width: '100%' }}>
      <SkeletonCircle size="12" data-testid="skeleton-circle" />
      <div style={{ flex: 1 }}>
        <Stack gap={8}>
          <Skeleton width="100%" height="1rem" data-testid="skeleton-rect" />
          <SkeletonText noOfLines={2} data-testid="skeleton-text" />
        </Stack>
      </div>
    </div>
  )
}

// Deliberately throws on render when `shouldThrow` is true so the ErrorBoundary
// fallback (a danger Alert + 再試行 button) is exercised in the gallery. Toggling
// the switch off and clicking 再試行 (reset) returns the boundary to the healthy
// children path.
function ThrowOnDemand({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Intentional gallery demo error')
  }
  return (
    <Text size="sm" color="muted">
      Children render normally while no error is thrown.
    </Text>
  )
}

function ErrorBoundaryPreview() {
  const [shouldThrow, setShouldThrow] = React.useState(false)
  // No `key` remount: starting healthy, flipping the switch on re-renders the
  // boundary children → ThrowOnDemand throws → the boundary catches and shows
  // its danger fallback. To recover, flip the switch off (so children render
  // healthy again) then click 再試行 (the fallback's reset) to clear hasError.
  return (
    <div style={{ width: '100%' }}>
      <Stack gap={8}>
        <Switch
          label="Throw render error"
          checked={shouldThrow}
          onCheckedChange={(next) => setShouldThrow(next)}
        />
        <ErrorBoundary>
          <ThrowOnDemand shouldThrow={shouldThrow} />
        </ErrorBoundary>
      </Stack>
    </div>
  )
}

// ── task-5 Admin Panel preview data + helpers ─────────────────────────────────
//
// Static demo rows fed into the real admin client islands. The components own
// audited Server Action mutations (changeUserRole / addAllowList / …) but those
// run only inside click handlers — never during render — so no Supabase env or
// DB is required to show the components. Mutations triggered from the gallery
// resolve to "Unauthorized" (no admin session) and surface as a Toast, which is
// the expected dev-gallery behaviour (the preview demonstrates layout + states,
// not live persistence).

const DEMO_ADMIN_USERS: readonly AdminUserRow[] = [
  {
    id: 'demo-user-1',
    email: 'admin@example.com',
    role: 'admin',
    status: 'active',
    createdAt: '2024-01-01',
  },
  {
    id: 'demo-user-2',
    email: 'member@example.com',
    role: 'member',
    status: 'active',
    createdAt: '2024-01-02',
  },
  {
    id: 'demo-user-3',
    email: 'viewer@example.com',
    role: 'viewer',
    status: 'suspended',
    createdAt: '2024-01-03',
  },
]

const DEMO_PENDING_USERS: readonly AdminUserRow[] = [
  {
    id: 'demo-pending-1',
    email: 'newcomer@example.com',
    role: 'viewer',
    status: 'pending',
    createdAt: '2026-05-30',
  },
  {
    id: 'demo-pending-2',
    email: 'applicant@example.com',
    role: 'viewer',
    status: 'pending',
    createdAt: '2026-05-31',
  },
]

const DEMO_ALLOW_LIST: readonly AdminAllowedUserRow[] = [
  {
    id: 'demo-allow-1',
    email: 'partner.co.jp',
    addedBy: 'admin@example.com',
    addedAt: '2026-05-20',
  },
  {
    id: 'demo-allow-2',
    email: 'guest@external.com',
    addedBy: 'admin@example.com',
    addedAt: '2026-05-22',
  },
]

const DEMO_AUDIT_LOGS: readonly AdminAuditLogRow[] = [
  {
    id: 'demo-audit-1',
    actorId: 'admin@example.com',
    action: 'user.role_change',
    targetType: 'user',
    targetId: 'demo-user-2',
    createdAt: '2026-05-31 10:00',
  },
  {
    id: 'demo-audit-2',
    actorId: 'admin@example.com',
    action: 'allow_list.add',
    targetType: 'allowed_user',
    targetId: null,
    createdAt: '2026-05-31 10:05',
  },
  {
    id: 'demo-audit-3',
    actorId: 'admin@example.com',
    action: 'user.approve',
    targetType: 'user',
    targetId: 'demo-pending-1',
    createdAt: '2026-05-31 10:10',
  },
]

// ── Nav/Shell implemented previews ────────────────────────────────────────────
//
// Sidebar / Topbar are full-bleed chrome built for a 100vh AppShell grid. We
// scale them down inside a bordered, clipped frame so the gallery card shows the
// real component (live, not a screenshot) without the 100vh height blowing out
// the 240px-max preview region.

function ShellFrame({
  children,
  width = 232,
  height = 200,
}: {
  children: React.ReactNode
  width?: number
  height?: number
}) {
  // transform: scale keeps the real component rendering while shrinking it to
  // fit the preview card. pointerEvents:none prevents accidental nav clicks.
  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width,
          height,
          overflow: 'hidden',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-sm)',
          transform: 'scale(0.85)',
          transformOrigin: 'top center',
          pointerEvents: 'none',
        }}
      >
        {children}
      </div>
    </div>
  )
}

function SidebarPreview() {
  return (
    <ShellFrame width={232} height={210}>
      <Sidebar />
    </ShellFrame>
  )
}

function TopbarPreview() {
  return (
    <div style={{ width: '100%' }}>
      <div
        style={{
          width: '100%',
          overflowX: 'auto',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-sm)',
          pointerEvents: 'none',
        }}
      >
        <div style={{ minWidth: 560 }}>
          <Topbar />
        </div>
      </div>
    </div>
  )
}

function AppShellPreview() {
  // The real AppShell is a 100vh role="application" grid with its own <main>
  // landmark + CommandPalette portal. Mounting it nested inside the gallery
  // would duplicate landmarks and blow out the card height, so we render a
  // representative miniature of its Sidebar + Topbar + content composition.
  return (
    <div
      style={{
        width: '100%',
        height: 180,
        display: 'grid',
        gridTemplateColumns: '64px 1fr',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-sm)',
        overflow: 'hidden',
        fontSize: 'var(--text-xs)',
        color: 'var(--color-fg-muted)',
      }}
    >
      <div
        style={{
          background: 'var(--color-bg-sunken)',
          borderRight: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
          paddingTop: 10,
        }}
      >
        <span
          style={{
            width: 18,
            height: 18,
            borderRadius: 6,
            background: 'var(--color-accent)',
            color: '#fff',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          R
        </span>
        <span style={{ fontSize: 9 }}>Sidebar</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            height: 28,
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 8px',
            background: 'var(--color-bg-elevated)',
            fontSize: 10,
          }}
        >
          Topbar (breadcrumb · MOCK · latency)
        </div>
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontStyle: 'italic',
          }}
        >
          &lt;main&gt; content
        </div>
      </div>
    </div>
  )
}

// ── Official-only preview helpers ─────────────────────────────────────────────
// Typography

function BlockquotePreview() {
  return (
    <BlockquoteRoot>
      <BlockquoteContent>
        "The best way to predict the future is to build it."
      </BlockquoteContent>
      <BlockquoteCaption>— Alan Kay</BlockquoteCaption>
    </BlockquoteRoot>
  )
}

function ProsePreview() {
  return (
    <Box maxW="320px" fontSize="sm" lineHeight="1.6" color="fg.default">
      <p style={{ margin: '0 0 8px', fontWeight: 600 }}>Meeting Transcript</p>
      <p style={{ margin: '0 0 8px' }}>
        Recall.ai captures <Mark>real-time audio</Mark> from Zoom, Meet, and Teams.
      </p>
      <Code>{`const bot = await recall.createBot(meetingUrl)`}</Code>
    </Box>
  )
}

// Primitive

function CheckboxCardPreview() {
  // Each plan is its own CheckboxCardRoot (single checkbox-card)
  return (
    <HStack gap={3}>
      {(['free', 'pro'] as const).map((plan) => (
        <CheckboxCardRoot key={plan} defaultChecked={plan === 'free'} flex="1">
          <CheckboxCardHiddenInput />
          <CheckboxCardControl>
            <CheckboxCardLabel>{plan === 'free' ? 'Free' : 'Pro'}</CheckboxCardLabel>
            <CheckboxCardDescription>{plan === 'free' ? '$0/mo' : '$49/mo'}</CheckboxCardDescription>
          </CheckboxCardControl>
        </CheckboxCardRoot>
      ))}
    </HStack>
  )
}

function ColorPickerPreview() {
  return (
    <ColorPickerRoot size="sm">
      <ColorPickerControl>
        <ColorPickerTrigger>
          <ColorPickerValueSwatch />
        </ColorPickerTrigger>
      </ColorPickerControl>
      <ColorPickerContent>
        <ColorPickerArea>
          <ColorPickerAreaBackground />
          <ColorPickerAreaThumb />
        </ColorPickerArea>
        <ColorPickerChannelSlider channel="hue">
          <ColorPickerChannelSliderTrack />
          <ColorPickerChannelSliderThumb />
        </ColorPickerChannelSlider>
      </ColorPickerContent>
    </ColorPickerRoot>
  )
}

function ComboboxPreview() {
  const cityItems = ['Tokyo', 'New York', 'London', 'Berlin', 'Sydney']
  const collection = createListCollection({ items: cityItems })
  return (
    <ComboboxRoot collection={collection} width="200px">
      <ComboboxControl>
        <ComboboxInput placeholder="Select city…" />
        <ComboboxTrigger>
          <ChevronDown size={14} />
        </ComboboxTrigger>
      </ComboboxControl>
      <ComboboxContent>
        {cityItems.map((city) => (
          <ComboboxItem key={city} item={city}>
            <ComboboxItemText>{city}</ComboboxItemText>
            <ComboboxItemIndicator>
              <Check size={12} />
            </ComboboxItemIndicator>
          </ComboboxItem>
        ))}
      </ComboboxContent>
    </ComboboxRoot>
  )
}

function FileUploadPreview() {
  return (
    <FileUploadRoot accept="image/*" maxFiles={1}>
      <FileUploadDropzone>
        <FileUploadDropzoneContent>
          <Upload size={20} />
          <span style={{ fontSize: 'var(--text-sm)', marginTop: 4, display: 'block' }}>
            Drop file here or click to browse
          </span>
        </FileUploadDropzoneContent>
        <FileUploadTrigger asChild>
          <Button size="sm" variant="outline">Browse</Button>
        </FileUploadTrigger>
      </FileUploadDropzone>
    </FileUploadRoot>
  )
}

function InputGroupPreview() {
  return (
    <VStack gap={2} align="stretch" width="220px">
      <InputGroup startElement={<Search size={14} />}>
        <input
          placeholder="Search…"
          style={{
            width: '100%',
            padding: '6px 8px 6px 32px',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 'var(--text-sm)',
            background: 'var(--color-bg-elevated)',
            color: 'var(--color-fg-default)',
            outline: 'none',
          }}
        />
      </InputGroup>
    </VStack>
  )
}

function LinkButtonPreview() {
  return (
    <HStack gap={3}>
      <ChakraLink
        href="#"
        display="inline-flex"
        alignItems="center"
        gap={1}
        px={3}
        py={1.5}
        borderRadius="md"
        bg="blue.500"
        color="white"
        fontSize="sm"
        fontWeight="medium"
        _hover={{ bg: 'blue.600', textDecoration: 'none' }}
      >
        Go to Docs
        <ChevronRight size={14} />
      </ChakraLink>
      <ChakraLink
        href="#"
        display="inline-flex"
        alignItems="center"
        gap={1}
        px={3}
        py={1.5}
        borderRadius="md"
        border="1px solid"
        borderColor="border.default"
        color="fg.default"
        fontSize="sm"
        _hover={{ bg: 'bg.subtle', textDecoration: 'none' }}
      >
        Cancel
      </ChakraLink>
    </HStack>
  )
}

function NativeSelectPreview() {
  return (
    <NativeSelectRoot width="180px">
      <NativeSelectField placeholder="Select region…">
        <option value="apac">Asia Pacific</option>
        <option value="emea">EMEA</option>
        <option value="amer">Americas</option>
      </NativeSelectField>
      <NativeSelectIndicator />
    </NativeSelectRoot>
  )
}

function NumberInputPreview() {
  return (
    <NumberInputRoot defaultValue="5" min={0} max={100} width="150px">
      <NumberInputLabel>Quantity</NumberInputLabel>
      <NumberInputControl>
        <NumberInputIncrementTrigger />
        <NumberInputInput />
        <NumberInputDecrementTrigger />
      </NumberInputControl>
    </NumberInputRoot>
  )
}

function PasswordInputPreview() {
  const [show, setShow] = React.useState(false)
  return (
    <HStack gap={1} width="200px">
      <input
        type={show ? 'text' : 'password'}
        placeholder="Password"
        defaultValue="s3cr3t"
        style={{
          flex: 1,
          padding: '6px 8px',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-sm)',
          fontSize: 'var(--text-sm)',
          background: 'var(--color-bg-elevated)',
          color: 'var(--color-fg-default)',
          outline: 'none',
        }}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? 'Hide password' : 'Show password'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 32,
          height: 32,
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          color: 'var(--color-fg-muted)',
          flexShrink: 0,
        }}
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </HStack>
  )
}

function PinInputPreview() {
  return (
    <PinInputRoot defaultValue={['1', '2', '3', '4']} otp>
      <PinInputControl>
        {[0, 1, 2, 3].map((i) => (
          <PinInputInput key={i} index={i} />
        ))}
      </PinInputControl>
    </PinInputRoot>
  )
}

function RadioCardPreview() {
  return (
    <RadioCardRoot defaultValue="monthly" orientation="horizontal">
      <RadioCardLabel>Billing cycle</RadioCardLabel>
      <HStack gap={3} mt={2}>
        {(['monthly', 'annual'] as const).map((val) => (
          <RadioCardItem key={val} value={val} flex="1">
            <RadioCardItemHiddenInput />
            <RadioCardItemControl>
              <RadioCardItemText>{val === 'monthly' ? 'Monthly' : 'Annual (-20%)'}</RadioCardItemText>
            </RadioCardItemControl>
          </RadioCardItem>
        ))}
      </HStack>
    </RadioCardRoot>
  )
}

function RatingPreview() {
  const [value, setValue] = React.useState(3)
  return (
    <RatingGroupRoot
      value={value}
      onValueChange={(details) => setValue(details.value)}
      count={5}
    >
      <RatingGroupLabel>Rate your experience</RatingGroupLabel>
      <RatingGroupControl>
        <RatingGroupItems>
          {Array.from({ length: 5 }).map((_, i) => (
            <RatingGroupItem key={i} index={i + 1}>
              <RatingGroupItemIndicator icon={<Star size={18} />} />
            </RatingGroupItem>
          ))}
        </RatingGroupItems>
      </RatingGroupControl>
    </RatingGroupRoot>
  )
}

function SegmentedControlPreview() {
  // SegmentedControl is a Chakra CLI snippet (not in core).
  // We demonstrate the equivalent using RadioCardRoot in horizontal layout.
  const [value, setValue] = React.useState('day')
  const options = [
    { value: 'day', label: 'Day' },
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' },
  ]
  return (
    <HStack
      gap={0}
      borderRadius="md"
      border="1px solid"
      borderColor="border.default"
      overflow="hidden"
      display="inline-flex"
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => setValue(opt.value)}
          style={{
            padding: '6px 16px',
            fontSize: 'var(--text-sm)',
            fontWeight: value === opt.value ? 600 : 400,
            background: value === opt.value ? 'var(--color-accent)' : 'transparent',
            color: value === opt.value ? '#fff' : 'var(--color-fg-default)',
            border: 'none',
            cursor: 'pointer',
            transition: 'background 150ms',
          }}
        >
          {opt.label}
        </button>
      ))}
    </HStack>
  )
}

function SliderPreview() {
  const [val, setVal] = React.useState(40)
  return (
    <SliderRoot
      value={[val]}
      onValueChange={(details) => setVal(details.value[0] ?? 40)}
      width="200px"
      min={0}
      max={100}
    >
      <SliderLabel>Volume: {val}%</SliderLabel>
      <SliderTrack>
        <SliderRange />
        <SliderThumb index={0} />
      </SliderTrack>
    </SliderRoot>
  )
}

function StepperInputPreview() {
  // StepperInput is a Chakra CLI snippet (not in core).
  // NumberInputRoot is the equivalent Chakra v3 core component.
  const [val, setVal] = React.useState(1)
  return (
    <NumberInputRoot
      value={String(val)}
      onValueChange={(details) => setVal(Number(details.value))}
      min={1}
      max={99}
      width="140px"
    >
      <NumberInputControl>
        <NumberInputDecrementTrigger />
        <NumberInputInput />
        <NumberInputIncrementTrigger />
      </NumberInputControl>
    </NumberInputRoot>
  )
}

function TagsInputPreview() {
  const [tags, setTags] = React.useState(['Zoom', 'Meet'])
  return (
    <TagsInputRoot
      value={tags}
      onValueChange={(details) => setTags(details.value)}
      width="240px"
    >
      <TagsInputLabel>Platforms</TagsInputLabel>
      <TagsInputControl>
        {tags.map((tag, index) => (
          <TagsInputItem key={index} index={index} value={tag}>
            <TagsInputItemText>{tag}</TagsInputItemText>
            <TagsInputItemDeleteTrigger>
              <X size={12} />
            </TagsInputItemDeleteTrigger>
          </TagsInputItem>
        ))}
        <TagsInputInput placeholder="Add platform…" />
      </TagsInputControl>
    </TagsInputRoot>
  )
}

function TogglePreview() {
  const [pressed, setPressed] = React.useState(false)
  return (
    <HStack gap={4}>
      <ToggleRoot
        pressed={pressed}
        onPressedChange={setPressed}
        aria-label="Bold"
      >
        <ToggleIndicator fallback={<span style={{ fontWeight: 400, fontStyle: 'normal' }}>B</span>}>
          <span style={{ fontWeight: 700 }}>B</span>
        </ToggleIndicator>
      </ToggleRoot>
      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-fg-muted)' }}>
        {pressed ? 'Bold on' : 'Bold off'}
      </span>
    </HStack>
  )
}

// Composite

function AccordionPreview() {
  return (
    <AccordionRoot collapsible defaultValue={['features']} width="280px">
      {[
        { value: 'features', title: 'Features', body: 'Real-time transcription, speaker diarization, recording.' },
        { value: 'pricing', title: 'Pricing', body: '$0.50/h for Meeting Bot and Desktop SDK.' },
      ].map((item) => (
        <AccordionItem key={item.value} value={item.value}>
          <AccordionItemTrigger>{item.title}</AccordionItemTrigger>
          <AccordionItemContent>{item.body}</AccordionItemContent>
        </AccordionItem>
      ))}
    </AccordionRoot>
  )
}

function CarouselPreview() {
  const slides = ['Slide 1', 'Slide 2', 'Slide 3']
  return (
    <CarouselRoot width="260px" slideCount={slides.length}>
      <CarouselItemGroup>
        {slides.map((label, i) => (
          <CarouselItem key={i} index={i}>
            <Box
              height="80px"
              bg="bg.subtle"
              border="1px solid"
              borderColor="border.default"
              borderRadius="md"
              display="flex"
              alignItems="center"
              justifyContent="center"
              fontSize="sm"
              color="fg.muted"
            >
              {label}
            </Box>
          </CarouselItem>
        ))}
      </CarouselItemGroup>
      <CarouselControl>
        <CarouselPrevTrigger asChild>
          <Button size="sm" variant="ghost">←</Button>
        </CarouselPrevTrigger>
        <CarouselIndicatorGroup>
          {slides.map((_, i) => (
            <CarouselIndicator key={i} index={i} />
          ))}
        </CarouselIndicatorGroup>
        <CarouselNextTrigger asChild>
          <Button size="sm" variant="ghost">→</Button>
        </CarouselNextTrigger>
      </CarouselControl>
    </CarouselRoot>
  )
}

function DataListPreview() {
  return (
    <DataListRoot orientation="horizontal" width="260px">
      {[
        { label: 'Status', value: 'Active' },
        { label: 'Platform', value: 'Zoom' },
        { label: 'Duration', value: '42 min' },
      ].map((item) => (
        <DataListItem key={item.label}>
          <DataListItemLabel>{item.label}</DataListItemLabel>
          <DataListItemValue>{item.value}</DataListItemValue>
        </DataListItem>
      ))}
    </DataListRoot>
  )
}

function FloatingPanelPreview() {
  // FloatingPanel is a Chakra CLI snippet (not in core).
  // We show a visually equivalent floating-style box.
  return (
    <Box
      position="relative"
      width="240px"
      height="100px"
      border="1px solid"
      borderColor="border.default"
      borderRadius="md"
      bg="bg.surface"
      boxShadow="lg"
      p={3}
      display="flex"
      flexDirection="column"
      gap={1}
    >
      <HStack justifyContent="space-between">
        <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>Floating Panel</span>
        <CloseButton />
      </HStack>
      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-fg-muted)' }}>
        Draggable + resizable overlay panel.
      </span>
    </Box>
  )
}

function HoverCardPreview() {
  return (
    <HoverCardRoot openDelay={100} closeDelay={100}>
      <HoverCardTrigger asChild>
        <ChakraLink href="#" fontSize="sm" color="blue.500">@recall-ai</ChakraLink>
      </HoverCardTrigger>
      <HoverCardContent>
        <Box p={3} maxW="200px">
          <p style={{ margin: 0, fontSize: 'var(--text-sm)', fontWeight: 600 }}>Recall.ai</p>
          <p style={{ margin: '4px 0 0', fontSize: 'var(--text-xs)', color: 'var(--color-fg-muted)' }}>
            Meeting Bot API — real-time transcription + recording.
          </p>
        </Box>
      </HoverCardContent>
    </HoverCardRoot>
  )
}

function MenuPreview() {
  return (
    <MenuRoot>
      <MenuTrigger asChild>
        <Button variant="outline" size="sm">
          Actions <ChevronDown size={14} />
        </Button>
      </MenuTrigger>
      <MenuContent>
        <MenuItem value="view">View recording</MenuItem>
        <MenuItem value="download">Download transcript</MenuItem>
        <MenuSeparator />
        <MenuItem value="delete" color="red.500">Delete bot</MenuItem>
      </MenuContent>
    </MenuRoot>
  )
}

function RichTextEditorPreview() {
  // RichTextEditor is a Chakra CLI snippet powered by Tiptap — heavy dependency.
  // We render a representative UI hint using plain HTML + Chakra primitives.
  return (
    <Box width="280px" border="1px solid" borderColor="border.default" borderRadius="md" overflow="hidden">
      <HStack
        gap={1}
        p={1}
        bg="bg.subtle"
        borderBottom="1px solid"
        borderColor="border.default"
      >
        {['B', 'I', 'U'].map((label) => (
          <button
            key={label}
            type="button"
            style={{
              width: 28,
              height: 28,
              border: '1px solid var(--color-border)',
              borderRadius: '4px',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: label === 'B' ? 700 : 400,
              fontStyle: label === 'I' ? 'italic' : 'normal',
              textDecoration: label === 'U' ? 'underline' : 'none',
              color: 'var(--color-fg-default)',
            }}
          >
            {label}
          </button>
        ))}
      </HStack>
      <Box
        p={2}
        minH="60px"
        fontSize="sm"
        color="fg.default"
        contentEditable
        suppressContentEditableWarning
        outline="none"
      >
        Type here…
      </Box>
    </Box>
  )
}

function ChakraSelectPreview() {
  const selectItems = [
    { label: 'Tokyo', value: 'tokyo' },
    { label: 'New York', value: 'ny' },
    { label: 'London', value: 'london' },
  ]
  const selectCollection = createListCollection({ items: selectItems })
  return (
    <SelectRoot collection={selectCollection} width="200px">
      <SelectControl>
        <SelectTrigger>
          <SelectValueText placeholder="Select city" />
          <SelectIndicatorGroup>
            <SelectIndicator />
          </SelectIndicatorGroup>
        </SelectTrigger>
      </SelectControl>
      <SelectContent>
        {selectItems.map((item) => (
          <SelectItem key={item.value} item={item}>
            <SelectItemText>{item.label}</SelectItemText>
            <SelectItemIndicator>
              <Check size={12} />
            </SelectItemIndicator>
          </SelectItem>
        ))}
      </SelectContent>
    </SelectRoot>
  )
}

function SplitterPreview() {
  return (
    <SplitterRoot
      orientation="horizontal"
      defaultSize={[50, 50]}
      panels={[{ id: 'a' }, { id: 'b' }]}
      width="260px"
      height="80px"
      border="1px solid"
      borderColor="border.default"
      borderRadius="md"
      overflow="hidden"
    >
      <SplitterPanel id="a">
        <Box h="full" display="flex" alignItems="center" justifyContent="center" fontSize="xs" bg="bg.subtle">
          Panel A
        </Box>
      </SplitterPanel>
      <SplitterResizeTrigger id="a:b" />
      <SplitterPanel id="b">
        <Box h="full" display="flex" alignItems="center" justifyContent="center" fontSize="xs">
          Panel B
        </Box>
      </SplitterPanel>
    </SplitterRoot>
  )
}

function StepsPreview() {
  const [step, setStep] = React.useState(1)
  return (
    <StepsRoot step={step} onStepChange={(details) => setStep(details.step)} count={3} width="280px">
      <StepsList>
        {['Setup', 'Configure', 'Done'].map((title, i) => (
          <StepsItem key={i} index={i}>
            <StepsIndicator>
              <StepsNumber />
              <StepsStatus complete={<Check size={12} />} incomplete={null} current={null} />
            </StepsIndicator>
            <StepsTitle>{title}</StepsTitle>
            <StepsSeparator />
          </StepsItem>
        ))}
      </StepsList>
      <StepsContent index={0}>Connect your account.</StepsContent>
      <StepsContent index={1}>Set meeting preferences.</StepsContent>
      <StepsContent index={2}>All set — bots are ready!</StepsContent>
      <StepsCompletedContent>All steps complete!</StepsCompletedContent>
      <HStack mt={2} gap={2}>
        <StepsPrevTrigger asChild>
          <Button size="sm" variant="outline" disabled={step === 0}>Prev</Button>
        </StepsPrevTrigger>
        <StepsNextTrigger asChild>
          <Button size="sm" disabled={step === 3}>Next</Button>
        </StepsNextTrigger>
      </HStack>
    </StepsRoot>
  )
}

function TimelinePreview() {
  const events = [
    { title: 'Bot created', desc: '10:00 AM' },
    { title: 'Joined meeting', desc: '10:02 AM' },
    { title: 'Recording started', desc: '10:03 AM' },
  ]
  return (
    <TimelineRoot width="220px">
      {events.map((evt, i) => (
        <TimelineItem key={i}>
          <TimelineIndicator />
          {i < events.length - 1 && <TimelineSeparator><TimelineConnector /></TimelineSeparator>}
          <TimelineContent>
            <TimelineTitle>{evt.title}</TimelineTitle>
            <TimelineDescription>{evt.desc}</TimelineDescription>
          </TimelineContent>
        </TimelineItem>
      ))}
    </TimelineRoot>
  )
}

function ToggleTipPreview() {
  // ToggleTip is a Chakra CLI snippet. We use HoverCard with click semantics as equivalent.
  const [open, setOpen] = React.useState(false)
  return (
    <HStack gap={2}>
      <HoverCardRoot open={open} onOpenChange={(details) => setOpen(details.open)}>
        <HoverCardTrigger asChild>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              border: '1px solid var(--color-border)',
              background: 'var(--color-bg-elevated)',
              fontSize: 13,
              cursor: 'pointer',
              color: 'var(--color-fg-muted)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ?
          </button>
        </HoverCardTrigger>
        <HoverCardContent>
          <Box p={2} maxW="180px" fontSize="xs">
            ToggleTip shows on click, not hover (WCAG 2.5.3 compliant).
          </Box>
        </HoverCardContent>
      </HoverCardRoot>
      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-fg-muted)' }}>
        (click the ? to toggle)
      </span>
    </HStack>
  )
}

// Feedback

function ActionBarPreview() {
  const [selected, setSelected] = React.useState(2)
  return (
    <ActionBarRoot open={selected > 0}>
      <ActionBarContent>
        <ActionBarSelectionTrigger>{selected} selected</ActionBarSelectionTrigger>
        <ActionBarSeparator />
        <Button size="sm" variant="outline" onClick={() => setSelected(0)}>
          Clear
        </Button>
        <Button size="sm">Delete</Button>
      </ActionBarContent>
    </ActionBarRoot>
  )
}

function ProgressPreview() {
  return (
    <VStack gap={3} width="240px">
      <ProgressRoot value={65} width="full">
        <HStack justifyContent="space-between">
          <ProgressLabel>Upload progress</ProgressLabel>
          <ProgressValueText />
        </HStack>
        <ProgressTrack>
          <ProgressRange />
        </ProgressTrack>
      </ProgressRoot>
      <ProgressRoot value={null} width="full">
        <ProgressLabel>Processing…</ProgressLabel>
        <ProgressTrack>
          <ProgressRange />
        </ProgressTrack>
      </ProgressRoot>
    </VStack>
  )
}

function ProgressCirclePreview() {
  return (
    <HStack gap={4}>
      <ProgressCircleRoot value={75} size="md">
        <ProgressCircleCircle>
          <ProgressCircleTrack />
          <ProgressCircleRange />
        </ProgressCircleCircle>
        <ProgressCircleValueText />
      </ProgressCircleRoot>
      <ProgressCircleRoot value={null} size="md">
        <ProgressCircleCircle>
          <ProgressCircleTrack />
          <ProgressCircleRange />
        </ProgressCircleCircle>
      </ProgressCircleRoot>
    </HStack>
  )
}

function StatPreview() {
  return (
    <HStack gap={4}>
      <StatRoot>
        <StatLabel>Meetings</StatLabel>
        <StatValueText>1,234</StatValueText>
        <StatHelpText>
          <StatUpIndicator /> +12% vs last month
        </StatHelpText>
      </StatRoot>
      <StatRoot>
        <StatLabel>API errors</StatLabel>
        <StatValueText>3</StatValueText>
        <StatHelpText>
          <StatDownIndicator /> -80% vs last month
        </StatHelpText>
      </StatRoot>
    </HStack>
  )
}

function StatusPreview() {
  const statuses = [
    { colorPalette: 'green', label: 'Operational' },
    { colorPalette: 'yellow', label: 'Degraded' },
    { colorPalette: 'red', label: 'Outage' },
    { colorPalette: 'blue', label: 'Maintenance' },
  ] as const
  return (
    <VStack align="flex-start" gap={2}>
      {statuses.map((s) => (
        <StatusRoot key={s.label} colorPalette={s.colorPalette}>
          <StatusIndicator />
          <span style={{ fontSize: 'var(--text-sm)' }}>{s.label}</span>
        </StatusRoot>
      ))}
    </VStack>
  )
}

// Layout

function ClipboardPreview() {
  return (
    <ClipboardRoot value="pnpm add @chakra-ui/react" width="280px">
      <ClipboardControl>
        <ClipboardInput readOnly />
        <ClipboardTrigger asChild>
          <Button size="sm" variant="outline">
            <ClipboardIndicator copied={<Check size={14} />}>
              <Copy size={14} />
            </ClipboardIndicator>
          </Button>
        </ClipboardTrigger>
      </ClipboardControl>
    </ClipboardRoot>
  )
}

function ColorModePreview() {
  // ColorMode snippet wraps next-themes. We show the conceptual toggle UI.
  const [dark, setDark] = React.useState(false)
  return (
    <HStack gap={3}>
      <button
        type="button"
        onClick={() => setDark((v) => !v)}
        aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 12px',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--color-bg-elevated)',
          cursor: 'pointer',
          fontSize: 'var(--text-sm)',
          color: 'var(--color-fg-default)',
        }}
      >
        <span>{dark ? '🌙' : '☀️'}</span>
        <span>{dark ? 'Dark' : 'Light'}</span>
      </button>
      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-fg-muted)' }}>
        (next-themes toggle)
      </span>
    </HStack>
  )
}

function FieldPreview() {
  return (
    <VStack gap={3} width="240px" align="stretch">
      <FieldRoot required>
        <FieldLabel>Email</FieldLabel>
        <input
          type="email"
          placeholder="you@example.com"
          style={{
            width: '100%',
            padding: '6px 10px',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 'var(--text-sm)',
            background: 'var(--color-bg-elevated)',
            color: 'var(--color-fg-default)',
            outline: 'none',
          }}
        />
        <FieldHelperText>We&apos;ll send a confirmation link.</FieldHelperText>
      </FieldRoot>
      <FieldRoot invalid>
        <FieldLabel>Username</FieldLabel>
        <input
          type="text"
          defaultValue="user@@@"
          style={{
            width: '100%',
            padding: '6px 10px',
            border: '1px solid var(--color-danger)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 'var(--text-sm)',
            background: 'var(--color-bg-elevated)',
            color: 'var(--color-fg-default)',
            outline: 'none',
          }}
        />
        <FieldErrorText>Invalid characters in username.</FieldErrorText>
      </FieldRoot>
    </VStack>
  )
}

function QrCodePreview() {
  return (
    <QrCodeRoot value="https://recall.ai" size="sm">
      <QrCodeFrame>
        <QrCodePattern />
      </QrCodeFrame>
    </QrCodeRoot>
  )
}

// Nav/Shell

function AvatarPreview() {
  return (
    <HStack gap={3}>
      <AvatarRoot size="md">
        <AvatarImage src="https://i.pravatar.cc/40?img=1" alt="Alice" />
        <AvatarFallback>AL</AvatarFallback>
      </AvatarRoot>
      <AvatarRoot size="md">
        <AvatarFallback>BZ</AvatarFallback>
      </AvatarRoot>
      <AvatarGroup>
        {['A', 'B', 'C'].map((i) => (
          <AvatarRoot key={i} size="sm">
            <AvatarFallback>{i}</AvatarFallback>
          </AvatarRoot>
        ))}
      </AvatarGroup>
    </HStack>
  )
}

function BreadcrumbPreview() {
  return (
    <BreadcrumbRoot>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="#">Home</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href="#">Admin</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbCurrentLink>Components</BreadcrumbCurrentLink>
        </BreadcrumbItem>
      </BreadcrumbList>
    </BreadcrumbRoot>
  )
}

function PaginationPreview() {
  const [page, setPage] = React.useState(1)
  return (
    <PaginationRoot
      page={page}
      onPageChange={(details) => setPage(details.page)}
      count={50}
      pageSize={10}
    >
      <HStack gap={1}>
        <PaginationPrevTrigger asChild>
          <Button size="sm" variant="ghost">←</Button>
        </PaginationPrevTrigger>
        <PaginationItems
          render={(pageItem) =>
            pageItem.type === 'page' ? (
              <Button
                key={pageItem.value}
                size="sm"
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                variant={(pageItem as any).isActive ? 'solid' : 'ghost'}
              >
                {pageItem.value}
              </Button>
            ) : (
              <span key={`ellipsis-${pageItem.value}`} style={{ padding: '0 4px' }}>…</span>
            )
          }
        />
        <PaginationNextTrigger asChild>
          <Button size="sm" variant="ghost">→</Button>
        </PaginationNextTrigger>
      </HStack>
    </PaginationRoot>
  )
}

// ────────────────────────────────────────────────────────────────────────────

const ALL_FILTER_VALUE = 'all' as const

// ─── Scroll-spy hook ─────────────────────────────────────────────────────────
// Returns the category whose section is currently the most visible in viewport.
// Uses IntersectionObserver with a generous top-offset for the sticky nav.
//
// Exported for unit testing.
//
// task-34 R2-F4:
//   - deps changed from [] to [filter] so the observer rebuilds when the
//     active filter changes (M-B + F-M-02).
//   - ratioMap is seeded only from DOM-present sections, not the full
//     CATEGORY_ORDER, so non-rendered categories don't skew the result.

export function useActiveCategoryScrollSpy(
  filter: ComponentCategory | typeof ALL_FILTER_VALUE,
): ComponentCategory | null {
  const [activeCategory, setActiveCategory] = React.useState<ComponentCategory | null>(null)

  React.useEffect(() => {
    // IntersectionObserver is not available in jsdom / SSR environments.
    // Guard ensures the hook is a no-op in those contexts.
    if (typeof IntersectionObserver === 'undefined') {
      return
    }

    const sectionEls = CATEGORY_ORDER.map((cat) => ({
      category: cat,
      el: document.getElementById(`category-section-${cat}`),
    })).filter((x): x is { category: ComponentCategory; el: HTMLElement } => x.el !== null)

    if (sectionEls.length === 0) {
      return
    }

    // Track intersection ratios only for DOM-present categories (M-B fix).
    // Using CATEGORY_ORDER as seed introduced phantom 0-ratio entries that
    // could silently become "best" when all visible sections had ratio 0.
    const ratioMap = new Map<ComponentCategory, number>(
      sectionEls.map(({ category }) => [category, 0]),
    )

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const matched = sectionEls.find((s) => s.el === entry.target)
          if (matched) {
            ratioMap.set(matched.category, entry.intersectionRatio)
          }
        }
        // Find the category with highest intersection ratio
        let best: ComponentCategory | null = null
        let bestRatio = -1
        for (const [cat, ratio] of ratioMap) {
          if (ratio > bestRatio) {
            best = cat
            bestRatio = ratio
          }
        }
        setActiveCategory(best)
      },
      {
        // rootMargin accounts for the sticky nav (~56px) so sections are
        // treated as "entered" once they clear the nav bar.
        rootMargin: '-60px 0px -40% 0px',
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1.0],
      },
    )

    for (const { el } of sectionEls) {
      observer.observe(el)
    }

    return () => {
      observer.disconnect()
    }
    // Re-run when filter changes so the observer is rebuilt against the
    // sections that are actually present in the DOM after a filter update.
  }, [filter])

  return activeCategory
}

// ─── GalleryClient ────────────────────────────────────────────────────────────

export interface GalleryClientProps {
  /** Override the default catalog (test injection / future filtering). */
  catalog?: ReadonlyArray<ComponentCatalogEntry>
}

export function GalleryClient({ catalog = COMPONENT_CATALOG }: GalleryClientProps = {}) {
  const [filter, setFilter] = React.useState<ComponentCategory | typeof ALL_FILTER_VALUE>(
    ALL_FILTER_VALUE,
  )

  const activeCategory = useActiveCategoryScrollSpy(filter)

  const handleSelectCategory = React.useCallback((category: ComponentCategory) => {
    // CategoryNav handles the actual scroll — we just reset the filter
    // so the target section is visible if "All" isn't already selected.
    setFilter(ALL_FILTER_VALUE)
    // Allow React to flush filter change before scrolling
    requestAnimationFrame(() => {
      const sectionEl = document.getElementById(`category-section-${category}`)
      if (sectionEl) {
        sectionEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    })
  }, [])

  const filtered = React.useMemo<ReadonlyArray<ComponentCatalogEntry>>(() => {
    if (filter === ALL_FILTER_VALUE) {
      return catalog
    }
    return catalog.filter((entry) => entry.category === filter)
  }, [catalog, filter])

  const byCategory = React.useMemo<Map<ComponentCategory, readonly ComponentCatalogEntry[]>>(
    () => {
      const map = new Map<ComponentCategory, ComponentCatalogEntry[]>()
      for (const entry of filtered) {
        const bucket = map.get(entry.category)
        if (bucket) {
          bucket.push(entry)
        } else {
          map.set(entry.category, [entry])
        }
      }
      // Return as readonly — callers must not mutate the buckets.
      return map as Map<ComponentCategory, readonly ComponentCatalogEntry[]>
    },
    [filtered],
  )

  const renderCard = React.useCallback((entry: ComponentCatalogEntry) => {
    const render = PREVIEWS[entry.id]
    return <ComponentCard entry={entry} preview={render ? render() : undefined} />
  }, [])

  return (
    <div
      data-testid="gallery-client"
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}
    >
      {/* Sticky category navigation — sole category-selection UI (FilterBar removed R2-F4) */}
      <CategoryNav activeCategory={activeCategory} onSelectCategory={handleSelectCategory} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        {CATEGORY_ORDER.map((category) => {
          const entries = byCategory.get(category) ?? []
          if (entries.length === 0) {
            return null
          }
          return (
            <CategorySection
              key={category}
              category={category}
              label={CATEGORY_LABELS[category]}
              entries={entries}
              renderCard={renderCard}
            />
          )
        })}
      </div>

      <FooterCounts />
    </div>
  )
}

function FooterCounts() {
  return (
    <footer
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 'var(--space-3)',
        padding: 'var(--space-3)',
        borderTop: '1px solid var(--color-border)',
        color: 'var(--color-fg-muted)',
        fontSize: 'var(--text-xs)',
      }}
    >
      <span>合計: {CATALOG_SUMMARY.total}</span>
      <span>✅ 実装済: {CATALOG_SUMMARY.implemented}</span>
      <span>🚧 プレースホルダー: {CATALOG_SUMMARY.placeholder}</span>
      <span>📚 公式のみ: {CATALOG_SUMMARY.officialOnly}</span>
      <span>
        Phase A: {CATALOG_SUMMARY.byPhase.A} / Phase B: {CATALOG_SUMMARY.byPhase.B} / Phase C:{' '}
        {CATALOG_SUMMARY.byPhase.C} / future: {CATALOG_SUMMARY.byPhase.future} / Chakra v3:{' '}
        {CATALOG_SUMMARY.byPhase['chakra-v3']}
      </span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)' }}>
        <Bot size={12} aria-hidden="true" /> recall_poc Component ギャラリー
      </span>
    </footer>
  )
}
