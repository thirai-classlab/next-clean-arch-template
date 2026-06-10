import { MethodNotAllowedException } from '@nestjs/common'
import type { Request, Response } from 'express'
import { AuthController } from '../auth.controller'
import { AuthService } from '../auth.service'
import { ConfigService } from '@nestjs/config'
import type { AuthUser } from '../auth.service'

const mockAuthService = {
  issueToken: jest.fn().mockReturnValue('mock-jwt'),
  validateCredentials: jest.fn(),
  upsertOAuthUser: jest.fn(),
}

function makeConfigService(strategy: string) {
  return {
    get: jest.fn((key: string): string | undefined => {
      if (key === 'LOGIN_STRATEGY') return strategy
      if (key === 'NEXT_PUBLIC_APP_URL') return 'http://localhost:3000'
      return undefined
    }),
  }
}

function makeMockResponse() {
  const res = {
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
    redirect: jest.fn().mockReturnThis(),
  } as unknown as Response
  return res
}

function makeAdminUser(): AuthUser {
  return {
    id: 'u1',
    email: 'admin@example.com',
    role: 'admin',
    status: 'approved',
  }
}

function makeMemberUser(): AuthUser {
  return {
    id: 'u2',
    email: 'test@example.com',
    role: 'member',
    status: 'approved',
  }
}

describe('AuthController', () => {
  describe('login (POST /auth/login)', () => {
    it('sets cookie and returns email+role when LOGIN_STRATEGY allows email-pass', () => {
      // Arrange
      const user = makeMemberUser()
      const req = { user } as unknown as Request & { user: AuthUser }
      const res = makeMockResponse()

      const controller = new AuthController(
        mockAuthService as unknown as AuthService,
        makeConfigService('email-pass') as unknown as ConfigService,
      )

      // Act
      const result = controller.login(req, res)

      // Assert
      expect(res.cookie).toHaveBeenCalledWith(
        'nest-session-token',
        'mock-jwt',
        expect.objectContaining({ httpOnly: true, sameSite: 'lax' }),
      )
      expect(result).toEqual({ email: 'test@example.com', role: 'member' })
    })

    it('throws MethodNotAllowedException when LOGIN_STRATEGY === sso', () => {
      // Arrange
      const controller = new AuthController(
        mockAuthService as unknown as AuthService,
        makeConfigService('sso') as unknown as ConfigService,
      )
      const user = makeMemberUser()
      const req = { user } as unknown as Request & { user: AuthUser }
      const res = makeMockResponse()

      // Act & Assert
      expect(() => controller.login(req, res)).toThrow(MethodNotAllowedException)
    })
  })

  describe('logout (POST /auth/logout)', () => {
    it('clears cookie and returns message', () => {
      // Arrange
      const controller = new AuthController(
        mockAuthService as unknown as AuthService,
        makeConfigService('sso') as unknown as ConfigService,
      )
      const res = makeMockResponse()

      // Act
      const result = controller.logout(res)

      // Assert
      expect(res.clearCookie).toHaveBeenCalledWith('nest-session-token', { path: '/' })
      expect(result).toEqual({ message: 'logged out' })
    })
  })

  describe('me (GET /auth/me)', () => {
    it('returns email and role from JWT user', () => {
      // Arrange
      const controller = new AuthController(
        mockAuthService as unknown as AuthService,
        makeConfigService('sso') as unknown as ConfigService,
      )
      const user = makeAdminUser()
      const req = { user } as unknown as Request & { user: AuthUser }

      // Act
      const result = controller.me(req)

      // Assert
      expect(result).toEqual({ email: 'admin@example.com', role: 'admin' })
    })
  })

  describe('LOGIN_STRATEGY enforcement', () => {
    it('throws 405 on GET /auth/google when LOGIN_STRATEGY === email-pass', () => {
      // Arrange
      const controller = new AuthController(
        mockAuthService as unknown as AuthService,
        makeConfigService('email-pass') as unknown as ConfigService,
      )

      // Act & Assert
      expect(() => controller.googleAuth()).toThrow(MethodNotAllowedException)
    })
  })
})
