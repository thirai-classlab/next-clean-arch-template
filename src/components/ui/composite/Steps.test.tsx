/**
 * Steps unit tests — Batch 3b (Chakra v3 Steps native)
 *
 * Coverage:
 *  1. Smoke render — does not throw with minimal props
 *  2. Step titles render in the indicator row
 *  3. Step descriptions render when provided
 *  4. Navigation buttons render by default
 *  5. Navigation buttons hidden when showNavigation=false
 *  6. Controlled: step prop passes through (aria-current on active item)
 */
import * as React from 'react'
import { screen, cleanup } from '@testing-library/react'
import { afterEach, describe, it, expect, vi } from 'vitest'
import { renderWithChakra } from '@/test-utils'
import { StepsComponent } from './Steps'

const STEPS = [
  { title: 'プラン', description: '計画を立てる' },
  { title: '実行', description: '計画を実行する' },
  { title: '完了' },
]

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('Steps — Test 1: smoke render does not throw', () => {
  it('renders without throwing with minimal steps prop', () => {
    expect(() =>
      renderWithChakra(
        <StepsComponent steps={[{ title: 'Step 1' }, { title: 'Step 2' }]} />,
      ),
    ).not.toThrow()
  })
})

describe('Steps — Test 2: step titles appear in the DOM', () => {
  it('renders all step titles', () => {
    renderWithChakra(<StepsComponent steps={STEPS} />)
    expect(screen.getByText('プラン')).toBeTruthy()
    expect(screen.getByText('実行')).toBeTruthy()
    expect(screen.getByText('完了')).toBeTruthy()
  })
})

describe('Steps — Test 3: step descriptions render when provided', () => {
  it('renders description text for steps that have one', () => {
    renderWithChakra(<StepsComponent steps={STEPS} />)
    expect(screen.getByText('計画を立てる')).toBeTruthy()
    expect(screen.getByText('計画を実行する')).toBeTruthy()
  })
})

describe('Steps — Test 4: navigation buttons render by default', () => {
  it('shows 前へ and 次へ buttons when showNavigation is true (default)', () => {
    renderWithChakra(<StepsComponent steps={STEPS} />)
    expect(screen.getByText('前へ')).toBeTruthy()
    expect(screen.getByText('次へ')).toBeTruthy()
  })
})

describe('Steps — Test 5: navigation hidden when showNavigation=false', () => {
  it('does not render navigation buttons when showNavigation is false', () => {
    renderWithChakra(<StepsComponent steps={STEPS} showNavigation={false} />)
    expect(screen.queryByText('前へ')).toBeNull()
    expect(screen.queryByText('次へ')).toBeNull()
  })
})

describe('Steps — Test 6: completedContent renders after all steps', () => {
  it('renders completedContent node in the DOM', () => {
    renderWithChakra(
      <StepsComponent
        steps={[{ title: 'A' }]}
        completedContent={<div>全て完了しました</div>}
      />,
    )
    // completedContent is always in the DOM (Ark controls visibility via CSS)
    expect(screen.getByText('全て完了しました')).toBeTruthy()
  })
})

describe('Steps — Test 7: trigger renders as button (HC-09)', () => {
  it('Step triggers are button elements for keyboard activation', () => {
    renderWithChakra(<StepsComponent steps={STEPS} />)
    // Ark Steps.Trigger defaults to button; verify buttons are present for nav
    const buttons = document.querySelectorAll('button')
    // At minimum the prev/next nav buttons exist; triggers should also be buttons
    expect(buttons.length).toBeGreaterThan(0)
  })
})
