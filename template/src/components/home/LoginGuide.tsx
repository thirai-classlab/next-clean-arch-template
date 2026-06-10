// src/components/home/LoginGuide.tsx — "はじめに / ログイン案内" section for the Home page.
//
// テンプレート利用者が最初に見る「ログインして試す」導線。Server Component で
// 認証状態 (session) を受け取り、未ログイン / ログイン済みで出し分ける。
//   - 未ログイン: MOCK seed admin credential を <Alert variant="info"> で明示し、
//     /auth/sign-in への CTA を出す。
//   - ログイン済み: <Alert variant="success"> で「ログイン中 (role)」を示し、
//     POST /auth/sign-out のログアウト button + /admin への導線を出す。
//
// 既存 semantic token + Chakra primitive (Box/Stack/Flex) + 既存 component
// (Card/Alert/Heading/Text/Btn) を流用。raw <h*> は使わず <Heading> を使う
// (no-raw-heading-tag rule)。

import { Box, Flex, Stack } from '@chakra-ui/react'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Alert } from '@/components/ui/feedback/Alert'
import { Btn } from '@/components/ui/Btn'
import { Heading } from '@/components/ui/typography/Heading'
import { Text } from '@/components/ui/typography/Text'
import { Icon } from '@/components/icons'
import type { AuthenticatedSession } from '@/lib/interfaces/actions/_shared/auth-helper'

export interface LoginGuideProps {
  /** 現在の認証セッション。未ログイン時は null。 */
  session: AuthenticatedSession | null
  /** MOCK seed admin の email (server-resolved、リテラル直書きしない)。 */
  seedEmail: string
  /** MOCK seed admin の password (server-resolved)。 */
  seedPassword: string
  /** MOCK_MODE か否か。true のときのみ seed credential を案内する。 */
  isMock: boolean
}

/**
 * Home 上部の「はじめに / ログイン案内」セクション。
 * Server Component (認証状態を props で受け取るだけ、hooks 不使用)。
 */
export function LoginGuide({
  session,
  seedEmail,
  seedPassword,
  isMock,
}: LoginGuideProps) {
  return (
    <Box as="section" mb="6" aria-labelledby="login-guide-heading">
      <Card>
        <Stack gap="4">
          <Box>
            <Heading level={5} as="h2" id="login-guide-heading">
              はじめに — ログインして試す
            </Heading>
            <Box mt="2">
              <Text color="muted">
                このテンプレートを試すには、まず管理者 (admin) でログインしてください。
                ログイン後は <code>/admin</code> 管理画面や各 POC 機能ページを閲覧できます。
              </Text>
            </Box>
          </Box>

          {session ? (
            <SignedInPanel role={session.role} />
          ) : (
            <SignedOutPanel
              seedEmail={seedEmail}
              seedPassword={seedPassword}
              isMock={isMock}
            />
          )}
        </Stack>
      </Card>
    </Box>
  )
}

LoginGuide.displayName = 'LoginGuide'

// ─── ログイン済み: ログアウト + /admin 導線 ───────────────────
function SignedInPanel({ role }: { role: string }) {
  return (
    <Stack gap="3">
      <Alert variant="success" title={`ログイン中 (role: ${role})`}>
        <Text size="sm">
          認証済みです。管理画面や POC 機能を閲覧できます。別アカウントを試すには
          ログアウトしてください。
        </Text>
      </Alert>
      <Flex gap="3" wrap="wrap" align="center">
        <Link href="/admin/dashboard">
          <Btn variant="primary" iconRight={Icon.ArrowRight}>
            管理画面へ
          </Btn>
        </Link>
        {/* POST /auth/sign-out で server-side session + cookie をクリア */}
        <form action="/auth/sign-out" method="post">
          <Btn type="submit" variant="ghost">
            ログアウト
          </Btn>
        </form>
      </Flex>
    </Stack>
  )
}

// ─── 未ログイン: seed credential 案内 + sign-in CTA ────────────
function SignedOutPanel({
  seedEmail,
  seedPassword,
  isMock,
}: {
  seedEmail: string
  seedPassword: string
  isMock: boolean
}) {
  return (
    <Stack gap="3">
      {isMock && (
        <Alert variant="info" title="MOCK モード用 初期 Admin 認証情報">
          <Text size="sm">
            メール: <code>{seedEmail}</code>
            <br />
            パスワード: <code>{seedPassword}</code>
            <br />
            role: admin
          </Text>
          <Box mt="2">
            <Text size="sm" color="muted">
              MOCK_MODE では Supabase 不要で、この credential でログインできます。
              ログイン後は <code>/admin</code> 管理画面も閲覧可能です。
            </Text>
          </Box>
        </Alert>
      )}
      <Flex gap="3" wrap="wrap" align="center">
        <Link href="/auth/sign-in">
          <Btn variant="primary" iconRight={Icon.ArrowRight}>
            ログイン画面へ
          </Btn>
        </Link>
      </Flex>
    </Stack>
  )
}
