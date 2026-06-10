// src/app/layout.tsx — Root layout: fonts + Shell + Chakra Provider.
//
// next/font is intentionally NOT used here to keep the scaffold dependency-free.
// Google Fonts are loaded via <link> in <head> (matches design source approach).
//
// Phase 1 (Chakra foundation):
//   - ChakraAppProvider wraps children with ChakraProvider + next-themes
//   - suppressHydrationWarning on <html> is required by next-themes
//   - data-theme="light" kept for backwards compat with existing CSS vars
//   - Tailwind / existing components are untouched (Phase 7 removes Tailwind)

import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { ConditionalShell } from '@/components/shell/ConditionalShell'
import { Toaster } from '@/components/ui/feedback'
import { getPageSession } from '@/lib/auth/session-page'
import { ChakraAppProvider } from '@/theme/provider'
import './globals.css'

export const metadata: Metadata = {
  title: 'Recall.ai POC',
  description:
    'Recall.ai 11 機能 (Meeting Bot / Desktop SDK / Mobile SDK / Transcription / Real-time / Calendar / Speaker Diarization / Media Output / Webhooks) の動作検証 POC。',
}

// Resolve the session at the (Server Component) root layout so the shell avatar
// menu can show the real signed-in user (email / role) instead of hardcoded
// "佐藤". getPageSession() is RSC-safe (no tsyringe container) and reads the
// `mock_session` cookie in MOCK_MODE / Supabase getUser() in real mode. Reading
// cookies opts the layout into dynamic rendering, which is acceptable for this
// auth-dependent POC shell.
export default async function RootLayout({ children }: { children: ReactNode }) {
  const session = await getPageSession()

  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&family=Inter:wght@300;400;500;600;700&family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ChakraAppProvider>
          <ConditionalShell session={session}>{children}</ConditionalShell>
          <Toaster />
        </ChakraAppProvider>
      </body>
    </html>
  )
}
