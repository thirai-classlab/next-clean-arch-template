/**
 * AdminPageShell unit tests — MEDIUM finding (R-03).
 *
 * Verifies the envDeferred=true / false branching behaviour:
 *   - envDeferred=true  → NoteBanner is present with the expected env hint copy.
 *   - envDeferred=false → NoteBanner is absent.
 *   - title / children always render regardless of envDeferred.
 *
 * AdminPageShell is a React Server Component (no 'use client' directive), but
 * it uses only static JSX so it renders fine in the vitest/jsdom environment.
 * PageHeader and NoteBanner are lightweight CSS-in-JS components with no
 * server-only imports, so no mocking is required.
 */
import * as React from 'react'
import { cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { renderWithChakra } from '@/test-utils'
import { AdminPageShell } from './AdminPageShell'

afterEach(() => {
  cleanup()
})

describe('AdminPageShell — Test 1: title and children always render', () => {
  it('renders the title regardless of envDeferred', () => {
    const { getByText } = renderWithChakra(
      <AdminPageShell title="Users">
        <p>content</p>
      </AdminPageShell>,
    )
    expect(getByText('Users')).toBeTruthy()
    expect(getByText('content')).toBeTruthy()
  })
})

describe('AdminPageShell — Test 2: envDeferred=true shows NoteBanner', () => {
  it('renders the NoteBanner env-deferred explanation when envDeferred is true', () => {
    const { container } = renderWithChakra(
      <AdminPageShell title="Users" envDeferred>
        <p>child</p>
      </AdminPageShell>,
    )
    // The NoteBanner text includes the Supabase env hint
    const bannerText = container.textContent ?? ''
    expect(bannerText).toContain('Supabase 環境変数が未設定')
  })

  it('renders the Step 3 guidance copy in the banner', () => {
    const { container } = renderWithChakra(
      <AdminPageShell title="Users" envDeferred>
        <p>child</p>
      </AdminPageShell>,
    )
    const bannerText = container.textContent ?? ''
    expect(bannerText).toContain('プレースホルダ表示')
  })
})

describe('AdminPageShell — Test 3: envDeferred=false hides NoteBanner', () => {
  it('does not render the NoteBanner when envDeferred is false', () => {
    const { container } = renderWithChakra(
      <AdminPageShell title="Users" envDeferred={false}>
        <p>child</p>
      </AdminPageShell>,
    )
    const bannerText = container.textContent ?? ''
    expect(bannerText).not.toContain('Supabase 環境変数が未設定')
  })

  it('does not render the NoteBanner when envDeferred is omitted (defaults false)', () => {
    const { container } = renderWithChakra(
      <AdminPageShell title="Users">
        <p>child</p>
      </AdminPageShell>,
    )
    const bannerText = container.textContent ?? ''
    expect(bannerText).not.toContain('Supabase 環境変数が未設定')
  })
})

describe('AdminPageShell — Test 4: sub and right props render', () => {
  it('renders subtitle when sub prop is provided', () => {
    const { getByText } = renderWithChakra(
      <AdminPageShell title="Dashboard" sub="Manage everything">
        <p>body</p>
      </AdminPageShell>,
    )
    expect(getByText('Manage everything')).toBeTruthy()
  })

  it('renders right slot content when provided', () => {
    const { getByText } = renderWithChakra(
      <AdminPageShell title="Users" right={<button type="button">Add</button>}>
        <p>body</p>
      </AdminPageShell>,
    )
    expect(getByText('Add')).toBeTruthy()
  })
})
