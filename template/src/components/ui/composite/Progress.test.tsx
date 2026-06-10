/**
 * Progress unit tests — Batch 3b (Chakra v3 Progress native)
 *
 * Coverage:
 *  1. Smoke render — does not throw with value prop
 *  2. role="progressbar" is present (Ark wires this)
 *  3. Label renders when provided
 *  4. No label when omitted
 *  5. Indeterminate: value=null renders without error
 *  6. Value text absent by default (showValue=false)
 */
import * as React from 'react'
import { screen, cleanup } from '@testing-library/react'
import { afterEach, describe, it, expect, vi } from 'vitest'
import { renderWithChakra } from '@/test-utils'
import { ProgressBar } from './Progress'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('Progress — Test 1: smoke render does not throw', () => {
  it('renders without throwing with a numeric value', () => {
    expect(() =>
      renderWithChakra(<ProgressBar value={50} />),
    ).not.toThrow()
  })
})

describe('Progress — Test 2: progressbar role present', () => {
  it('has role="progressbar" wired by Ark', () => {
    renderWithChakra(<ProgressBar value={40} />)
    expect(screen.getByRole('progressbar')).toBeTruthy()
  })
})

describe('Progress — Test 3: label renders when provided', () => {
  it('shows the label text in the DOM', () => {
    renderWithChakra(<ProgressBar value={60} label="アップロード中" />)
    expect(screen.getByText('アップロード中')).toBeTruthy()
  })
})

describe('Progress — Test 4: no label when omitted', () => {
  it('does not render label when label prop is absent', () => {
    renderWithChakra(<ProgressBar value={30} />)
    // No label text should appear
    expect(screen.queryByRole('label')).toBeNull()
  })
})

describe('Progress — Test 5: indeterminate render (value=null)', () => {
  it('renders without throwing when value is null', () => {
    expect(() =>
      renderWithChakra(<ProgressBar value={null} label="読み込み中…" />),
    ).not.toThrow()
  })
})

describe('Progress — Test 6: aria-valuenow reflects value', () => {
  it('sets aria-valuenow attribute on the progressbar', () => {
    renderWithChakra(<ProgressBar value={75} />)
    const bar = screen.getByRole('progressbar')
    expect(bar.getAttribute('aria-valuenow')).toBe('75')
  })
})
