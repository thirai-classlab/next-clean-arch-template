'use client'

// apps/web/src/app/auth/sign-in/SignInStrategy.tsx
// task #37 Step 4 (auth-login-strategy): renders the sign-in UI according to the
// resolved LOGIN_STRATEGY (`loginMethods` prop, server-resolved — SEC-MED-02):
//   - 'sso'        → Google button only
//   - 'email-pass' → email + password form only
//   - 'both'       → Tabs (underline, fullWidth, SSO tab default active, H-9)
//
// `both` is a controlled Tabs so we can remount the EmailPasswordForm whenever
// the user leaves the email-pass tab (newValue !== 'email-pass'), clearing any
// password text from the DOM (security MEDIUM-02 / ui LOW-R3-2).
//
// vps-next-postgres: optional `googleAction` and `passwordAction` props allow
// the Server Component parent (sign-in/page.tsx) to inject profile-specific
// Server Actions. When undefined, the default Supabase/MOCK actions are used.
// This keeps all UI components profile-agnostic.

import { useState } from 'react'
import { Tabs } from '@/components/ui/composite/Tabs'
import { GoogleSignInButton } from './GoogleSignInButton'
import { EmailPasswordForm } from './EmailPasswordForm'
import type { SignInWithPasswordState } from '@/lib/interfaces/actions/sign-in.action'

export type LoginMethods = 'sso' | 'email-pass' | 'both'

interface SignInStrategyProps {
  loginMethods: LoginMethods
  /** Profile-specific Google action (vps-next-postgres). Undefined → default action. */
  googleAction?: () => Promise<void>
  /** Profile-specific password action (vps-next-postgres). Undefined → default action. */
  passwordAction?: (
    prevState: SignInWithPasswordState | null,
    formData: FormData,
  ) => Promise<SignInWithPasswordState>
}

export function SignInStrategy({
  loginMethods,
  googleAction,
  passwordAction,
}: SignInStrategyProps) {
  // Remount key for the email-pass form: bumped when the user leaves the
  // email-pass tab so the password field is dropped from the DOM.
  const [formKey, setFormKey] = useState(0)
  const [activeTab, setActiveTab] = useState<string>('sso')

  if (loginMethods === 'sso') {
    return <GoogleSignInButton googleAction={googleAction} />
  }

  if (loginMethods === 'email-pass') {
    return <EmailPasswordForm passwordAction={passwordAction} />
  }

  // 'both'
  return (
    <Tabs
      variant="underline"
      fullWidth
      value={activeTab}
      onValueChange={(value) => {
        if (value !== 'email-pass') {
          // Leaving the password tab — remount the form to clear the password DOM.
          setFormKey((k) => k + 1)
        }
        setActiveTab(value)
      }}
      items={[
        {
          value: 'sso',
          label: 'Google SSO',
          content: <GoogleSignInButton googleAction={googleAction} />,
        },
        {
          value: 'email-pass',
          label: 'Email / Password',
          content: <EmailPasswordForm key={formKey} passwordAction={passwordAction} />,
        },
      ]}
    />
  )
}

SignInStrategy.displayName = 'SignInStrategy'
