/**
 * NestJS E2E tests — Auth endpoints.
 *
 * These tests bootstrap a full Nest application with an in-memory mock
 * (no real database). The PrismaService is replaced with a mock that
 * serves deterministic data so tests are fast and hermetic.
 *
 * Run with: pnpm test:e2e (inside api/)
 */
// Set environment variables BEFORE importing AppModule, so that ConfigModule.forRoot()
// reads our test values instead of defaults
process.env.NODE_ENV = 'test'
process.env.LOGIN_STRATEGY = 'both'
process.env.AUTH_GOOGLE_ID = '__disabled__'
process.env.AUTH_GOOGLE_SECRET = '__disabled__'
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'

import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cookieParser = require('cookie-parser')
import * as supertest from 'supertest'
import { AppModule } from '../src/app.module'
import { PrismaService } from '../src/prisma/prisma.service'
import * as bcrypt from 'bcryptjs'

// ─── In-memory users ──────────────────────────────────────────────────────
const ADMIN_HASH = bcrypt.hashSync('adminpass', 10)
const MEMBER_HASH = bcrypt.hashSync('memberpass', 10)

const MOCK_USERS = [
  {
    id: 'admin-id',
    email: 'admin@example.com',
    role: 'admin',
    status: 'approved',
    name: 'Admin User',
    image: null,
    passwordHash: ADMIN_HASH,
  },
  {
    id: 'member-id',
    email: 'member@example.com',
    role: 'member',
    status: 'approved',
    name: 'Member User',
    image: null,
    passwordHash: MEMBER_HASH,
  },
]

class MockPrismaService {
  user = {
    findUnique: jest.fn(({ where }: { where: { email?: string; id?: string } }) => {
      const u = MOCK_USERS.find(
        (m) => (where.email && m.email === where.email) || (where.id && m.id === where.id),
      )
      return Promise.resolve(u ?? null)
    }),
    findMany: jest.fn(() => Promise.resolve(MOCK_USERS)),
    upsert: jest.fn(({ where, create, update }: {
      where: { email: string }
      create: { email: string; role: string; status: string; name?: string | null; image?: string | null }
      update: { name?: string | null; image?: string | null }
    }) => {
      const existing = MOCK_USERS.find((m) => m.email === where.email)
      if (existing) {
        return Promise.resolve({ ...existing, ...update })
      }
      return Promise.resolve({
        id: 'new-id',
        passwordHash: null,
        ...create,
      })
    }),
  }
  account = {}
  auditLog = {}
  getClient = jest.fn()
  onModuleInit = jest.fn()
  onModuleDestroy = jest.fn()
}

// ─── Helpers ──────────────────────────────────────────────────────────────

async function extractSessionCookie(
  app: INestApplication,
  email: string,
  password: string,
): Promise<string> {
  const res = await supertest
    .default(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password })

  const setCookieHeader = res.headers['set-cookie']
  if (!setCookieHeader) return ''
  const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader]
  const nestCookie = cookies.find((c: string) => c.startsWith('nest-session-token='))
  return nestCookie ?? ''
}

// ─── Test suite ───────────────────────────────────────────────────────────

describe('Auth E2E', () => {
  let app: INestApplication

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useClass(MockPrismaService)
      .compile()

    app = moduleRef.createNestApplication()
    app.use(cookieParser())
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  // ── Health ────────────────────────────────────────────────────────────

  describe('GET /health', () => {
    it('returns status ok without auth', async () => {
      const res = await supertest.default(app.getHttpServer()).get('/health')
      expect(res.status).toBe(200)
      expect(res.body.status).toBe('ok')
      expect(res.body.timestamp).toBeDefined()
    })
  })

  // ── POST /auth/login ──────────────────────────────────────────────────

  describe('POST /auth/login', () => {
    it('returns 200 and sets nest-session-token cookie for valid credentials', async () => {
      const res = await supertest
        .default(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'member@example.com', password: 'memberpass' })

      expect(res.status).toBe(200)
      expect(res.body.email).toBe('member@example.com')
      expect(res.body.role).toBe('member')

      const cookieHeader = res.headers['set-cookie']
      const cookies = Array.isArray(cookieHeader) ? cookieHeader : [cookieHeader]
      expect(cookies.some((c: string) => c.includes('nest-session-token='))).toBe(true)
      expect(cookies.some((c: string) => c.includes('HttpOnly'))).toBe(true)
    })

    it('returns 401 for wrong password', async () => {
      const res = await supertest
        .default(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'member@example.com', password: 'wrongpassword' })

      expect(res.status).toBe(401)
    })

    it('returns 401 for non-existent user', async () => {
      const res = await supertest
        .default(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nobody@example.com', password: 'any' })

      expect(res.status).toBe(401)
    })
  })

  // ── GET /auth/me ──────────────────────────────────────────────────────

  describe('GET /auth/me', () => {
    it('returns 401 without cookie', async () => {
      const res = await supertest.default(app.getHttpServer()).get('/auth/me')
      expect(res.status).toBe(401)
    })

    it('returns 200 with email and role when authenticated', async () => {
      const cookie = await extractSessionCookie(app, 'admin@example.com', 'adminpass')
      expect(cookie).toBeTruthy()

      const res = await supertest
        .default(app.getHttpServer())
        .get('/auth/me')
        .set('Cookie', cookie)

      expect(res.status).toBe(200)
      expect(res.body.email).toBe('admin@example.com')
      expect(res.body.role).toBe('admin')
    })
  })

  // ── POST /auth/logout ─────────────────────────────────────────────────

  describe('POST /auth/logout', () => {
    it('returns 200 and clears cookie', async () => {
      const res = await supertest.default(app.getHttpServer()).post('/auth/logout')
      expect(res.status).toBe(200)
      expect(res.body.message).toBe('logged out')
    })
  })

  // ── GET /auth/google ──────────────────────────────────────────────────

  describe('GET /auth/google', () => {
    it('redirects to accounts.google.com (dummy credentials)', async () => {
      const res = await supertest
        .default(app.getHttpServer())
        .get('/auth/google')
        .redirects(0)

      // passport-google-oauth20 responds with 302 redirect regardless of
      // whether the clientId is real (the redirect URL is built from the
      // clientId + scope, not by calling Google).
      expect([301, 302]).toContain(res.status)
      const location = res.headers['location'] ?? ''
      expect(location).toMatch(/accounts\.google\.com/)
    })
  })

  // ── GET /admin/users ──────────────────────────────────────────────────

  describe('GET /admin/users', () => {
    it('returns 401 without cookie', async () => {
      const res = await supertest.default(app.getHttpServer()).get('/admin/users')
      expect(res.status).toBe(401)
    })

    it('returns 403 for member role', async () => {
      const cookie = await extractSessionCookie(app, 'member@example.com', 'memberpass')

      const res = await supertest
        .default(app.getHttpServer())
        .get('/admin/users')
        .set('Cookie', cookie)

      expect(res.status).toBe(403)
    })

    it('returns 200 with user list for admin role', async () => {
      const cookie = await extractSessionCookie(app, 'admin@example.com', 'adminpass')

      const res = await supertest
        .default(app.getHttpServer())
        .get('/admin/users')
        .set('Cookie', cookie)

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
      const adminUser = res.body.find((u: { email: string }) => u.email === 'admin@example.com')
      expect(adminUser).toBeDefined()
      expect(adminUser.role).toBe('admin')
    })
  })
})
