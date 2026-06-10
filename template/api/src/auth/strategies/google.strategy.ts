import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { Strategy } from 'passport-google-oauth20'
import { ConfigService } from '@nestjs/config'
import { AuthService } from '../auth.service'

interface GoogleProfile {
  id: string
  displayName: string
  emails: Array<{ value: string }>
  photos: Array<{ value: string }>
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('AUTH_GOOGLE_ID') ?? '',
      clientSecret: configService.get<string>('AUTH_GOOGLE_SECRET') ?? '',
      callbackURL:
        (configService.get<string>('NEST_API_URL') ?? 'http://localhost:3001') +
        '/auth/google/callback',
      scope: ['email', 'profile'],
    })
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: GoogleProfile,
  ): Promise<unknown> {
    const email = profile.emails?.[0]?.value ?? ''
    const name = profile.displayName
    const image = profile.photos?.[0]?.value

    const user = await this.authService.upsertOAuthUser({ email, name, image })
    return user
  }
}
