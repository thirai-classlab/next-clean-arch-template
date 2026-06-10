// src/app/api/auth/[...nextauth]/route.ts
// App Router catch-all route handler for NextAuth v5 (Auth.js beta).
//
// Exposes the NextAuth GET and POST handlers for:
//   - OAuth callback endpoints (/api/auth/callback/google, etc.)
//   - Sign-in endpoint      (/api/auth/signin)
//   - CSRF token endpoint   (/api/auth/csrf)
//   - Session endpoint      (/api/auth/session)
//
// All configuration lives in src/auth.ts.
// This file is intentionally minimal.

import { handlers } from '@/auth'

export const { GET, POST } = handlers
