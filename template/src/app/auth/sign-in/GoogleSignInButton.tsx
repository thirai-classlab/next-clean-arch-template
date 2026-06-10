'use client'

// apps/web/src/app/auth/sign-in/GoogleSignInButton.tsx
// task #37 Step 4 (auth-login-strategy, ui-M-R4): Google sign-in button that
// follows Google's official branding guidelines:
//   - background: white (light) / #131314 (dark) via semantic-token-ish gating
//   - 1px neutral border, font-weight 500, official multicolor "G" logo SVG
//   - full width; the brand accent (#2A6FDB) is intentionally NOT used here.
//
// Submits the `signInWithGoogleAction` Server Action (sign-in.action.ts):
//   MOCK → writes mock_session cookie + redirect('/'); real → provider OAuth URL.
// useFormStatus (react-dom) drives the pending state and must be read from a
// child of the <form>, so the button lives in its own component.

import { useFormStatus } from 'react-dom'
import { Button } from '@chakra-ui/react'
import { signInWithGoogleAction } from '@/lib/interfaces/actions/sign-in.action'

// Official Google "G" logo (4-color), inline so no public/ asset is required.
function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
      <path
        fill="#4285F4"
        d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
  )
}

// Inner button: useFormStatus must be read from a child of the <form> (Next.js
// 14 / React 18 progressive-enhancement contract).
function GoogleButton() {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      disabled={pending}
      width="full"
      display="inline-flex"
      alignItems="center"
      justifyContent="center"
      gap="2"
      height="10"
      fontWeight="medium"
      borderWidth="1px"
      borderColor={{ base: 'gray.300', _dark: 'whiteAlpha.300' }}
      bg={{ base: 'white', _dark: '#131314' }}
      color={{ base: 'gray.800', _dark: 'gray.100' }}
      _hover={{ bg: { base: 'gray.50', _dark: 'whiteAlpha.100' } }}
    >
      <GoogleLogo />
      {pending ? 'リダイレクト中…' : 'Google でサインイン'}
    </Button>
  )
}

export function GoogleSignInButton() {
  return (
    <form action={signInWithGoogleAction}>
      <GoogleButton />
    </form>
  )
}

GoogleSignInButton.displayName = 'GoogleSignInButton'
