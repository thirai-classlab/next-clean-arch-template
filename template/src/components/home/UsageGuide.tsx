// src/components/home/UsageGuide.tsx — Template usage guide section for Home page.
// Linear inline-style pattern identical to page.tsx (Chakra 全面移行は別 task)
// 構成: クイックリファレンス (5 cards) + ステップバイステップ ガイド (Accordion)

import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { SectionHd } from '@/components/ui/SectionHd'
import { StepByStepGuide } from '@/components/home/StepByStepGuide'

interface GuideItem {
  title: string
  href?: string
  description: string
  code?: string
}

const GUIDE_ITEMS: readonly GuideItem[] = [
  {
    title: '起動コマンド',
    description: 'monorepo 共通コマンド。turbo で api + web を並列起動。',
    code: 'pnpm dev  /  pnpm test  /  pnpm build',
  },
  {
    title: 'MOCK_MODE',
    description: 'Recall.ai API key 不要でデモ動作。env に設定するだけ。',
    code: 'MOCK_MODE=true pnpm dev',
  },
  {
    title: 'Component gallery',
    href: '/admin/dev/components',
    description:
      'UI primitive 一覧。admin でログインすると確認可能 (MOCK は test@classlab.co.jp / password123)。',
  },
  {
    title: 'Admin panel',
    href: '/admin/dashboard',
    description: 'User 管理 / Allow-list / Audit log を含む管理画面。',
  },
  {
    title: 'Clean architecture 4 層',
    description:
      'domain → application → infrastructure → interfaces。依存方向は一方向。設計詳細: docs/01_basic_design.md §3-4',
  },
] as const

function QuickReferenceSection() {
  return (
    <div>
      <SectionHd title="利用手順" sub="開発者向け" />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 10,
        }}
      >
        {GUIDE_ITEMS.map((item) => (
          <Card key={item.title} pad={false} style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {item.href ? (
                <Link
                  href={item.href}
                  style={{
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: 'var(--color-accent-text)',
                    textDecoration: 'none',
                  }}
                >
                  {/* eslint-disable-next-line local/no-raw-heading-tag -- plain-CSS port: inherits Link typography (fontSize/weight: inherit), not the Chakra Heading recipe. */}
                  <h3 style={{ margin: 0, fontSize: 'inherit', fontWeight: 'inherit' }}>
                    {item.title} →
                  </h3>
                </Link>
              ) : (
                // eslint-disable-next-line local/no-raw-heading-tag -- plain-CSS port: bespoke inline-styled guide-item label, not the Chakra Heading recipe.
                <h3
                  style={{
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: 'var(--color-fg-default)',
                    margin: 0,
                  }}
                >
                  {item.title}
                </h3>
              )}
              <p
                style={{
                  fontSize: 11.5,
                  color: 'var(--color-fg-muted)',
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                {item.description}
              </p>
              {item.code && (
                <code
                  style={{
                    display: 'block',
                    fontSize: 10.5,
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--color-accent-text)',
                    background: 'var(--color-bg-sunken)',
                    padding: '4px 8px',
                    borderRadius: 'var(--radius-sm)',
                    whiteSpace: 'pre',
                  }}
                >
                  {item.code}
                </code>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

export function UsageGuide() {
  return (
    <section data-testid="usage-guide">
      <QuickReferenceSection />
      <div style={{ height: 28 }} />
      <StepByStepGuide />
    </section>
  )
}
