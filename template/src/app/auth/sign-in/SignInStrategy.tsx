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

import { useState } from 'react'
import { Tabs } from '@/components/ui/composite/Tabs'
import { GoogleSignInButton } from './GoogleSignInButton'
import { EmailPasswordForm } from './EmailPasswordForm'

export type LoginMethods = 'sso' | 'email-pass' | 'both'

interface SignInStrategyProps {
  loginMethods: LoginMethods
}

export function SignInStrategy({ loginMethods }: SignInStrategyProps) {
  // Remount key for the email-pass form: bumped when the user leaves the
  // email-pass tab so the password field is dropped from the DOM.
  const [formKey, setFormKey] = useState(0)
  const [activeTab, setActiveTab] = useState<string>('sso')

  if (loginMethods === 'sso') {
    return <GoogleSignInButton />
  }

  if (loginMethods === 'email-pass') {
    return <EmailPasswordForm />
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
          content: <GoogleSignInButton />,
        },
        {
          value: 'email-pass',
          label: 'Email / Password',
          content: <EmailPasswordForm key={formKey} />,
        },
      ]}
    />
  )
}

SignInStrategy.displayName = 'SignInStrategy'
