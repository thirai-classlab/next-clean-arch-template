import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ThrottlerModule } from '@nestjs/throttler'
import { validate } from './config/env.config'
import { PrismaModule } from './prisma/prisma.module'
import { AuthModule } from './auth/auth.module'
import { UsersModule } from './users/users.module'
import { HealthController } from './health/health.controller'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
      // Allow env vars to be absent in MOCK_MODE / test
      ignoreEnvFile: false,
    }),
    // Rate limiting (HIGH fix): registered globally so ThrottlerGuard can be
    // applied per-route (POST /auth/login uses @Throttle 5 req / 15 min).
    // No global APP_GUARD — only explicitly guarded routes are limited.
    // skipIf NODE_ENV=test: jest e2e suites issue many logins; production
    // keeps the gate (throttle behavior is covered by a dedicated e2e app
    // instance that overrides the skip).
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 15 * 60 * 1000, limit: 5 }],
      skipIf: () => process.env.NODE_ENV === 'test' && process.env.THROTTLE_E2E !== 'true',
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
