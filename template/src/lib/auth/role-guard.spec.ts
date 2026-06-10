// src/lib/auth/role-guard.spec.ts
// task-5 Step 4: unit tests for the pure role-access decision logic
// (draft 08 §Phase 4 / Step 4.3).
//
// `requireRole` / `assertAdmin` 自体は Supabase client に依存するため、判定の核 (純粋関数)
// `evaluateRoleAccess` を vitest で検証する。admin → allow / member → forbidden /
// viewer → forbidden の 3 role matrix を中心に網羅 (draft 08 §4.6 の admin-only endpoint 期待)。

import { describe, it, expect } from 'vitest'
import { evaluateRoleAccess, type Role } from './role-guard'

describe('evaluateRoleAccess — admin-only surface (allowed = [admin])', () => {
  const adminOnly: readonly Role[] = ['admin']

  it('allows an authenticated admin', () => {
    expect(evaluateRoleAccess('u-1', 'admin', adminOnly)).toEqual({
      kind: 'allowed',
      userId: 'u-1',
      role: 'admin',
    })
  })

  it('forbids an authenticated member', () => {
    expect(evaluateRoleAccess('u-2', 'member', adminOnly)).toEqual({
      kind: 'forbidden',
      role: 'member',
    })
  })

  it('forbids an authenticated viewer', () => {
    expect(evaluateRoleAccess('u-3', 'viewer', adminOnly)).toEqual({
      kind: 'forbidden',
      role: 'viewer',
    })
  })

  it('reports unauthorized when there is no session (userId null)', () => {
    expect(evaluateRoleAccess(null, null, adminOnly)).toEqual({
      kind: 'unauthorized',
    })
  })

  it('reports unauthorized when role could not be resolved (role null)', () => {
    // env-unset / projection 行不在 / RLS 拒否で role が null のケース。
    expect(evaluateRoleAccess('u-4', null, adminOnly)).toEqual({
      kind: 'unauthorized',
    })
  })
})

describe('evaluateRoleAccess — member-or-above surface (allowed = [admin, member])', () => {
  const memberOrAbove: readonly Role[] = ['admin', 'member']

  it('allows admin', () => {
    expect(evaluateRoleAccess('u-1', 'admin', memberOrAbove)).toEqual({
      kind: 'allowed',
      userId: 'u-1',
      role: 'admin',
    })
  })

  it('allows member', () => {
    expect(evaluateRoleAccess('u-2', 'member', memberOrAbove)).toEqual({
      kind: 'allowed',
      userId: 'u-2',
      role: 'member',
    })
  })

  it('forbids viewer (read-only role)', () => {
    expect(evaluateRoleAccess('u-3', 'viewer', memberOrAbove)).toEqual({
      kind: 'forbidden',
      role: 'viewer',
    })
  })
})
