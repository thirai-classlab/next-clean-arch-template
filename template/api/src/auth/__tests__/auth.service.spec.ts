import { Test, TestingModule } from '@nestjs/testing'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { AuthService } from '../auth.service'
import { PrismaService } from '../../prisma/prisma.service'

// Minimal mock for PrismaService
const mockUserDelegate = {
  findUnique: jest.fn(),
  upsert: jest.fn(),
}

const mockPrismaService = {
  user: mockUserDelegate,
  account: {},
  auditLog: {},
  getClient: jest.fn(),
}

const mockJwtService = {
  sign: jest.fn().mockReturnValue('signed-jwt-token'),
}

const mockConfigService = {
  get: jest.fn((_key: string): string | undefined => undefined),
}

describe('AuthService', () => {
  let service: AuthService

  beforeEach(async () => {
    jest.clearAllMocks()
    // Default: no domain restriction
    mockConfigService.get.mockImplementation((_key: string): string | undefined => undefined)

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile()

    service = module.get<AuthService>(AuthService)
  })

  describe('validateCredentials', () => {
    it('returns user when credentials are valid', async () => {
      // Arrange
      const bcrypt = await import('bcryptjs')
      const hash = await bcrypt.hash('correct-password', 10)
      mockUserDelegate.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        role: 'member',
        status: 'approved',
        name: 'Test User',
        image: null,
        passwordHash: hash,
      })

      // Act
      const result = await service.validateCredentials('test@example.com', 'correct-password')

      // Assert
      expect(result).not.toBeNull()
      expect(result?.email).toBe('test@example.com')
      expect(result?.role).toBe('member')
    })

    it('returns null when password is wrong', async () => {
      // Arrange
      const bcrypt = await import('bcryptjs')
      const hash = await bcrypt.hash('correct-password', 10)
      mockUserDelegate.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        role: 'member',
        status: 'approved',
        name: null,
        image: null,
        passwordHash: hash,
      })

      // Act
      const result = await service.validateCredentials('test@example.com', 'wrong-password')

      // Assert
      expect(result).toBeNull()
    })

    it('returns null when user does not exist', async () => {
      // Arrange
      mockUserDelegate.findUnique.mockResolvedValue(null)

      // Act
      const result = await service.validateCredentials('nonexistent@example.com', 'password')

      // Assert
      expect(result).toBeNull()
    })

    it('returns null when passwordHash is null (Google-only account)', async () => {
      // Arrange
      mockUserDelegate.findUnique.mockResolvedValue({
        id: 'user-2',
        email: 'google@example.com',
        role: 'member',
        status: 'approved',
        name: 'Google User',
        image: 'https://example.com/photo.jpg',
        passwordHash: null,
      })

      // Act
      const result = await service.validateCredentials('google@example.com', 'anypassword')

      // Assert
      expect(result).toBeNull()
    })

    it('returns null when email domain is rejected', async () => {
      // Arrange
      const bcrypt = await import('bcryptjs')
      const hash = await bcrypt.hash('password', 10)
      mockUserDelegate.findUnique.mockResolvedValue({
        id: 'user-3',
        email: 'user@otherdomain.com',
        role: 'member',
        status: 'approved',
        name: null,
        image: null,
        passwordHash: hash,
      })
      mockConfigService.get.mockImplementation((key: string): string | undefined => {
        if (key === 'AUTH_ALLOWED_EMAIL_DOMAIN') return 'example.com'
        return undefined
      })

      // Act
      const result = await service.validateCredentials('user@otherdomain.com', 'password')

      // Assert
      expect(result).toBeNull()
    })

    it('accepts email when AUTH_ALLOWED_EMAIL_DOMAIN matches (case-insensitive + @-strip)', async () => {
      // Arrange
      const bcrypt = await import('bcryptjs')
      const hash = await bcrypt.hash('password', 10)
      mockUserDelegate.findUnique.mockResolvedValue({
        id: 'user-4',
        email: 'user@example.com',
        role: 'admin',
        status: 'approved',
        name: null,
        image: null,
        passwordHash: hash,
      })
      // domain with leading '@' prefix — must be normalized
      mockConfigService.get.mockImplementation((key: string): string | undefined => {
        if (key === 'AUTH_ALLOWED_EMAIL_DOMAIN') return '@example.com'
        return undefined
      })

      // Act
      const result = await service.validateCredentials('user@example.com', 'password')

      // Assert
      expect(result).not.toBeNull()
      expect(result?.role).toBe('admin')
    })
  })

  describe('issueToken', () => {
    it('returns a signed JWT string', () => {
      // Arrange
      const user = {
        id: 'user-1',
        email: 'test@example.com',
        role: 'member' as const,
        status: 'approved',
      }

      // Act
      const token = service.issueToken(user)

      // Assert
      expect(token).toBe('signed-jwt-token')
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: 'user-1',
        email: 'test@example.com',
        role: 'member',
      })
    })
  })

  describe('upsertOAuthUser', () => {
    it('creates a new user with role=member and status=pending when not found', async () => {
      // Arrange - no domain restriction
      mockUserDelegate.upsert.mockResolvedValue({
        id: 'new-user',
        email: 'new@example.com',
        role: 'member',
        status: 'pending',
        name: 'New User',
        image: 'https://example.com/photo.jpg',
      })

      // Act
      const result = await service.upsertOAuthUser({
        email: 'new@example.com',
        name: 'New User',
        image: 'https://example.com/photo.jpg',
      })

      // Assert
      expect(result).not.toBeNull()
      expect(result?.role).toBe('member')
      expect(result?.status).toBe('pending')
      expect(mockUserDelegate.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            email: 'new@example.com',
            role: 'member',
            status: 'pending',
          }),
        }),
      )
    })

    it('supplies an explicit UUID id in the create object (mariadb has no DB-side default)', async () => {
      // Arrange — the mariadb schema defines User.id WITHOUT @default(uuid()),
      // so the app layer MUST generate the primary key or MariaDB rejects the
      // INSERT with a NOT NULL violation (HIGH fix regression test).
      mockUserDelegate.upsert.mockResolvedValue({
        id: 'new-user',
        email: 'new@example.com',
        role: 'member',
        status: 'pending',
        name: null,
        image: null,
      })

      // Act
      await service.upsertOAuthUser({ email: 'new@example.com' })

      // Assert — create.id is present and UUID-shaped
      const upsertArgs = mockUserDelegate.upsert.mock.calls[0][0] as {
        create: { id?: string }
      }
      expect(upsertArgs.create.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      )
    })

    it('returns null when domain is rejected for OAuth user', async () => {
      // Arrange
      mockConfigService.get.mockImplementation((key: string): string | undefined => {
        if (key === 'AUTH_ALLOWED_EMAIL_DOMAIN') return 'example.com'
        return undefined
      })

      // Act
      const result = await service.upsertOAuthUser({
        email: 'user@otherdomain.com',
        name: 'User',
      })

      // Assert
      expect(result).toBeNull()
      expect(mockUserDelegate.upsert).not.toHaveBeenCalled()
    })
  })
})
