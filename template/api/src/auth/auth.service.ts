import { randomUUID } from 'node:crypto'
import { Injectable, Logger } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import * as bcrypt from 'bcryptjs'
import type { Role } from '@shared/domain/value-objects/role'
import { PrismaService } from '../prisma/prisma.service'

// Inline isEmailAllowed to avoid cross-package import complexity at this stage.
// This mirrors src/auth.ts isEmailAllowed exactly (same normalization logic).
function isEmailAllowed(
  email: string | null | undefined,
  domainEnv: string | undefined,
): boolean {
  const domain = domainEnv?.trim().replace(/^@/, '').toLowerCase()
  if (!domain) return true
  if (!email) return false
  return email.toLowerCase().endsWith(`@${domain}`)
}

export interface AuthUser {
  id: string
  email: string
  role: Role
  status: string
  name?: string | null
  image?: string | null
}

type PrismaUserRecord = {
  id: string
  email: string
  role: string
  status: string
  name: string | null
  image: string | null
  passwordHash: string | null
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Validate email/password credentials.
   * Returns the user record if valid, null otherwise.
   */
  async validateCredentials(
    email: string,
    password: string,
  ): Promise<AuthUser | null> {
    try {
      const userDelegate = this.prisma.user as {
        findUnique(args: { where: { email: string } }): Promise<PrismaUserRecord | null>
      }
      const user = await userDelegate.findUnique({ where: { email } })

      if (!user || !user.passwordHash) {
        return null
      }

      const passwordValid = await bcrypt.compare(password, user.passwordHash)
      if (!passwordValid) {
        return null
      }

      // Domain check
      const allowedDomain = this.configService.get<string>('AUTH_ALLOWED_EMAIL_DOMAIN')
      if (!isEmailAllowed(email, allowedDomain)) {
        this.logger.warn(`Email domain rejected for ${email}`)
        return null
      }

      return {
        id: user.id,
        email: user.email,
        role: user.role as Role,
        status: user.status,
        name: user.name,
        image: user.image,
      }
    } catch (err) {
      this.logger.error('validateCredentials error', err)
      return null
    }
  }

  /**
   * Issue a signed JWT and return the cookie options.
   */
  issueToken(user: AuthUser): string {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    }
    return this.jwtService.sign(payload)
  }

  /**
   * Upsert a user from Google OAuth profile.
   * Creates with role=member, status=pending if not found.
   * Updates name/image on subsequent logins.
   */
  async upsertOAuthUser(profile: {
    email: string
    name?: string
    image?: string
  }): Promise<AuthUser | null> {
    const { email, name, image } = profile

    // Domain check
    const allowedDomain = this.configService.get<string>('AUTH_ALLOWED_EMAIL_DOMAIN')
    if (!isEmailAllowed(email, allowedDomain)) {
      this.logger.warn(`OAuth email domain rejected: ${email}`)
      return null
    }

    try {
      const userDelegate = this.prisma.user as {
        upsert(args: {
          where: { email: string }
          update: { name?: string | null; image?: string | null }
          create: {
            id: string
            email: string
            role: string
            status: string
            name?: string | null
            image?: string | null
          }
        }): Promise<PrismaUserRecord>
      }

      const user = await userDelegate.upsert({
        where: { email },
        update: {
          name: name ?? null,
          image: image ?? null,
        },
        create: {
          // HIGH fix (vps-nest-mariadb): the mariadb schema defines User.id
          // WITHOUT @default(uuid()) — UUIDs are generated in the app layer
          // by design. Without an explicit id Prisma would INSERT NULL into
          // the primary key and MariaDB rejects it. The postgres schema has
          // @default(uuid()), so supplying an explicit id is harmless there.
          id: randomUUID(),
          email,
          role: 'member',
          status: 'pending',
          name: name ?? null,
          image: image ?? null,
        },
      })

      return {
        id: user.id,
        email: user.email,
        role: user.role as Role,
        status: user.status,
        name: user.name,
        image: user.image,
      }
    } catch (err) {
      this.logger.error('upsertOAuthUser error', err)
      return null
    }
  }
}
