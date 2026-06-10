'use client'

import * as React from 'react'
import { z } from 'zod'
import { Heading } from '@/components/ui/typography/Heading'
import { Button } from '@/components/ui/primitive/Button'
import { Input } from '@/components/ui/primitive/Input'
import { Modal } from '@/components/ui/composite/Modal'
import { Drawer } from '@/components/ui/composite/Drawer'
import { Tooltip } from '@/components/ui/composite/Tooltip'
import { Popover } from '@/components/ui/composite/Popover'
import { Tabs } from '@/components/ui/composite/Tabs'
import { Form } from '@/components/ui/composite/Form/Form'
import { FormField } from '@/components/ui/composite/Form/FormField'
import { Table } from '@/components/ui/composite/Table/Table'
import type { Column } from '@/components/ui/composite/Table/Table'
// ── Batch 2 imports (task-32 Step 5 E2E fixtures) ───────────────────────────
import { DataTable } from '@/components/ui/composite/DataTable/DataTable'
import type { ColumnDef } from '@tanstack/react-table'
import { ConfirmDialog } from '@/components/ui/composite/ConfirmDialog'
import { ColorModeToggle } from '@/components/ui/composite/ColorModeToggle'
import { CommandPalette } from '@/components/ui/composite/CommandPalette'
import type { CommandItem } from '@/components/ui/composite/CommandPalette'
import { StatCard } from '@/components/ui/composite/StatCard'

// ── DataTable data (Batch 2 fixture) ────────────────────────────────────────
interface UserRow {
  id: string
  username: string
  department: string
  score: number
}

const DT_DATA: UserRow[] = Array.from({ length: 20 }, (_, i) => ({
  id: String(i + 1),
  username: `User${String(i).padStart(2, '0')}`,
  department: ['Engineering', 'Design', 'Marketing', 'Sales'][i % 4],
  score: 100 - i * 4,
}))

const DT_COLUMNS: ColumnDef<UserRow>[] = [
  { id: 'username', accessorKey: 'username', header: 'Username', enableSorting: true },
  { id: 'department', accessorKey: 'department', header: 'Department', enableSorting: true },
  { id: 'score', accessorKey: 'score', header: 'Score', enableSorting: true },
]

// ── CommandPalette items (Batch 2 fixture) ───────────────────────────────────
const PALETTE_ITEMS: CommandItem[] = [
  { value: 'dashboard', label: 'Dashboard', hint: '⌘D', onSelect: () => {} },
  { value: 'users', label: 'Users', hint: '⌘U', onSelect: () => {} },
  { value: 'settings', label: 'Settings', hint: '⌘,', onSelect: () => {} },
  { value: 'audit', label: 'Audit Log', onSelect: () => {} },
  { value: 'bots', label: 'Bot Management', onSelect: () => {} },
]

// ── Table data ──────────────────────────────────────────────────────────────
interface Person {
  id: string
  name: string
  role: string
  status: string
}

const TABLE_DATA: Person[] = [
  { id: '1', name: 'Alice', role: 'Admin', status: 'Active' },
  { id: '2', name: 'Bob', role: 'Member', status: 'Active' },
  { id: '3', name: 'Carol', role: 'Viewer', status: 'Inactive' },
  { id: '4', name: 'Dave', role: 'Member', status: 'Active' },
  { id: '5', name: 'Eve', role: 'Admin', status: 'Inactive' },
]

const TABLE_COLUMNS: Column<Person>[] = [
  { key: 'name', header: 'Name', sortable: true },
  { key: 'role', header: 'Role', sortable: true },
  { key: 'status', header: 'Status' },
]

// ── Form schema ──────────────────────────────────────────────────────────────
const formSchema = z.object({
  email: z.string().email('Valid email required'),
  name: z.string().min(1, 'Name is required'),
})
type FormValues = z.infer<typeof formSchema>

// ── Tabs items ───────────────────────────────────────────────────────────────
const TABS_ITEMS = [
  { value: 'tab1', label: 'Tab One', content: <p data-testid="tab-panel-1">Content of Tab One</p> },
  { value: 'tab2', label: 'Tab Two', content: <p data-testid="tab-panel-2">Content of Tab Two</p> },
  { value: 'tab3', label: 'Tab Three (disabled)', content: <p data-testid="tab-panel-3">Content of Tab Three</p>, disabled: true },
]

// Pill variant items (separate testids so E2E can target the pill tablist
// independently of the underline one above).
const TABS_PILL_ITEMS = [
  { value: 'pill1', label: 'Pill One', content: <p data-testid="pill-panel-1">Content of Pill One</p> },
  { value: 'pill2', label: 'Pill Two', content: <p data-testid="pill-panel-2">Content of Pill Two</p> },
  { value: 'pill3', label: 'Pill Three', content: <p data-testid="pill-panel-3">Content of Pill Three</p> },
]

const sectionStyle: React.CSSProperties = { marginBottom: '2rem' }

export default function CompositePage() {
  const [modalOpen, setModalOpen] = React.useState(false)
  const [drawerLeftOpen, setDrawerLeftOpen] = React.useState(false)
  const [drawerRightOpen, setDrawerRightOpen] = React.useState(false)
  const [sortColumn, setSortColumn] = React.useState<keyof Person | undefined>(undefined)
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('asc')
  const [page, setPage] = React.useState(1)
  const [formSubmitted, setFormSubmitted] = React.useState(false)
  // ── Batch 2 state ─────────────────────────────────────────────────────────
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [confirmDangerOpen, setConfirmDangerOpen] = React.useState(false)
  const [confirmResult, setConfirmResult] = React.useState<string | null>(null)
  const [paletteOpen, setPaletteOpen] = React.useState(false)
  const [paletteEmptyOpen, setPaletteEmptyOpen] = React.useState(false)

  const PAGE_SIZE = 3

  const handleSort = (col: keyof Person) => {
    if (sortColumn === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(col)
      setSortDir('asc')
    }
    // Reset to first page when the sort key/direction changes so the user
    // always sees the new top-of-list row (mirrors typical data-table UX).
    setPage(1)
  }

  // The Table component runs in manualSorting + manualPagination mode (it never
  // re-orders or slices `data` itself — see Table.tsx contract). This demo
  // therefore owns the sort + page math here and feeds the Table an already
  // sorted-and-sliced page. This is what makes the sort headers / pagination
  // buttons actually reorder rows in the gallery (and lets E2E assert it).
  const sortedData = React.useMemo<Person[]>(() => {
    if (!sortColumn) return TABLE_DATA
    const copy = [...TABLE_DATA]
    copy.sort((a, b) => {
      const av = String(a[sortColumn])
      const bv = String(b[sortColumn])
      const cmp = av.localeCompare(bv)
      return sortDir === 'asc' ? cmp : -cmp
    })
    return copy
  }, [sortColumn, sortDir])

  const pagedData = React.useMemo<Person[]>(() => {
    const start = (page - 1) * PAGE_SIZE
    return sortedData.slice(start, start + PAGE_SIZE)
  }, [sortedData, page])

  const handleFormSubmit = (data: FormValues) => {
    setFormSubmitted(true)
    // eslint-disable-next-line no-console
    console.info('Form submitted:', data)
  }

  return (
    <div
      data-testid="composite-page"
      style={{ padding: '2rem', maxWidth: '960px', margin: '0 auto', minHeight: '100vh' }}
    >
      <div style={{ marginBottom: '2rem' }}>
        <Heading level={1}>Component Library Phase B — Composite</Heading>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <section data-testid="section-table" style={sectionStyle}>
        <div style={{ marginBottom: '1rem' }}><Heading level={2}>Table</Heading></div>
        <Table<Person>
          columns={TABLE_COLUMNS}
          data={pagedData}
          keyExtractor={(row) => row.id}
          sortColumn={sortColumn}
          sortDirection={sortDir}
          onSort={handleSort}
          caption="Team members"
          pagination={{
            current: page,
            total: TABLE_DATA.length,
            pageSize: PAGE_SIZE,
            onPageChange: setPage,
          }}
        />
      </section>

      {/* ── Table (empty state) ───────────────────────────────────────────── */}
      <section data-testid="section-table-empty" style={sectionStyle}>
        <div style={{ marginBottom: '1rem' }}><Heading level={2}>Table (empty)</Heading></div>
        <Table<Person>
          columns={TABLE_COLUMNS}
          data={[]}
          keyExtractor={(row) => row.id}
          caption="No team members"
          empty={<span data-testid="table-empty-message">No records found</span>}
        />
      </section>

      {/* ── Form ──────────────────────────────────────────────────────────── */}
      <section data-testid="section-form" style={sectionStyle}>
        <div style={{ marginBottom: '1rem' }}><Heading level={2}>Form</Heading></div>
        {/* Form stays mounted after a successful submit so the error→success
            transition is observable in one flow (validation errors clear, the
            success message appears as a sibling). zod + RHF surface the errors
            through FormField → Field.ErrorText (role=alert) automatically. */}
        <Form<FormValues>
          schema={formSchema}
          defaultValues={{ email: '', name: '' }}
          onSubmit={handleFormSubmit}
          data-testid="demo-form"
          style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px' }}
        >
          <FormField name="name" label="Name" required hint="Your full name">
            <Input placeholder="Enter your name" data-testid="form-name-input" />
          </FormField>
          <FormField name="email" label="Email" required>
            <Input type="email" placeholder="Enter your email" data-testid="form-email-input" />
          </FormField>
          <Button type="submit" variant="solid" data-testid="form-submit">
            Submit
          </Button>
        </Form>
        {formSubmitted ? (
          <p data-testid="form-success" style={{ marginTop: '1rem' }}>
            Form submitted successfully!
          </p>
        ) : null}
      </section>

      {/* ── Modal ─────────────────────────────────────────────────────────── */}
      <section data-testid="section-modal" style={sectionStyle}>
        <div style={{ marginBottom: '1rem' }}><Heading level={2}>Modal</Heading></div>
        <Button
          variant="solid"
          data-testid="modal-trigger"
          onClick={() => setModalOpen(true)}
        >
          Open Modal
        </Button>
        <Modal
          open={modalOpen}
          onOpenChange={setModalOpen}
          title="Demo Modal"
          description="This is a modal dialog for testing focus trap and keyboard navigation."
          footer={
            <>
              <Button
                variant="outline"
                data-testid="modal-cancel"
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="solid"
                data-testid="modal-confirm"
                onClick={() => setModalOpen(false)}
              >
                Confirm
              </Button>
            </>
          }
        >
          <p>Modal body content. Use Tab to navigate between the buttons below.</p>
          <Input
            label="Modal input"
            placeholder="Type here…"
            data-testid="modal-input"
            style={{ marginTop: '1rem' }}
          />
        </Modal>
      </section>

      {/* ── Drawer ────────────────────────────────────────────────────────── */}
      <section data-testid="section-drawer" style={sectionStyle}>
        <div style={{ marginBottom: '1rem' }}><Heading level={2}>Drawer</Heading></div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button
            variant="solid"
            data-testid="drawer-left-trigger"
            onClick={() => setDrawerLeftOpen(true)}
          >
            Open Drawer (Left)
          </Button>
          <Button
            variant="outline"
            data-testid="drawer-right-trigger"
            onClick={() => setDrawerRightOpen(true)}
          >
            Open Drawer (Right)
          </Button>
        </div>
        <Drawer
          open={drawerLeftOpen}
          onOpenChange={setDrawerLeftOpen}
          side="left"
          title="Left Drawer"
        >
          <p data-testid="drawer-left-content">Left drawer content.</p>
        </Drawer>
        <Drawer
          open={drawerRightOpen}
          onOpenChange={setDrawerRightOpen}
          side="right"
          title="Right Drawer"
        >
          <p data-testid="drawer-right-content">Right drawer content.</p>
        </Drawer>
      </section>

      {/* ── Tooltip ───────────────────────────────────────────────────────── */}
      <section data-testid="section-tooltip" style={sectionStyle}>
        <div style={{ marginBottom: '1rem' }}><Heading level={2}>Tooltip</Heading></div>
        <Tooltip content="This is a tooltip" delay={0}>
          <button
            type="button"
            data-testid="tooltip-trigger"
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid #ccc',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Hover or focus me
          </button>
        </Tooltip>
      </section>

      {/* ── Popover ───────────────────────────────────────────────────────── */}
      <section data-testid="section-popover" style={sectionStyle}>
        <div style={{ marginBottom: '1rem' }}><Heading level={2}>Popover</Heading></div>
        <Popover
          trigger={
            <button
              type="button"
              data-testid="popover-trigger"
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid #ccc',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Open Popover
            </button>
          }
          content={
            <div data-testid="popover-content">
              <p>Popover content. Press Escape or click outside to close.</p>
            </div>
          }
        />
      </section>

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <section data-testid="section-tabs" style={sectionStyle}>
        <div style={{ marginBottom: '1rem' }}><Heading level={2}>Tabs</Heading></div>
        <Tabs items={TABS_ITEMS} defaultValue="tab1" />
      </section>

      {/* ── Tabs (pill variant) ───────────────────────────────────────────── */}
      <section data-testid="section-tabs-pill" style={sectionStyle}>
        <div style={{ marginBottom: '1rem' }}><Heading level={2}>Tabs (pill)</Heading></div>
        <Tabs items={TABS_PILL_ITEMS} defaultValue="pill1" variant="pill" />
      </section>

      {/* ── DataTable (Batch 2) ───────────────────────────────────────────── */}
      <section data-testid="section-data-table" style={sectionStyle}>
        <div style={{ marginBottom: '1rem' }}><Heading level={2}>DataTable (Batch 2)</Heading></div>
        <DataTable<UserRow>
          data={DT_DATA}
          columns={DT_COLUMNS}
          initialPagination={{ pageSize: 10 }}
          caption="User scores"
        />
      </section>

      {/* ── ConfirmDialog (Batch 2) ───────────────────────────────────────── */}
      <section data-testid="section-confirm-dialog" style={sectionStyle}>
        <div style={{ marginBottom: '1rem' }}><Heading level={2}>ConfirmDialog (Batch 2)</Heading></div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Button
            variant="outline"
            data-testid="confirm-trigger-default"
            onClick={() => { setConfirmResult(null); setConfirmOpen(true) }}
          >
            Default dialog
          </Button>
          <Button
            variant="solid"
            data-testid="confirm-trigger-danger"
            onClick={() => { setConfirmResult(null); setConfirmDangerOpen(true) }}
          >
            Danger dialog
          </Button>
        </div>
        {confirmResult ? (
          <p data-testid="confirm-result" style={{ marginTop: '0.5rem' }}>
            {confirmResult}
          </p>
        ) : null}
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="操作の確認"
          message="この操作を続けてよろしいですか?"
          onConfirm={() => { setConfirmResult('confirmed-default'); setConfirmOpen(false) }}
        />
        <ConfirmDialog
          open={confirmDangerOpen}
          onOpenChange={setConfirmDangerOpen}
          title="削除の確認"
          message="この項目を削除しますか? この操作は元に戻せません。"
          tone="danger"
          confirmLabel="削除する"
          onConfirm={() => { setConfirmResult('confirmed-danger'); setConfirmDangerOpen(false) }}
        />
      </section>

      {/* ── ColorModeToggle (Batch 2) ─────────────────────────────────────── */}
      <section data-testid="section-color-mode-toggle" style={sectionStyle}>
        <div style={{ marginBottom: '1rem' }}><Heading level={2}>ColorModeToggle (Batch 2)</Heading></div>
        <div data-testid="color-mode-toggle-wrapper" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          <ColorModeToggle />
        </div>
      </section>

      {/* ── CommandPalette (Batch 2) ──────────────────────────────────────── */}
      <section data-testid="section-command-palette" style={sectionStyle}>
        <div style={{ marginBottom: '1rem' }}><Heading level={2}>CommandPalette (Batch 2)</Heading></div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Button
            variant="outline"
            data-testid="palette-trigger"
            onClick={() => setPaletteOpen(true)}
          >
            Open palette (with items)
          </Button>
          <Button
            variant="outline"
            data-testid="palette-empty-trigger"
            onClick={() => setPaletteEmptyOpen(true)}
          >
            Open palette (empty)
          </Button>
        </div>
        <CommandPalette
          open={paletteOpen}
          onOpenChange={setPaletteOpen}
          items={PALETTE_ITEMS}
          inputPlaceholder="Search commands..."
        />
        <CommandPalette
          open={paletteEmptyOpen}
          onOpenChange={setPaletteEmptyOpen}
          items={[]}
          inputPlaceholder="Search commands..."
          emptyMessage="No commands found"
        />
      </section>

      {/* ── StatCard (Batch 2) ────────────────────────────────────────────── */}
      <section data-testid="section-stat-card" style={sectionStyle}>
        <div style={{ marginBottom: '1rem' }}><Heading level={2}>StatCard (Batch 2)</Heading></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <StatCard
            label="Active Bots"
            value={42}
            delta={{ value: '+12%', trend: 'up', label: 'vs last week' }}
            helperText="Updated 2 minutes ago"
          />
          <StatCard
            label="Failed Sessions"
            value={3}
            delta={{ value: '-1', trend: 'down' }}
          />
          <StatCard
            label="Transcriptions"
            value={1024}
            delta={{ value: '0', trend: 'flat', label: 'no change' }}
            helperText={`${'Long helper text that may wrap on narrow viewports '.repeat(3)}`}
          />
        </div>
      </section>
    </div>
  )
}
