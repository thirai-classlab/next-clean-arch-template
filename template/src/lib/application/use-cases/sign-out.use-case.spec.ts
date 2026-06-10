import { describe, it, expect, vi } from 'vitest'
import { SignOutUseCase } from './sign-out.use-case'
import type { AuthPort } from '../ports/auth.port'
import { ok, err } from '../result'
import { ExternalServiceError } from '@/lib/domain/errors'

describe('SignOutUseCase (signature)', () => {
  const authPort = {} as AuthPort

  it('is constructible with AuthPort', () => {
    const uc = new SignOutUseCase(authPort)
    expect(uc).toBeInstanceOf(SignOutUseCase)
  })

  it('exposes execute()', () => {
    const uc = new SignOutUseCase(authPort)
    expect(typeof uc.execute).toBe('function')
  })
})

describe('SignOutUseCase (behavior — Step 3 implementation)', () => {
  it('delegates to AuthPort.signOut(userId) and returns ok on success', async () => {
    const signOut = vi.fn().mockResolvedValue(ok(undefined as void))
    const authPort = { signOut } as unknown as AuthPort

    const uc = new SignOutUseCase(authPort)
    const r = await uc.execute({ userId: 'u1' })

    expect(signOut).toHaveBeenCalledWith('u1')
    expect(r.ok).toBe(true)
  })

  it('propagates ExternalServiceError from AuthPort.signOut', async () => {
    const failure = new ExternalServiceError('auth', new Error('boom'))
    const signOut = vi.fn().mockResolvedValue(err(failure))
    const authPort = { signOut } as unknown as AuthPort

    const uc = new SignOutUseCase(authPort)
    const r = await uc.execute({ userId: 'u1' })

    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error).toBe(failure)
    }
  })
})
