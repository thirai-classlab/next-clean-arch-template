import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { ConfigService } from '@nestjs/config'
import type { Request } from 'express'
import type { Role } from '@shared/domain/value-objects/role'

interface JwtPayload {
  sub: string
  email: string
  role: Role
  iat?: number
  exp?: number
}

interface AuthUser {
  userId: string
  email: string
  role: Role
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => {
          return req?.cookies?.['nest-session-token'] as string | null ?? null
        },
      ]),
      ignoreExpiration: false,
      // Defense-in-depth (HIGH fix): NEVER fall back to an empty-string secret.
      // NestEnvConfig (MinLength(32)) already validates JWT_SECRET at bootstrap,
      // but if that validator is ever bypassed, an empty secretOrKey would make
      // passport-jwt accept any token signed with ''. getOrThrow turns the
      // misconfiguration into an explicit startup crash instead.
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
      passReqToCallback: false,
    })
  }

  validate(payload: JwtPayload): AuthUser {
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
    }
  }
}
