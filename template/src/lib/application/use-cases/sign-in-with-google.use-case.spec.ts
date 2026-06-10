import 'reflect-metadata'
import { describe, it, expect, vi } from 'vitest'
import { SignInWithGoogleUseCase } from './sign-in-with-google.use-case'
import type { AuthPort } from '../ports/auth.port'
import { ok, err } from '../result'
import { ExternalServiceError } from '@/lib/domain/errors'

// auth-login-strategy §Step 3 (code MEDIUM-R3-2): the prior stub returned
// `not implemented: Step 3`. The stub is now resolved — the UseCase delegates to
// AuthPort.signInWithGoogle(), so this spec asserts the delegation contract.
describe('SignInWithGoogleUseCase', () => {
  it('is constructible with AuthPort dependency', () => {
    const uc = new SignInWithGoogleUseCase({} as AuthPort)
    expect(uc).toBeInstanceOf(SignInWithGoogleUseCase)
  })

  it('delegates to AuthPort.signInWithGoogle and returns the redirect URL', async () => {
    // Arrange
    const signInWithGoogle = vi
      .fn()
      .mockResolvedValue(ok({ redirectUrl: 'https://oauth/login' }))
    const authPort = { signInWithGoogle } as unknown as AuthPort

    // Act
    const result = await new SignInWithGoogleUseCase(authPort).execute()

    // Assert
    expect(signInWithGoogle).toHaveBeenCalledOnce()
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.redirectUrl).toBe('https://oauth/login')
    }
  })

  it('propagates an ExternalServiceError from the adapter', async () => {
    // Arrange
    const authPort = {
      signInWithGoogle: vi
        .fn()
        .mockResolvedValue(err(new ExternalServiceError('google', new Error('boom')))),
    } as unknown as AuthPort

    // Act
    const result = await new SignInWithGoogleUseCase(authPort).execute()

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ExternalServiceError)
    }
  })

  it('calls AuthPort.signInWithGoogle exactly once on error path (delegation spy)', async () => {
    // Arrange
    const signInWithGoogle = vi
      .fn()
      .mockResolvedValue(err(new ExternalServiceError('google', new Error('service unavailable'))))
    const authPort = { signInWithGoogle } as unknown as AuthPort

    // Act
    await new SignInWithGoogleUseCase(authPort).execute()

    // Assert — delegation to port must occur even when adapter returns an error
    expect(signInWithGoogle).toHaveBeenCalledOnce()
  })
})
