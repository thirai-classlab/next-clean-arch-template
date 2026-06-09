/**
 * UserMenu — Sidebar footer avatar dropdown (task: shell UI 改善)
 *
 * Replaces the previous hardcoded "佐 / 佐藤 / classlab.co.jp" Flex footer with
 * a real, session-driven avatar menu:
 *   - 未ログイン (session == null): a「ログイン」CTA linking to /auth/sign-in.
 *   - ログイン中: an avatar (initials from email) + email + role badge that opens
 *     a dropdown Menu with two items:
 *       · 「設定」  → Link to /admin/settings
 *       · 「ログアウト」→ POST /auth/sign-out form submit (httpOnly cookie cleared
 *         server-side, 303 → /auth/sign-in).
 *
 * Why the avatar menu owns logout (not the Topbar):
 *   The Topbar previously rendered a always-visible logout button regardless of
 *   auth state. Consolidating logout into the avatar menu (only shown when
 *   signed in) removes the duplicate / always-on control and matches the
 *   conventional "click your avatar → sign out" pattern (user dogfooding 指摘 #1).
 *
 * Recipe convention (matches Sidebar.tsx / composite/Menu.tsx / Avatar.tsx):
 *   1. Chakra v3 primitives + the project Avatar / Menu composites — no raw HTML
 *      footer + inline style.
 *   2. Semantic tokens only (fg.default / fg.muted / fg.subtle / border.default).
 *   3. Interactive (Menu, form submit) → 'use client'.
 *
 * a11y:
 *   - The avatar trigger is a real <button> (Menu.Trigger asChild) so it is
 *     keyboard reachable; Chakra/Ark supplies role="menu" + arrow-key nav.
 *   - The logout control is a <button type="submit"> inside a <form>, so it is
 *     focusable and activates on Enter/Space.
 */
'use client'

import Link from 'next/link'
import { Box } from '@chakra-ui/react'
import { Icon } from '@/components/icons'
import { Avatar } from '@/components/ui/composite/Avatar'
import { Menu } from '@/components/ui/composite/Menu'
import type { AuthenticatedSession } from '@/lib/interfaces/actions/_shared/auth-helper'

const ROLE_LABEL: Record<string, string> = {
  admin: '管理者',
  member: 'メンバー',
  viewer: '閲覧者',
}

/** Initials for the avatar fallback: first character of the email local part. */
function initialsFromEmail(email: string | undefined): string {
  const local = (email ?? '').trim()
  if (!local) return '?'
  return local.charAt(0).toUpperCase()
}

export interface UserMenuProps {
  /** Signed-in session, or null when unauthenticated. */
  session: AuthenticatedSession | null
}

export function UserMenu({ session }: UserMenuProps) {
  // ── Unauthenticated: login CTA ──────────────────────────────
  if (!session) {
    return (
      <Box
        p="3"
        borderTopWidth="1px"
        borderTopColor="border.default"
        data-shell-user-footer
        data-auth-state="anonymous"
      >
        <Box
          asChild
          display="flex"
          alignItems="center"
          justifyContent="center"
          gap="7px"
          width="full"
          px="2"
          py="6px"
          borderRadius="sm"
          borderWidth="1px"
          borderColor="border.default"
          bg="bg.elevated"
          color="fg.default"
          fontSize="12px"
          fontWeight="medium"
          cursor="pointer"
          _hover={{ bg: 'bg.hover', borderColor: 'border.strong' }}
        >
          <Link href="/auth/sign-in" aria-label="ログイン">
            <Icon.User size={13} aria-hidden />
            <Box as="span">ログイン</Box>
          </Link>
        </Box>
      </Box>
    )
  }

  // ── Authenticated: avatar + email + role badge + dropdown ────
  const email = session.email ?? session.userId
  const roleLabel = ROLE_LABEL[session.role] ?? session.role

  return (
    <Box
      p="3"
      borderTopWidth="1px"
      borderTopColor="border.default"
      data-shell-user-footer
      data-auth-state="authenticated"
    >
      <Menu.Root>
        <Menu.Trigger asChild>
          <Box
            asChild
            display="flex"
            alignItems="center"
            gap="9px"
            width="full"
            px="2"
            py="5px"
            borderRadius="sm"
            bg="transparent"
            color="fg.default"
            cursor="pointer"
            textAlign="left"
            _hover={{ bg: 'bg.elevated' }}
            _focusVisible={{
              outline: '2px solid',
              outlineColor: 'accent.default',
              outlineOffset: '2px',
            }}
          >
            <button type="button" aria-label="ユーザーメニュー">
              <Avatar size="xs" fallback={initialsFromEmail(email)} alt={email} />
              <Box flex="1" minWidth={0}>
                <Box
                  fontWeight="semibold"
                  color="fg.default"
                  fontSize="12px"
                  whiteSpace="nowrap"
                  overflow="hidden"
                  textOverflow="ellipsis"
                >
                  {email}
                </Box>
                <Box color="fg.subtle" fontSize="10.5px">
                  {roleLabel}
                </Box>
              </Box>
              <Icon.ChevronDown
                size={12}
                stroke={2}
                aria-hidden
                style={{ color: 'currentcolor', opacity: 0.5 }}
              />
            </button>
          </Box>
        </Menu.Trigger>

        <Menu.Content>
          {/* Header row: full email + role (non-interactive, screen-reader context) */}
          <Box px="3" py="2" data-testid="user-menu-header">
            <Box fontSize="xs" fontWeight="semibold" color="fg.default" wordBreak="break-all">
              {email}
            </Box>
            <Box fontSize="2xs" color="fg.muted">
              {roleLabel}
            </Box>
          </Box>
          <Menu.Separator />

          <Menu.Item value="settings">
            <Box
              asChild
              display="flex"
              alignItems="center"
              gap="8px"
              width="full"
            >
              <Link href="/admin/settings">
                <Icon.Settings size={14} aria-hidden />
                <Box as="span">設定</Box>
              </Link>
            </Box>
          </Menu.Item>

          <Menu.Item value="sign-out" colorScheme="danger">
            <Box
              asChild
              display="flex"
              alignItems="center"
              gap="8px"
              width="full"
            >
              <form action="/auth/sign-out" method="post">
                <Box
                  asChild
                  display="flex"
                  alignItems="center"
                  gap="8px"
                  width="full"
                  bg="transparent"
                  color="inherit"
                  cursor="pointer"
                  textAlign="left"
                >
                  <button type="submit" aria-label="ログアウト">
                    <Icon.LogOut size={14} aria-hidden />
                    <Box as="span">ログアウト</Box>
                  </button>
                </Box>
              </form>
            </Box>
          </Menu.Item>
        </Menu.Content>
      </Menu.Root>
    </Box>
  )
}

UserMenu.displayName = 'UserMenu'
