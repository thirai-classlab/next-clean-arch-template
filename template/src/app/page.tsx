// src/app/page.tsx — Home page (template guide).
//
// 旧 POC ダッシュボード (HomeKpis / HomeOps) を廃し、テンプレート/POC の
// 「使い方ガイド」中心の構成に変更 (template の Home はガイドであるべき)。
//
// 構成 (Server Component):
//   Heading (intro)
//   ↳ LoginGuide      — はじめに / ログイン案内 + 初期 Admin credential 案内
//   ↳ UsageGuide      — 利用手順 (起動コマンド / MOCK_MODE / gallery / admin / clean arch)
//   ↳ FeatureRail     — POC 機能一覧 (11 カテゴリへの導線)
//
// これは Server Component (no 'use client'): server 専用の getValidatedEnv() /
// getAuthenticatedSession() を読み、認証状態で LoginGuide を出し分ける。

import { Box } from '@chakra-ui/react'
import { Heading } from '@/components/ui/typography/Heading'
import { Text } from '@/components/ui/typography/Text'
import { LoginGuide } from '@/components/home/LoginGuide'
import { UsageGuide } from '@/components/home/UsageGuide'
import { FeatureRail } from '@/components/home/FeatureRail'
import { getValidatedEnv } from '@/lib/env'
import { getPageSession } from '@/lib/auth/session-page'
import {
  SEED_EMAIL,
  SEED_PASSWORD,
} from '@/lib/infrastructure/adapters/mock/mock-auth.seed'

// This page reads request-scoped auth state (cookies / Supabase session via
// getPageSession) and resolves server-only env, so it must be rendered
// per-request.
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const env = getValidatedEnv()
  const isMock = env.MOCK_MODE === 'true'

  // Seed credential は server-resolved (リテラル直書きしない)。env override
  // (MOCK_SEED_*) を優先し、無ければ MockAuthAdapter の SSoT default を使う。
  const seedEmail = env.MOCK_SEED_EMAIL ?? SEED_EMAIL
  const seedPassword = env.MOCK_SEED_PASSWORD ?? SEED_PASSWORD

  // 認証状態 (RSC-safe: 実 path は Supabase getUser()、MOCK_MODE では
  // mock_session cookie fallback で解決。tsyringe container は経由しない —
  // RSC bundle で AuthPort が unregistered になるのを避ける)。
  const session = await getPageSession()

  return (
    <Box className="recall-page">
      <Box as="header" mb="6">
        <Heading level={4} as="h1">
          recall-poc テンプレート
        </Heading>
        <Box mt="2" maxW="760px">
          <Text color="muted">
            Recall.ai 11 機能の動作検証 POC + clean architecture テンプレート。
            下のガイドに沿って、ログイン → 管理画面 / 各 POC 機能を試せます。
          </Text>
        </Box>
      </Box>

      <LoginGuide
        session={session}
        seedEmail={seedEmail}
        seedPassword={seedPassword}
        isMock={isMock}
      />

      <UsageGuide />

      <Box mt="6">
        <FeatureRail />
      </Box>
    </Box>
  )
}
