'use client'

// src/components/home/StepByStepGuide.tsx — step-by-step tutorial section for Home page.
// Accordion (expand/collapse) を使い 5 ステップを表現。デフォルト Step 1 のみ open。
// Chakra v3 Accordion (wrapper from composite/Accordion.tsx) + Linear semantic tokens 使用。

import * as React from 'react'
import Link from 'next/link'
import { Box, HStack, Stack, Text, Code, Badge } from '@chakra-ui/react'
import { ExternalLink } from 'lucide-react'
import { Accordion } from '@/components/ui/composite/Accordion'
import { SectionHd } from '@/components/ui/SectionHd'

// ── Step content components ────────────────────────────────────────────────────

function CodeBlock({ children }: { children: string }) {
  return (
    <Box
      as="pre"
      bg="bg.subtle"
      borderWidth="1px"
      borderColor="border.subtle"
      borderRadius="md"
      p={3}
      overflowX="auto"
      mt={2}
      mb={1}
    >
      <Code
        fontSize="xs"
        fontFamily="mono"
        color="fg.default"
        bg="transparent"
        whiteSpace="pre"
        display="block"
      >
        {children}
      </Code>
    </Box>
  )
}

function StepBadge({ n }: { n: number }) {
  return (
    <Badge
      colorPalette="blue"
      variant="subtle"
      borderRadius="full"
      minW="22px"
      h="22px"
      display="inline-flex"
      alignItems="center"
      justifyContent="center"
      fontSize="xs"
      fontWeight="bold"
      flexShrink={0}
    >
      {n}
    </Badge>
  )
}

function InternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      style={{ color: 'var(--chakra-colors-accent-text)', fontWeight: 500, textDecoration: 'underline' }}
    >
      {children}
    </Link>
  )
}

function ExternalDocLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        color: 'var(--chakra-colors-accent-text)',
        fontWeight: 500,
        textDecoration: 'underline',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
      }}
    >
      {children}
      <ExternalLink size={12} aria-hidden="true" style={{ display: 'inline', verticalAlign: 'middle' }} />
    </a>
  )
}

// ── Step 1: 環境構築 ────────────────────────────────────────────────────────────

const Step1Content = (
  <Stack gap={3} color="fg.muted" fontSize="sm">
    <Text>Recall POC を動かすための前提要件とインストール手順です。</Text>

    <Text fontWeight="semibold" color="fg.default">前提 (Prerequisites)</Text>
    <Stack as="ul" gap={1} pl={4} listStyleType="disc">
      <Text as="li"><Code fontSize="xs">Node 18+</Code> — LTS 推奨</Text>
      <Text as="li"><Code fontSize="xs">pnpm 9+</Code> — <Code fontSize="xs">npm i -g pnpm</Code> でインストール</Text>
      <Text as="li"><Code fontSize="xs">Docker</Code> — Supabase local emulator (Step 2) で必要</Text>
      <Text as="li">
        <Code fontSize="xs">bash 4+</Code> — macOS の system <Code fontSize="xs">/bin/bash</Code> は 3.2 のため
        Homebrew で更新推奨
      </Text>
    </Stack>

    <Text fontWeight="semibold" color="fg.default">bash 4+ インストール (macOS のみ)</Text>
    <CodeBlock>{`brew install bash
# PATH に追加 (zsh の場合):
echo 'export PATH="/opt/homebrew/bin:$PATH"' >> ~/.zshrc && source ~/.zshrc`}</CodeBlock>

    <Text fontWeight="semibold" color="fg.default">依存パッケージ一括インストール</Text>
    <CodeBlock>{`# monorepo ルートで実行 — apps/api + apps/web + packages/contracts が一括 install
pnpm install`}</CodeBlock>
  </Stack>
)

// ── Step 2: 初回 setup ──────────────────────────────────────────────────────────

const Step2Content = (
  <Stack gap={3} color="fg.muted" fontSize="sm">
    <Text>Supabase local emulator と環境変数を設定します。</Text>

    <Text fontWeight="semibold" color="fg.default">Supabase local emulator 起動</Text>
    <Text>
      Docker が起動している状態で実行。8 migration 適用 + RLS verify + Google OAuth + admin seed を自動処理 (冪等)。
    </Text>
    <CodeBlock>{`bash scripts/setup-supabase.sh`}</CodeBlock>

    <Text fontWeight="semibold" color="fg.default">env 検証</Text>
    <CodeBlock>{`# 全 env の存在 + format チェック (@next/env 経由)
pnpm env:validate`}</CodeBlock>

    <Text fontWeight="semibold" color="fg.default">Vercel setup (任意)</Text>
    <CodeBlock>{`# CLI login は user manual で実施、project link + env bulk import + custom domain
bash scripts/setup-vercel.sh`}</CodeBlock>

    <Text fontSize="xs" color="fg.subtle">
      setup-*.sh で発生した問題は <Code fontSize="xs">docs/tasks/next-actions.md</Code> を参照。
    </Text>
  </Stack>
)

// ── Step 3: 開発サーバ起動 ─────────────────────────────────────────────────────

const Step3Content = (
  <Stack gap={3} color="fg.muted" fontSize="sm">
    <Text>turbo で api + web を並列起動するのが推奨です。</Text>

    <Text fontWeight="semibold" color="fg.default">monorepo 並列起動 (推奨)</Text>
    <CodeBlock>{`pnpm dev  # turbo: apps/api (port 4000) + apps/web (port 3000) 並列`}</CodeBlock>

    <Text fontWeight="semibold" color="fg.default">個別起動</Text>
    <CodeBlock>{`pnpm --filter @recall-poc/web dev   # web のみ  → port 3000
pnpm --filter @recall-poc/api dev   # api のみ  → port 4000`}</CodeBlock>

    <Text fontWeight="semibold" color="fg.default">MOCK_MODE (Recall.ai API key 不要)</Text>
    <CodeBlock>{`MOCK_MODE=true pnpm dev`}</CodeBlock>

    <Text fontWeight="semibold" color="fg.default">Real API 接続</Text>
    <CodeBlock>{`# ngrok 等で WEBHOOK_PUBLIC_URL を公開してから実行
MOCK_MODE=false RECALL_API_KEY=<your_key> pnpm dev`}</CodeBlock>

    <Text fontSize="xs" color="fg.subtle">
      Real API 使用時は <Code fontSize="xs">WEBHOOK_PUBLIC_URL</Code> の公開が必須。
      未公開だと bot ライフサイクル webhook が届かず UI が静止します。
    </Text>
  </Stack>
)

// ── Step 4: 各機能の使い方 ─────────────────────────────────────────────────────

function Step4ContentComponent() {
  const features: Array<{ label: string; href: string; desc: string }> = [
    { label: '/admin/dev/components', href: '/admin/dev/components', desc: 'Component gallery — 97 entry の UI library reference。Chakra v3 公式 + 実装済の混合表示。' },
    { label: '/admin/dashboard', href: '/admin/dashboard', desc: 'Admin panel — User 管理 / Allow-list / Audit log。admin でログインするとアクセス可 (MOCK は test@classlab.co.jp / password123)。' },
    { label: '/bots', href: '/bots', desc: 'Meeting Bot — Bot 作成 / 状態監視 / 録音 start/stop。' },
    { label: '/transcription', href: '/transcription', desc: 'Transcription — 文字起こし結果の一覧と詳細。' },
    { label: '/realtime', href: '/realtime', desc: 'Realtime — ライブ transcript ストリーム (low latency / accuracy モード)。' },
    { label: '/calendar', href: '/calendar', desc: 'Calendar — Google Calendar / Outlook 連携、自動 Bot 参加スケジュール。' },
    { label: '/breakout', href: '/breakout', desc: 'Breakout Rooms — Recall.ai 唯一の Breakout Rooms 録画機能。' },
    { label: '/media-output', href: '/media-output', desc: 'Media Output — 録画データの出力と Webhook 連携。' },
    { label: '/recordings', href: '/recordings', desc: 'Recordings — 録音ファイルのダウンロード管理。' },
    { label: '/webhooks', href: '/webhooks', desc: 'Webhooks — イベント受信履歴とペイロード確認。' },
    { label: '/desktop-sdk', href: '/desktop-sdk', desc: 'Desktop SDK — Electron 連携、ローカル画面録画。' },
    { label: '/mobile-sdk', href: '/mobile-sdk', desc: 'Mobile SDK — iOS / Android SDK 連携確認。' },
    { label: '/compliance', href: '/compliance', desc: 'Compliance — SOC2 / GDPR / CCPA 設定管理。' },
  ]

  return (
    <Stack gap={3} color="fg.muted" fontSize="sm">
      <Text>
        各機能ページへのリンクと概要です。<Code fontSize="xs">MOCK_MODE=true</Code> で API key なしでも全ページが動作します。
      </Text>

      <Text fontWeight="semibold" color="fg.default">MOCK vs Real 切替</Text>
      <Text>
        env <Code fontSize="xs">MOCK_MODE</Code> で <Code fontSize="xs">MockRecallGateway</Code> と{' '}
        <Code fontSize="xs">HttpRecallGateway</Code> を DI 切替 (clean architecture port pattern)。
      </Text>

      <Stack as="ul" gap={2} pl={0} listStyleType="none">
        {features.map(({ label, href, desc }) => (
          <Box key={href} as="li" pl={0}>
            <HStack gap={2} align="flex-start">
              <Box w="1px" bg="border.subtle" alignSelf="stretch" flexShrink={0} mt={1} />
              <Stack gap={0.5}>
                <InternalLink href={href}>{label}</InternalLink>
                <Text fontSize="xs" color="fg.subtle">{desc}</Text>
              </Stack>
            </HStack>
          </Box>
        ))}
      </Stack>
    </Stack>
  )
}

// ── Step 5: トラブルシューティング ────────────────────────────────────────────

const Step5Content = (
  <Stack gap={3} color="fg.muted" fontSize="sm">
    <Text>よくある問題と解決策をまとめています。</Text>

    {[
      {
        title: '.next cache 残骸 → dev server 起動失敗',
        solution: (
          <CodeBlock>{`rm -rf apps/web/.next apps/web/.next.broken.*`}</CodeBlock>
        ),
      },
      {
        title: 'port 3000 衝突',
        solution: (
          <CodeBlock>{`lsof -i :3000    # PID 確認
kill <PID>       # または別 port で起動:
PORT=3001 pnpm dev`}</CodeBlock>
        ),
      },
      {
        title: 'Supabase 接続エラー',
        solution: (
          <CodeBlock>{`supabase status  # running 確認
supabase start   # 未起動なら起動`}</CodeBlock>
        ),
      },
      {
        title: 'bash 4+ 要件 vs macOS 3.2 (require_bash4 fail)',
        solution: (
          <CodeBlock>{`brew install bash
# PATH 設定後に再実行:
bash scripts/setup-supabase.sh`}</CodeBlock>
        ),
      },
      {
        title: 'ブラウザキャッシュ / 旧 build が残っている',
        solution: (
          <Stack gap={1}>
            <Text fontSize="xs">Hard refresh: <Code fontSize="xs">Cmd+Shift+R</Code> (macOS) / <Code fontSize="xs">Ctrl+Shift+R</Code> (Windows/Linux)</Text>
            <CodeBlock>{`# dev server 再起動の場合:
# Ctrl+C で停止 → .next 削除 → 再起動
rm -rf apps/web/.next && pnpm dev`}</CodeBlock>
          </Stack>
        ),
      },
      {
        title: 'vitest 失敗 (Zag.js act() 警告)',
        solution: (
          <Text fontSize="xs" color="fg.subtle">
            jsdom の IntersectionObserver 制約による pre-existing issue。テスト結果に影響しないため無視可能です。
          </Text>
        ),
      },
    ].map(({ title, solution }) => (
      <Box key={title} borderWidth="1px" borderColor="border.subtle" borderRadius="md" p={3}>
        <Text fontWeight="semibold" color="fg.default" mb={2}>{title}</Text>
        {solution}
      </Box>
    ))}
  </Stack>
)

// ── Main export ───────────────────────────────────────────────────────────────

interface StepEntry {
  value: string
  stepNumber: number
  title: string
  content: React.ReactNode
}

const STEPS: StepEntry[] = [
  { value: 'step-1', stepNumber: 1, title: '環境構築', content: Step1Content },
  { value: 'step-2', stepNumber: 2, title: '初回 setup (Supabase + env)', content: Step2Content },
  { value: 'step-3', stepNumber: 3, title: '開発サーバ起動', content: Step3Content },
  { value: 'step-4', stepNumber: 4, title: '各機能の使い方', content: <Step4ContentComponent /> },
  { value: 'step-5', stepNumber: 5, title: 'トラブルシューティング (FAQ)', content: Step5Content },
]

/**
 * StepByStepGuide — 5 ステップのチュートリアル Accordion。
 * デフォルト Step 1 のみ open、他は collapsed。
 * multiple=false で 1 step ずつ展開。
 */
export function StepByStepGuide() {
  return (
    <section aria-label="ステップバイステップ ガイド" data-testid="step-by-step-guide">
      <SectionHd title="ステップバイステップ ガイド" sub="初回セットアップから機能確認まで" />
      <Accordion
        multiple={false}
        collapsible
        defaultValue={['step-1']}
        items={STEPS.map((step) => ({
          value: step.value,
          trigger: (
            <HStack gap={3} align="center" flex="1" textAlign="left">
              <StepBadge n={step.stepNumber} />
              <Text fontSize="sm" fontWeight="semibold" color="fg.default">
                {step.title}
              </Text>
            </HStack>
          ),
          content: step.content,
        }))}
      />
      <Box mt={3}>
        <Text fontSize="xs" color="fg.subtle">
          詳細設計:{' '}
          <ExternalDocLink href="https://github.com/takuma-hirai/recall_poc/blob/main/docs/01_basic_design.md">
            docs/01_basic_design.md
          </ExternalDocLink>
          {' / '}
          <ExternalDocLink href="https://docs.recall.ai/">
            Recall.ai 公式ドキュメント
          </ExternalDocLink>
        </Text>
      </Box>
    </section>
  )
}
