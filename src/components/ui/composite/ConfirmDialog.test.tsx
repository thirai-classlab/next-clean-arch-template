/**
 * ConfirmDialog unit tests — Phase 6 Batch 2 (Chakra v3 Dialog).
 *
 * Behaviour-level coverage: render gating on `open`, title/message visibility,
 * confirm button fires callback, cancel/escape close via onOpenChange, danger
 * tone applied. jsdom does not exercise Ark's document-level dismiss layer
 * (Escape / outside-click); those flows are covered by the Playwright E2E
 * suite at the composite gallery.
 *
 * Additional coverage (task-32 CRITICAL-2/3 + MEDIUM):
 *   CRITICAL-2: cancel button click triggers onOpenChange(false)
 *   CRITICAL-3: tone="danger" branch — data-tone="danger" on confirm button,
 *               role="alertdialog" present when open
 *   MEDIUM:     loading=true disables cancel button (added to Test 5)
 */
import * as React from 'react'
import { screen, fireEvent, cleanup } from '@testing-library/react'
import { afterEach, describe, it, expect, vi } from 'vitest'
import { renderWithChakra } from '@/test-utils'
import { ConfirmDialog } from './ConfirmDialog'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('ConfirmDialog — Test 1: closed → no dialog in DOM', () => {
  it('renders nothing observable when open is false', () => {
    renderWithChakra(
      <ConfirmDialog
        open={false}
        onOpenChange={vi.fn()}
        title="Delete bot?"
        message="This cannot be undone."
        onConfirm={vi.fn()}
      />,
    )
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('ConfirmDialog — Test 2: open → renders title + message', () => {
  it('renders title and message text', () => {
    renderWithChakra(
      <ConfirmDialog
        open
        onOpenChange={vi.fn()}
        title="Delete bot?"
        message="This cannot be undone."
        onConfirm={vi.fn()}
      />,
    )
    expect(screen.getByText('Delete bot?')).toBeTruthy()
    expect(screen.getByText('This cannot be undone.')).toBeTruthy()
  })
})

describe('ConfirmDialog — Test 3: confirm button fires onConfirm', () => {
  it('calls onConfirm when the confirm button is clicked', () => {
    const onConfirm = vi.fn()
    renderWithChakra(
      <ConfirmDialog
        open
        onOpenChange={vi.fn()}
        title="t"
        message="m"
        onConfirm={onConfirm}
      />,
    )
    const button = screen.getByRole('button', { name: /確認/ })
    fireEvent.click(button)
    expect(onConfirm).toHaveBeenCalledOnce()
  })
})

describe('ConfirmDialog — Test 4: custom labels', () => {
  it('renders custom confirm and cancel labels', () => {
    renderWithChakra(
      <ConfirmDialog
        open
        onOpenChange={vi.fn()}
        title="t"
        message="m"
        confirmLabel="Yes, delete"
        cancelLabel="No, keep"
        onConfirm={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: 'Yes, delete' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'No, keep' })).toBeTruthy()
  })
})

describe('ConfirmDialog — Test 5: loading disables buttons', () => {
  it('disables confirm and cancel when loading is true', () => {
    renderWithChakra(
      <ConfirmDialog
        open
        onOpenChange={vi.fn()}
        title="t"
        message="m"
        onConfirm={vi.fn()}
        loading
      />,
    )
    const confirm = screen.getByRole('button', { name: /確認/ })
    expect((confirm as HTMLButtonElement).disabled).toBe(true)

    // MEDIUM: cancel button must also be disabled when loading=true
    const cancel = screen.getByRole('button', { name: /キャンセル/ })
    expect((cancel as HTMLButtonElement).disabled).toBe(true)
  })
})

describe('ConfirmDialog — Test 6: smoke render does not throw', () => {
  it('renders with the minimal props set', () => {
    expect(() =>
      renderWithChakra(
        <ConfirmDialog
          open
          onOpenChange={vi.fn()}
          title="t"
          message="m"
          onConfirm={vi.fn()}
        />,
      ),
    ).not.toThrow()
  })
})

// ── CRITICAL-2: cancel button → onOpenChange(false) ──────────────────────────

describe('ConfirmDialog — Test 7: cancel button calls onOpenChange(false)', () => {
  /**
   * Dialog.CloseTrigger (asChild) wires Ark's close flow but jsdom does not
   * exercise the document-level dismiss layer. ConfirmDialog adds an explicit
   * onClick={() => onOpenChange(false)} on the cancel button so unit tests
   * can assert the callback without relying on Ark internals.
   */
  it('calls onOpenChange with false when cancel button is clicked', () => {
    const onOpenChange = vi.fn()
    renderWithChakra(
      <ConfirmDialog
        open
        onOpenChange={onOpenChange}
        title="Delete bot?"
        message="This cannot be undone."
        onConfirm={vi.fn()}
      />,
    )

    const cancelBtn = screen.getByRole('button', { name: /キャンセル/ })
    fireEvent.click(cancelBtn)

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})

// ── CRITICAL-3: tone="danger" branch coverage ─────────────────────────────────

describe('ConfirmDialog — Test 8: tone="danger" applies danger styling', () => {
  it('sets data-tone="danger" on confirm button when tone is danger', () => {
    renderWithChakra(
      <ConfirmDialog
        open
        onOpenChange={vi.fn()}
        title="Danger action"
        message="This is irreversible."
        tone="danger"
        onConfirm={vi.fn()}
      />,
    )

    const confirmBtn = screen.getByRole('button', { name: /確認/ })
    // ConfirmDialog stamps data-tone={tone} on the confirm button so tests
    // can assert the danger branch without relying on Chakra's hashed class names.
    expect(confirmBtn.getAttribute('data-tone')).toBe('danger')
  })

  it('exposes role="alertdialog" when open with tone="danger"', () => {
    renderWithChakra(
      <ConfirmDialog
        open
        onOpenChange={vi.fn()}
        title="Danger action"
        message="This is irreversible."
        tone="danger"
        onConfirm={vi.fn()}
      />,
    )

    // Dialog.Root has role="alertdialog" regardless of tone in our impl —
    // this test verifies it is present when tone="danger" is explicitly set.
    expect(screen.getByRole('alertdialog')).toBeTruthy()
  })

  it('confirm button carries data-tone="default" for default tone', () => {
    renderWithChakra(
      <ConfirmDialog
        open
        onOpenChange={vi.fn()}
        title="Normal action"
        message="Proceed?"
        tone="default"
        onConfirm={vi.fn()}
      />,
    )

    const confirmBtn = screen.getByRole('button', { name: /確認/ })
    expect(confirmBtn.getAttribute('data-tone')).toBe('default')
    expect(confirmBtn.getAttribute('data-tone')).not.toBe('danger')
  })
})
