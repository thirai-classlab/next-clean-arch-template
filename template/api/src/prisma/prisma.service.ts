import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

// We access PrismaClient via dynamic require to avoid hard-binding at module
// load time (the generated client may not exist during tests / CI lint).
// The service lazily initializes the client on first use.
type PrismaClientLike = {
  $connect(): Promise<void>
  $disconnect(): Promise<void>
  user: unknown
  account: unknown
  auditLog: unknown
}

/** Max directory levels to walk up when locating the mariadb prisma client. */
const MARIADB_CLIENT_SEARCH_DEPTH = 8

/**
 * Locate the generated mariadb Prisma client (prisma/mariadb/.prisma/client)
 * by walking up from `startDir`.
 *
 * Why a walk instead of a fixed relative import (HIGH fix):
 * the compiled location of this file differs by environment —
 *   - ts-jest / ts-node :  api/src/prisma/            (2 levels below api/)
 *   - nest build output :  api/dist/api/src/prisma/   (extra api/ level because
 *                          the @shared path mapping pulls ../src/lib into the
 *                          program, widening the inferred rootDir to template/)
 *   - Docker runtime    :  /app/dist/api/src/prisma/  (client copied to
 *                          /app/prisma/mariadb/.prisma/client)
 * A fixed '../../prisma/...' import silently missed in all compiled layouts
 * and the `.catch(() => import('@prisma/client'))` fallback then handed a
 * mysql:// DATABASE_URL to the postgresql-provider client.
 */
export function findMariadbClientDir(startDir: string): string | null {
  let dir = startDir
  for (let i = 0; i < MARIADB_CLIENT_SEARCH_DEPTH; i++) {
    const candidate = join(dir, 'prisma', 'mariadb', '.prisma', 'client')
    if (existsSync(candidate)) {
      return candidate
    }
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return null
}

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name)
  private _client: PrismaClientLike | null = null

  constructor(private readonly configService: ConfigService) {}

  private get client(): PrismaClientLike {
    if (!this._client) {
      throw new Error('[PrismaService] client not initialized — call $connect first')
    }
    return this._client
  }

  async onModuleInit(): Promise<void> {
    const profile = this.configService.get<string>('DEPLOY_PROFILE')

    // Resolve the profile-correct Prisma client. Resolution failures for the
    // mariadb profile are FATAL (no silent fallback to the postgresql-provider
    // client — that fallback used to swallow a mysql:// DATABASE_URL and fail
    // at connect time with a misleading error).
    if (profile === 'vps-nest-mariadb') {
      const clientDir = findMariadbClientDir(__dirname)
      if (!clientDir) {
        throw new Error(
          '[PrismaService] mariadb Prisma client not found for DEPLOY_PROFILE=vps-nest-mariadb. ' +
            'Run: prisma generate --schema ../prisma/mariadb/schema.prisma (from api/), ' +
            'or check that prisma/mariadb/.prisma/client was copied into the runtime image.',
        )
      }
      const { PrismaClient } = await import(clientDir)
      this._client = new PrismaClient()
    } else {
      const { PrismaClient } = await import('@prisma/client')
      this._client = new PrismaClient()
    }

    try {
      await this._client!.$connect()
      this.logger.log(`PrismaService connected (profile: ${profile ?? 'default'})`)
    } catch (err) {
      // DB unreachable at bootstrap (e.g. compose start order, unit tests
      // without a database) — defer; queries will fail loudly when attempted.
      this.logger.warn(`PrismaService connection deferred: ${(err as Error).message}`)
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this._client) {
      await this._client.$disconnect()
    }
  }

  get user() {
    return (this.client as unknown as Record<string, unknown>).user as PrismaClientLike['user']
  }

  get account() {
    return (this.client as unknown as Record<string, unknown>).account as PrismaClientLike['account']
  }

  get auditLog() {
    return (this.client as unknown as Record<string, unknown>).auditLog as PrismaClientLike['auditLog']
  }

  /** Expose raw client for adapters that need full access. */
  getClient(): PrismaClientLike {
    return this.client
  }
}
