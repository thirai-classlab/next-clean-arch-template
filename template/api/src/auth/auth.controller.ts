import {
  Controller,
  ForbiddenException,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  MethodNotAllowedException,
  UnauthorizedException,
} from '@nestjs/common'
import type { Request, Response } from 'express'
import { ConfigService } from '@nestjs/config'
import { Throttle, ThrottlerGuard } from '@nestjs/throttler'
import { AuthService, type AuthUser } from './auth.service'
import { LocalAuthGuard } from './guards/local-auth.guard'
import { GoogleAuthGuard } from './guards/google-auth.guard'
import { JwtAuthGuard } from './guards/jwt-auth.guard'

const COOKIE_NAME = 'nest-session-token'
const COOKIE_MAX_AGE_MS = 3600 * 1000 // 1 hour in milliseconds

// Brute-force guard on POST /auth/login (HIGH fix): 5 attempts / 15 minutes
// per client. The Next.js Server Action layer applies its own rate limit, but
// the Nest endpoint is directly reachable (port 3001) and needs an
// independent gate. ttl is in milliseconds (@nestjs/throttler v5+).
const LOGIN_THROTTLE_LIMIT = 5
const LOGIN_THROTTLE_TTL_MS = 15 * 60 * 1000

@Controller('auth')
export class AuthController {
  private readonly loginStrategy: string

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {
    this.loginStrategy = configService.get<string>('LOGIN_STRATEGY') ?? 'sso'
  }

  /**
   * POST /auth/login
   * Credential (email + password) sign-in.
   * Disabled when LOGIN_STRATEGY === 'sso'.
   *
   * Rate-limited (ThrottlerGuard): LOGIN_THROTTLE_LIMIT attempts per
   * LOGIN_THROTTLE_TTL_MS per client — brute-force guard independent of the
   * Next.js Server Action rate limit (HIGH fix).
   *
   * Approval gate (HIGH fix): users with status !== 'approved' (pending /
   * rejected / suspended) must NOT receive a JWT. Supabase profiles enforce
   * this via getSessionStatus() in middleware, but that helper is a no-op for
   * vps-nest-* profiles, so the gate lives here at token issuance.
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard, LocalAuthGuard)
  @Throttle({ default: { limit: LOGIN_THROTTLE_LIMIT, ttl: LOGIN_THROTTLE_TTL_MS } })
  login(@Req() req: Request & { user: AuthUser }, @Res({ passthrough: true }) res: Response) {
    if (this.loginStrategy === 'sso') {
      throw new MethodNotAllowedException('email-pass disabled by LOGIN_STRATEGY')
    }

    if (req.user.status !== 'approved') {
      throw new ForbiddenException('account is not approved yet')
    }

    const token = this.authService.issueToken(req.user)
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: COOKIE_MAX_AGE_MS,
      path: '/',
    })

    return { email: req.user.email, role: req.user.role }
  }

  /**
   * GET /auth/google
   * Initiates Google OAuth redirect.
   * Disabled when LOGIN_STRATEGY === 'email-pass'.
   */
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleAuth() {
    if (this.loginStrategy === 'email-pass') {
      throw new MethodNotAllowedException('sso disabled by LOGIN_STRATEGY')
    }
    // Passport handles the redirect; this handler body is never reached.
  }

  /**
   * GET /auth/google/callback
   * Google OAuth callback — issues JWT cookie, redirects to Next.js app.
   */
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleAuthCallback(
    @Req() req: Request & { user: AuthUser | null },
    @Res() res: Response,
  ) {
    const user = req.user
    if (!user) {
      return res.redirect(
        `${this.configService.get('NEXT_PUBLIC_APP_URL') ?? '/'}/auth/sign-in?error=oauth_failed`,
      )
    }

    // Approval gate (HIGH fix): a freshly upserted Google OAuth user has
    // status=pending — do NOT issue a JWT cookie. Redirect to the
    // pending-approval page instead (mirrors the Supabase middleware gate,
    // which is silently skipped for vps-nest-* profiles).
    if (user.status !== 'approved') {
      const appUrl = this.configService.get<string>('NEXT_PUBLIC_APP_URL') ?? ''
      return res.redirect(`${appUrl}/auth/pending-approval`)
    }

    const token = this.authService.issueToken(user)
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: COOKIE_MAX_AGE_MS,
      path: '/',
    })

    const redirectTo = this.configService.get<string>('NEXT_PUBLIC_APP_URL') ?? '/'
    return res.redirect(redirectTo)
  }

  /**
   * POST /auth/logout
   * Clears the JWT cookie. Tolerates unauthenticated calls gracefully.
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(COOKIE_NAME, { path: '/' })
    return { message: 'logged out' }
  }

  /**
   * GET /auth/me
   * Returns the current authenticated user's email and role.
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: Request & { user: AuthUser }) {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    return { email: req.user.email, role: req.user.role }
  }
}
