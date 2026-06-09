// src/components/home/FeatureRail.tsx — "POC 機能一覧" navigation rail.
//
// Home page から抽出 (旧 page.tsx HomeFeatureRail)。11 カテゴリの POC 機能ページへの
// 導線。store / hooks に依存しない純粋な FEATURES レンダリングのため Server Component。
//
// 既存 inline-style + semantic CSS var パターンを踏襲 (Chakra 全面移行は別 task)。

import Link from 'next/link'
import { Icon } from '@/components/icons'
import { SectionHd } from '@/components/ui/SectionHd'
import { Grid } from '@/components/ui/layout/Grid'
import { FEATURES } from '@/lib/mock-data'
import type { Feature } from '@/types/recall'

const ICON_BY_CODE: Record<string, keyof typeof Icon> = {
  meeting: 'Bot',
  transcribe: 'Mic',
  realtime: 'Radio',
  calendar: 'Calendar',
  breakout: 'Layers',
  output: 'Zap',
  recording: 'Download',
  webhook: 'Webhook',
  desktop: 'Server',
  mobile: 'Phone',
  compliance: 'Shield',
}

/**
 * 11 カテゴリの POC 機能ページへのナビゲーション tile 一覧。
 */
export function FeatureRail() {
  return (
    <section>
      <SectionHd title="POC 機能一覧" sub="11 カテゴリ" />
      <Grid cols={6} gap={8} responsive>
        {FEATURES.map((f: Feature) => {
          const IconC = Icon[ICON_BY_CODE[f.code] ?? 'Dot']
          return (
            <Link
              key={f.id}
              href={f.route}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius)',
                padding: 12,
                opacity: f.stub ? 0.6 : 1,
                minHeight: 78,
                position: 'relative',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <IconC
                  size={14}
                  style={{
                    color: f.highlight
                      ? 'var(--color-accent-text)'
                      : 'var(--color-fg-muted)',
                  }}
                />
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 9.5,
                    color: 'var(--color-fg-subtle)',
                  }}
                >
                  {f.id}
                </span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.2 }}>
                {f.name}
                {f.badge && (
                  <span
                    style={{
                      marginLeft: 5,
                      fontSize: 8.5,
                      fontWeight: 700,
                      letterSpacing: '.06em',
                      padding: '1px 4px',
                      borderRadius: 3,
                      background: 'var(--color-accent)',
                      color: '#fff',
                    }}
                  >
                    {f.badge}
                  </span>
                )}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9.5,
                  color: 'var(--color-fg-subtle)',
                  marginTop: 'auto',
                }}
              >
                {f.route}
              </div>
            </Link>
          )
        })}
      </Grid>
    </section>
  )
}

FeatureRail.displayName = 'FeatureRail'
