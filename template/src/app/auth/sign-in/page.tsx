// apps/web/src/app/auth/sign-in/page.tsx
// task-5 Step 1: Sign-in page with Google OAuth provider button.
// task-37 Step 1: login 専用画面化 + raw inline style → Chakra semantic token 換装.
// task-37 Step 3: Client OAuth 直叩き除去 → Server Action 接続.
// task-37 Step 4: Server Component で LOGIN_STRATEGY を resolve し、strategy 別 UI
//   (sso / email-pass / both) を `loginMethods` prop で Client に渡す。private env
//   は getValidatedEnv() 経由 (NEXT_PUBLIC_ 不使用、SEC-MED-02)。MOCK_MODE で
//   email-pass/both のときは seed credential ヒントを <Alert variant="info"> で表示。
// vps-next-postgres: profile-specific actions are resolved server-side and passed as
//   props to GoogleSignInButton / EmailPasswordForm so that UI components remain
//   profile-agnostic (no client-side bundle leakage of unused profiles' actions).
//
// This is a Server Component (no 'use client'): it reads server-only env via
// getValidatedEnv() and renders the interactive strategy UI as a Client leaf.

import { Box, Card, Stack } from '@chakra-ui/react'
import { Heading } from '@/components/ui/typography/Heading'
import { Text } from '@/components/ui/typography/Text'
import { Alert } from '@/components/ui/feedback/Alert'
import { getValidatedEnv } from '@/lib/env'
import {
  SEED_EMAIL,
  SEED_PASSWORD,
} from '@/lib/infrastructure/adapters/mock/mock-auth.seed'
import { SignInStrategy, type LoginMethods } from './SignInStrategy'

// Server-only env is read per request, so render dynamically. (Seed constants
// now come from the pure `mock-auth.seed` module, decoupled from the tsyringe
// `@injectable` adapter so static page-data collection no longer needs
// `reflect-metadata`.)
export const dynamic = 'force-dynamic'

export default async function SignInPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>
}) {
  const env = getValidatedEnv()
  const loginMethods = env.LOGIN_STRATEGY as LoginMethods
  const isMock = env.MOCK_MODE === 'true'
  const isVpsNextPostgres = env.DEPLOY_PROFILE === 'vps-next-postgres'
  const showsPasswordForm = loginMethods !== 'sso'
  const showSeedHint = isMock && showsPasswordForm

  // Resolve profile-specific actions for the VPS profile.
  // Actions are imported conditionally at module evaluation time but
  // only wired when the profile matches.
  let googleAction: (() => Promise<void>) | undefined
  let passwordAction:
    | ((
        prevState: import('@/lib/interfaces/actions/sign-in.action').SignInWithPasswordState | null,
        formData: FormData,
      ) => Promise<import('@/lib/interfaces/actions/sign-in.action').SignInWithPasswordState>)
    | undefined

  if (isVpsNextPostgres) {
    const vpsActions = await import('@/lib/interfaces/actions/sign-in-vps.action')
    googleAction = vpsActions.signInWithGoogleVpsAction
    passwordAction = vpsActions.signInWithPasswordVpsAction
  }

  // Resolve error from query params (e.g., AccessDenied from NextAuth domain check).
  // Whitelist known NextAuth error codes — unknown values are ignored entirely
  // so a crafted ?error=<anything> URL cannot surface an alert (social
  // engineering hardening; the raw value is never rendered either way).
  // 'oauth' is our own code from sign-in-vps.action.ts signInWithGoogleVpsAction.
  const KNOWN_AUTH_ERRORS = [
    'AccessDenied',
    'OAuthSignin',
    'OAuthCallback',
    'OAuthAccountNotLinked',
    'CredentialsSignin',
    'Configuration',
    'Signin',
    'oauth',
  ]
  const resolvedSearchParams = await searchParams
  const rawAuthError = resolvedSearchParams?.error
  const authError =
    rawAuthError && KNOWN_AUTH_ERRORS.includes(rawAuthError)
      ? rawAuthError
      : undefined

  // Seed credential values are server-resolved (never literal-inlined here, ui
  // LOW-R3-1). SEED_EMAIL / SEED_PASSWORD are the SSoT defaults from the pure
  // `mock-auth.seed` module; env override (MOCK_SEED_*) is respected by the
  // module-level read, so importing the exported constants gives the effective value.
  const seedEmail = env.MOCK_SEED_EMAIL ?? SEED_EMAIL
  const seedPassword = env.MOCK_SEED_PASSWORD ?? SEED_PASSWORD

  const description =
    loginMethods === 'sso'
      ? 'Google アカウントでサインインしてください。'
      : loginMethods === 'email-pass'
        ? 'メールアドレスとパスワードでサインインしてください。'
        : 'Google または メールアドレスでサインインしてください。'

  return (
    <Box
      as="main"
      display="flex"
      minHeight="100vh"
      alignItems="center"
      justifyContent="center"
      px={{ base: 4, md: 0 }}
      py="6"
    >
      <Card.Root
        maxW="sm"
        w="full"
        bg="bg.elevated"
        borderWidth="1px"
        borderColor="border.default"
        borderRadius="lg"
        boxShadow="md"
      >
        <Card.Body p="8" aria-labelledby="sign-in-heading">
          <Heading level={6} as="h1" id="sign-in-heading">
            サインイン
          </Heading>
          <Box mt="2" mb="6">
            <Text color="muted">{description}</Text>
          </Box>

          <Stack gap="4">
            {authError === 'AccessDenied' && (
              <Alert variant="danger" title="サインインが拒否されました">
                <Text size="sm">
                  このメールアドレスはサインインが許可されていません。
                </Text>
              </Alert>
            )}
            {authError && authError !== 'AccessDenied' && (
              <Alert variant="danger" title="サインインエラー">
                <Text size="sm">
                  サインイン中にエラーが発生しました。もう一度お試しください。
                </Text>
              </Alert>
            )}

            <SignInStrategy
              loginMethods={loginMethods}
              googleAction={googleAction}
              passwordAction={passwordAction}
            />

            {showSeedHint && (
              <Alert variant="info" title="MOCK モード用 seed 認証情報">
                <Text size="sm">
                  メール: {seedEmail}
                  <br />
                  パスワード: {seedPassword}
                </Text>
              </Alert>
            )}
          </Stack>
        </Card.Body>
      </Card.Root>
    </Box>
  )
}
