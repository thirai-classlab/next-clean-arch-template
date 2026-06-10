import { IsEnum, IsOptional, IsString, IsUrl, MinLength, validateSync } from 'class-validator'
import { plainToInstance } from 'class-transformer'

export class NestEnvConfig {
  @IsString()
  @MinLength(32, { message: 'JWT_SECRET must be at least 32 characters' })
  JWT_SECRET: string = ''

  @IsUrl(
    { protocols: ['postgresql', 'postgres', 'mysql', 'mariadb', 'sqlite', 'http', 'https'], require_tld: false, require_protocol: true },
    { message: 'DATABASE_URL must be a valid URL' },
  )
  DATABASE_URL: string = ''

  @IsOptional()
  @IsUrl({}, { message: 'NEST_API_URL must be a valid URL' })
  NEST_API_URL?: string

  @IsOptional()
  @IsString()
  AUTH_GOOGLE_ID?: string

  @IsOptional()
  @IsString()
  AUTH_GOOGLE_SECRET?: string

  @IsOptional()
  @IsString()
  AUTH_ALLOWED_EMAIL_DOMAIN?: string

  @IsOptional()
  @IsEnum(['sso', 'email-pass', 'both'], {
    message: 'LOGIN_STRATEGY must be one of: sso, email-pass, both',
  })
  LOGIN_STRATEGY: 'sso' | 'email-pass' | 'both' = 'sso'

  @IsOptional()
  @IsEnum(['minimal', 'unlocked', 'pro', 'vps', 'vps-next-postgres', 'vps-next-mariadb', 'vps-nest-postgres', 'vps-nest-mariadb'], {
    message: 'DEPLOY_PROFILE must be a valid profile name',
  })
  DEPLOY_PROFILE?: string

  @IsOptional()
  @IsString()
  NEXT_PUBLIC_APP_URL?: string

  @IsOptional()
  @IsString()
  NODE_ENV?: string
}

/**
 * Validate function for ConfigModule.forRoot({ validate }).
 * In test / MOCK_MODE we relax the required fields (JWT_SECRET, DATABASE_URL).
 */
export function validate(config: Record<string, unknown>): NestEnvConfig {
  const isTest = config['NODE_ENV'] === 'test'
  const isMock = config['MOCK_MODE'] === 'true'

  // In test/mock mode, inject placeholder values so NestJS can bootstrap.
  // AUTH_GOOGLE_ID/SECRET: GoogleStrategy is registered unconditionally and
  // passport-oauth2 throws on an empty clientID, so e2e bootstrap (CI has no
  // OAuth credentials) needs non-empty dummies.
  if (isTest || isMock) {
    config = {
      JWT_SECRET: 'test-secret-at-least-32-characters-long',
      DATABASE_URL: 'postgresql://localhost:5432/test',
      AUTH_GOOGLE_ID: 'test-google-client-id',
      AUTH_GOOGLE_SECRET: 'test-google-client-secret',
      ...config,
    }
  }

  const validated = plainToInstance(NestEnvConfig, config, {
    enableImplicitConversion: true,
  })

  const errors = validateSync(validated, {
    skipMissingProperties: false,
  })

  if (errors.length > 0) {
    const messages = errors
      .map((e) => Object.values(e.constraints ?? {}).join(', '))
      .join('; ')
    throw new Error(`Env validation failed: ${messages}`)
  }

  return validated
}
