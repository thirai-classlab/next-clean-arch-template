'use client'

// apps/web/src/app/auth/sign-in/EmailPasswordForm.tsx
// task #37 Step 4 (auth-login-strategy): email + password sign-in form.
//
// Uses the native <form action={...}> + useFormState/useFormStatus
// (react-dom, Next.js 14 / React 18 — NOT useActionState which is Next.js 15)
// progressive-enhancement pattern. The Server Action
// `signInWithPasswordAction(prevState, formData)` (sign-in.action.ts) is
// rate-limited and establishes the MOCK session via the mock_session cookie.
//
// vps-next-postgres: accepts optional `passwordAction` prop from parent
// (Server Component). When provided, useFormState uses the VPS action instead
// of signInWithPasswordAction. No UI changes — the form renders identically.
//
// Security:
//   - password input uses type=password / autocomplete=current-password and is
//     uncontrolled (FormData only) — never lifted into React state (H-4).
//   - server error surfaces in <Alert variant="danger">; the alert is cleared on
//     the next submit (stale error 防止, ui-M-R1) via the form's onSubmit hook.

import { useFormState, useFormStatus } from 'react-dom'
import { useEffect, useState } from 'react'
import { Stack } from '@chakra-ui/react'
import { Input } from '@/components/ui/primitive/Input'
import { Button } from '@/components/ui/primitive/Button'
import { Alert } from '@/components/ui/feedback/Alert'
import {
  signInWithPasswordAction,
  type SignInWithPasswordState,
} from '@/lib/interfaces/actions/sign-in.action'

const INITIAL_STATE: SignInWithPasswordState | null = null

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} loading={pending} fullWidth>
      {pending ? 'サインイン中…' : 'サインイン'}
    </Button>
  )
}

interface EmailPasswordFormProps {
  /**
   * Profile-specific Server Action for password sign-in.
   * When provided (vps-next-postgres), this replaces signInWithPasswordAction.
   * When undefined, the default signInWithPasswordAction is used.
   */
  passwordAction?: (
    prevState: SignInWithPasswordState | null,
    formData: FormData,
  ) => Promise<SignInWithPasswordState>
}

export function EmailPasswordForm({ passwordAction }: EmailPasswordFormProps = {}) {
  const action = passwordAction ?? signInWithPasswordAction
  const [state, formAction] = useFormState(action, INITIAL_STATE)
  // Mirror server error into local state so a fresh submit can clear it before
  // the action resolves (avoids a stale error flashing during the next attempt).
  const [visibleError, setVisibleError] = useState<string | undefined>(undefined)

  useEffect(() => {
    setVisibleError(state?.error)
  }, [state])

  return (
    <form action={formAction} onSubmit={() => setVisibleError(undefined)}>
      <Stack gap="4">
        {visibleError && <Alert variant="danger">{visibleError}</Alert>}
        <Input
          name="email"
          type="email"
          label="メールアドレス"
          autoComplete="email"
          required
          placeholder="you@example.com"
        />
        <Input
          name="password"
          type="password"
          label="パスワード"
          autoComplete="current-password"
          required
        />
        <SubmitButton />
      </Stack>
    </form>
  )
}

EmailPasswordForm.displayName = 'EmailPasswordForm'
