import 'reflect-metadata'
import { describe, it, expect, vi } from 'vitest'
import { SignInWithPasswordUseCase } from './sign-in-with-password.use-case'
import type { AuthPort } from '../ports/auth.port'
import { ok, err } from '../result'
import { AuthorizationError, ExternalServiceError } from '@/lib/domain/errors'

describe('SignInWithPasswordUseCase', () => {
  it('returns { userId, role } when the credential is valid (seed ok)', async () => {
    // Arrange
    const signInWithPassword = vi
      .fn()
      .mockResolvedValue(ok({ userId: 'mock-user-admin', role: 'admin' }))
    const authPort = { signInWithPassword } as unknown as AuthPort

    // Act
    const result = await new SignInWithPasswordUseCase(authPort).execute({
      email: 'test@classlab.co.jp',
      password: 'password123',
    })

    // Assert
    expect(signInWithPassword).toHaveBeenCalledWith(
      'test@classlab.co.jp',
      'password123',
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toEqual({ userId: 'mock-user-admin', role: 'admin' })
    }
  })

  it('returns AuthorizationError when the credential is invalid (seed ng)', async () => {
    // Arrange
    const authPort = {
      signInWithPassword: vi
        .fn()
        .mockResolvedValue(err(new AuthorizationError('invalid credentials'))),
    } as unknown as AuthPort

    // Act
    const result = await new SignInWithPasswordUseCase(authPort).execute({
      email: 'test@classlab.co.jp',
      password: 'wrong',
    })

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(AuthorizationError)
    }
  })

  it('propagates ExternalServiceError when the provider is down', async () => {
    // Arrange
    const authPort = {
      signInWithPassword: vi
        .fn()
        .mockResolvedValue(err(new ExternalServiceError('mock-auth', new Error('x')))),
    } as unknown as AuthPort

    // Act
    const result = await new SignInWithPasswordUseCase(authPort).execute({
      email: 'test@classlab.co.jp',
      password: 'password123',
    })

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ExternalServiceError)
    }
  })

  it('does not retain the password — only the resolved session is returned', async () => {
    // Arrange — the UseCase must not echo the password into its output.
    const authPort = {
      signInWithPassword: vi
        .fn()
        .mockResolvedValue(ok({ userId: 'mock-user-admin', role: 'admin' })),
    } as unknown as AuthPort

    // Act
    const result = await new SignInWithPasswordUseCase(authPort).execute({
      email: 'test@classlab.co.jp',
      password: 'super-secret',
    })

    // Assert
    const serialised = JSON.stringify(result)
    expect(serialised).not.toContain('super-secret')
  })

  it('passes empty credentials through to AuthPort without validation (adapter responsibility)', async () => {
    // Arrange — UseCase must NOT validate credentials; validation is adapter responsibility.
    const signInWithPassword = vi
      .fn()
      .mockResolvedValue(err(new AuthorizationError('invalid credentials')))
    const authPort = { signInWithPassword } as unknown as AuthPort

    // Act
    await new SignInWithPasswordUseCase(authPort).execute({
      email: '',
      password: '',
    })

    // Assert — the spy was called with the exact empty strings (passthrough)
    expect(signInWithPassword).toHaveBeenCalledWith('', '')
  })

  it('returns AuthorizationError when empty credentials are rejected by AuthPort', async () => {
    // Arrange
    const authPort = {
      signInWithPassword: vi
        .fn()
        .mockResolvedValue(err(new AuthorizationError('invalid credentials'))),
    } as unknown as AuthPort

    // Act
    const result = await new SignInWithPasswordUseCase(authPort).execute({
      email: '',
      password: '',
    })

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(AuthorizationError)
    }
  })

  it('success value contains role field within the valid set (SEC-MED-03 UseCase contract)', async () => {
    // Arrange — adapter resolves with a valid role value
    const validRoles = ['admin', 'member', 'viewer'] as const
    for (const role of validRoles) {
      const authPort = {
        signInWithPassword: vi
          .fn()
          .mockResolvedValue(ok({ userId: 'mock-user', role })),
      } as unknown as AuthPort

      // Act
      const result = await new SignInWithPasswordUseCase(authPort).execute({
        email: 'test@classlab.co.jp',
        password: 'password123',
      })

      // Assert — role is present and within the valid set
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(validRoles).toContain(result.value.role)
      }
    }
  })

  it.todo(
    'SEC-MED-03: email-pass session で custom_access_token_hook が role を JWT 付与 — E2E/pgTAP で検証',
  )
})
