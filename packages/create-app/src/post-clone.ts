import { readFile, writeFile, copyFile, rm, access } from 'node:fs/promises';
import { join } from 'node:path';
import { execa as defaultExeca } from 'execa';
import type { PackageManager } from './prompt.js';
import type { DeployProfile, LoginStrategy } from './config-resolver.js';
import { classifyError } from './errors.js';

/**
 * Post-clone operations:
 * (a) package.json name rewrite
 * (b) write .env.local with pattern-specific content
 * (c) prune pattern-specific files
 * (d) patch root configs (tsconfig.json / eslint.config.mjs) when api/ removed
 * (e) git init + initial commit
 * (f) pm install
 *
 * execa is injectable for tests.
 */

type ExecaFn = typeof defaultExeca;

export interface PostCloneOptions {
  targetDir: string;
  projectName: string;
  pm: PackageManager;
  deployProfile: DeployProfile;
  loginStrategy: LoginStrategy;
  authDomain: string;
  install: boolean;
  git: boolean;
  execa?: ExecaFn;
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function rewritePackageName(
  targetDir: string,
  projectName: string,
): Promise<void> {
  const pkgPath = join(targetDir, 'package.json');
  const pkg = JSON.parse(await readFile(pkgPath, 'utf8')) as Record<string, unknown>;
  pkg.name = projectName;
  await writeFile(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
}

/**
 * Write .env.local with pattern-specific content.
 * This replaces the old copyEnvExample() call.
 */
export async function writeEnvLocal(
  targetDir: string,
  deployProfile: DeployProfile,
  loginStrategy: LoginStrategy,
  authDomain: string,
): Promise<void> {
  const includeGoogle = loginStrategy === 'sso' || loginStrategy === 'both';
  const domainLine =
    authDomain !== '' ? `AUTH_ALLOWED_EMAIL_DOMAIN=${authDomain}\n` : '';

  let content: string;

  // Root 3 fix: vercel/pro pattern writes DEPLOY_PROFILE=minimal for local dev.
  // env-schema refinement 4 forbids MOCK_MODE=true with pro/unlocked/vps
  // (production-safety guard — do not change the guard).
  // Local dev uses DEPLOY_PROFILE=minimal (mock-safe).
  // Production: set DEPLOY_PROFILE=pro in the Vercel dashboard environment variables.
  const needsRateLimit = loginStrategy !== 'sso';
  if (deployProfile === 'pro') {
    content = [
      'MOCK_MODE=true',
      '# Local dev: DEPLOY_PROFILE=minimal is mock-safe (refinement 4 forbids MOCK_MODE=true with pro)',
      '# Production: set DEPLOY_PROFILE=pro in your Vercel dashboard environment variables',
      'DEPLOY_PROFILE=minimal',
      `LOGIN_STRATEGY=${loginStrategy}`,
      ...(needsRateLimit ? ['RATE_LIMIT_ENABLED=true'] : []),
      domainLine.trimEnd(),
      '# Production keys (fill in before going live):',
      '# NEXT_PUBLIC_SUPABASE_URL=',
      '# NEXT_PUBLIC_SUPABASE_ANON_KEY=',
      '# SUPABASE_SERVICE_ROLE_KEY=',
      ...(includeGoogle
        ? [
            '# GOOGLE_OAUTH_CLIENT_ID=',
            '# GOOGLE_OAUTH_CLIENT_SECRET=',
          ]
        : []),
    ]
      .filter((line) => line !== '')
      .join('\n') + '\n';
  } else if (
    deployProfile === 'vps-next-postgres' ||
    deployProfile === 'vps-nest-postgres'
  ) {
    content = [
      'MOCK_MODE=true',
      `DEPLOY_PROFILE=${deployProfile}`,
      `LOGIN_STRATEGY=${loginStrategy}`,
      ...(needsRateLimit ? ['RATE_LIMIT_ENABLED=true'] : []),
      domainLine.trimEnd(),
      '# Production keys (fill in before deploying):',
      '# DATABASE_URL=postgresql://appuser:CHANGE_ME@localhost:5432/appdb',
      '# NEXTAUTH_SECRET=',
      '# NEXTAUTH_URL=https://app.example.com',
      ...(includeGoogle
        ? [
            '# AUTH_GOOGLE_ID=',
            '# AUTH_GOOGLE_SECRET=',
          ]
        : []),
    ]
      .filter((line) => line !== '')
      .join('\n') + '\n';
  } else {
    // vps-next-mariadb or vps-nest-mariadb
    content = [
      'MOCK_MODE=true',
      `DEPLOY_PROFILE=${deployProfile}`,
      `LOGIN_STRATEGY=${loginStrategy}`,
      ...(needsRateLimit ? ['RATE_LIMIT_ENABLED=true'] : []),
      domainLine.trimEnd(),
      '# Production keys (fill in before deploying):',
      '# DATABASE_URL=mysql://appuser:CHANGE_ME@localhost:3307/appdb',
      '# NEXTAUTH_SECRET=',
      '# NEXTAUTH_URL=https://app.example.com',
      ...(includeGoogle
        ? [
            '# AUTH_GOOGLE_ID=',
            '# AUTH_GOOGLE_SECRET=',
          ]
        : []),
    ]
      .filter((line) => line !== '')
      .join('\n') + '\n';
  }

  await writeFile(join(targetDir, '.env.local'), content);
}

/**
 * Remove a path (file or directory) — missing paths are silently skipped.
 */
async function rmForce(p: string): Promise<void> {
  await rm(p, { recursive: true, force: true });
}

/**
 * Prune files/directories per the 5-pattern matrix.
 */
export async function prunePatternFiles(
  targetDir: string,
  deployProfile: DeployProfile,
): Promise<void> {
  const r = (rel: string) => join(targetDir, rel);

  const removals: string[] = [];

  if (deployProfile === 'pro') {
    // vercel: remove NestJS backend, VPS docker files, Prisma, VPS env/scripts
    removals.push(
      r('api'),
      r('docker-compose.vps.yml'),
      r('docker-compose.mariadb.yml'),
      r('docker-compose.nest-postgres.yml'),
      r('docker-compose.nest-mariadb.yml'),
      r('Dockerfile'),
      r('prisma'),
      r('.env.vps.example'),
      r('.env.mariadb.example'),
      r('scripts/setup-vps-postgres.sh'),
      r('scripts/setup-supabase.test.sh'),
      r('scripts/seed-users.ts'),
      // prisma-mariadb.ts is only for vps-*-mariadb profiles; remove for non-mariadb
      r('src/lib/infrastructure/prisma-mariadb.ts'),
      // NextAuth (Auth.js) is only for vps profiles — vercel/pro uses Supabase auth.
      // src/auth.ts imports @auth/prisma-adapter which requires a generated Prisma
      // client at bundle-collection time. Pruning auth.ts + the nextauth route
      // prevents webpack from bundling the prisma-adapter → @prisma/client chain.
      r('src/auth.ts'),
      r('src/auth.spec.ts'),
      r('src/app/api/auth/[...nextauth]'),
      // VPS-specific sign-in actions that import from '@/auth' (src/auth.ts)
      r('src/lib/interfaces/actions/sign-in-vps.action.ts'),
      r('src/lib/interfaces/actions/sign-in-vps-nest.action.ts'),
      r('src/lib/interfaces/actions/sign-in-vps-nest.action.spec.ts'),
      // NextAuthAdapter imports getProfilePrismaClient → prisma.ts → @prisma/client
      r('src/lib/infrastructure/adapters/real/nextauth-auth.adapter.ts'),
      // PrismaUserRepository imports ProfilePrismaClient type from prisma-client.ts
      r('src/lib/infrastructure/repositories/prisma/prisma-user.repository.ts'),
    );
  } else if (deployProfile === 'vps-next-postgres') {
    removals.push(
      r('api'),
      r('docker-compose.mariadb.yml'),
      r('docker-compose.nest-postgres.yml'),
      r('docker-compose.nest-mariadb.yml'),
      r('prisma/mariadb'),
      r('supabase'),
      r('vercel.ts'),
      r('.env.mariadb.example'),
      r('scripts/setup-supabase.sh'),
      r('scripts/setup-supabase.test.sh'),
      r('scripts/setup-vercel.sh'),
      r('scripts/setup-vercel.test.sh'),
      // prisma-mariadb.ts is only for vps-*-mariadb profiles; remove for postgres
      r('src/lib/infrastructure/prisma-mariadb.ts'),
    );
  } else if (deployProfile === 'vps-next-mariadb') {
    removals.push(
      r('api'),
      r('docker-compose.vps.yml'),
      r('docker-compose.nest-postgres.yml'),
      r('docker-compose.nest-mariadb.yml'),
      r('prisma/schema.prisma'),
      r('prisma/migrations'),
      r('supabase'),
      r('vercel.ts'),
      r('.env.vps.example'),
      r('scripts/setup-supabase.sh'),
      r('scripts/setup-supabase.test.sh'),
      r('scripts/setup-vercel.sh'),
      r('scripts/setup-vercel.test.sh'),
    );
  } else if (deployProfile === 'vps-nest-postgres') {
    removals.push(
      r('docker-compose.mariadb.yml'),
      r('docker-compose.nest-mariadb.yml'),
      r('docker-compose.vps.yml'),
      r('prisma/mariadb'),
      r('supabase'),
      r('vercel.ts'),
      r('.env.mariadb.example'),
      r('scripts/setup-supabase.sh'),
      r('scripts/setup-supabase.test.sh'),
      r('scripts/setup-vercel.sh'),
      r('scripts/setup-vercel.test.sh'),
      // prisma-mariadb.ts is only for vps-*-mariadb profiles; remove for postgres
      r('src/lib/infrastructure/prisma-mariadb.ts'),
    );
  } else {
    // vps-nest-mariadb
    removals.push(
      r('docker-compose.vps.yml'),
      r('docker-compose.nest-postgres.yml'),
      r('docker-compose.mariadb.yml'),
      r('prisma/schema.prisma'),
      r('prisma/migrations'),
      r('supabase'),
      r('vercel.ts'),
      r('.env.vps.example'),
      r('scripts/setup-supabase.sh'),
      r('scripts/setup-supabase.test.sh'),
      r('scripts/setup-vercel.sh'),
      r('scripts/setup-vercel.test.sh'),
    );
  }

  await Promise.all(removals.map(rmForce));

  // Root 1 fix: select the correct prisma-client variant for the active profile.
  //
  // The template ships three variant files:
  //   prisma-client.postgres.ts — imports only './prisma' (postgres-only, no webpackIgnore)
  //   prisma-client.mariadb.ts  — imports only './prisma-mariadb' (mariadb-only, no webpackIgnore)
  //   prisma-client.ts          — "both" variant with conditional branches and webpackIgnore tricks
  //
  // After pruning, we copy the correct variant over prisma-client.ts and remove the other
  // variant files. This ensures webpack can statically trace the single import path in
  // the resulting prisma-client.ts without encountering MODULE_NOT_FOUND for pruned files.
  const infraDir = r('src/lib/infrastructure');
  const prismaClientPath = join(infraDir, 'prisma-client.ts');
  const postgresVariant = join(infraDir, 'prisma-client.postgres.ts');
  const mariadbVariant = join(infraDir, 'prisma-client.mariadb.ts');

  const isMariadbProfile =
    deployProfile === 'vps-next-mariadb' || deployProfile === 'vps-nest-mariadb';
  const hasPrisma = deployProfile !== 'pro';

  // Root 2b fix: strip the postgres drift-guard section from prisma-mariadb.ts
  // on mariadb-only profiles (vps-next-mariadb, vps-nest-mariadb).
  //
  // prisma-mariadb.ts ships with compile-time drift guards that import
  //   import type { User as PostgresUser, ... } from '@prisma/client'
  // These guards are useful in the template repo (where both schemas coexist),
  // but on mariadb-only scaffolds the postgres schema is pruned and @prisma/client
  // (the postgresql-provider generated client) is never generated.
  //
  // TypeScript follows `await import('./prisma-mariadb')` from prisma-client.ts
  // even if prisma-mariadb.ts is in tsconfig.json "exclude" — the exclude only
  // prevents direct top-level type-checking, not transitive resolution through
  // imports. Stripping the postgres type imports + drift guard constants removes
  // the TS2307 "Module '@prisma/client' has no exported member" error.
  if (isMariadbProfile) {
    const prismaMariadbPath = r('src/lib/infrastructure/prisma-mariadb.ts');
    if (await fileExists(prismaMariadbPath)) {
      let src = await readFile(prismaMariadbPath, 'utf8');

      // Remove the block: import type { User as PostgresUser, ... } from '@prisma/client'
      src = src.replace(
        /^import type \{[^}]*\} from '@prisma\/client'\n/m,
        '',
      );

      // Remove the drift guard section including the comment header, type alias, consts, and void calls
      src = src.replace(
        /\/\/ ── Compile-time schema drift guards ─[^\n]*\n[\s\S]*?void _auditLogRowDriftGuard\s*\n?/,
        '',
      );

      await writeFile(prismaMariadbPath, src);
    }
  }

  if (hasPrisma) {
    if (isMariadbProfile) {
      // mariadb-only profile: use the mariadb variant
      await copyFile(mariadbVariant, prismaClientPath);
    } else {
      // postgres-only profile (vps-next-postgres, vps-nest-postgres):
      // use the postgres variant
      await copyFile(postgresVariant, prismaClientPath);
    }
  }

  // Always remove the variant sidecars — prisma-client.ts is now the canonical file.
  // For vercel/pro, prisma-client.ts itself is also removed (prisma is fully pruned),
  // but the variant sidecars must be removed regardless to avoid orphaned files.
  await rmForce(postgresVariant);
  await rmForce(mariadbVariant);
}

/**
 * After pruning api/ and/or prisma-mariadb.ts, remove their references from
 * tsconfig.json and eslint.config.mjs using regex-based rewrite (no AST
 * parser dependency).
 */
export async function patchRootConfigs(
  targetDir: string,
  deployProfile: DeployProfile,
): Promise<void> {
  // api/ is removed for: pro, vps-next-postgres, vps-next-mariadb
  const apiRemoved =
    deployProfile === 'pro' ||
    deployProfile === 'vps-next-postgres' ||
    deployProfile === 'vps-next-mariadb';

  // Determine which source files need to be added to tsconfig.json exclude[].
  // TypeScript statically resolves dynamic import() paths and import type
  // statements; any file that imports from a deleted module (or is itself
  // deleted) must be excluded from the TypeScript compilation to avoid
  // TS2307 "Cannot find module" errors during `next build`.

  // prisma-mariadb.ts is removed for non-mariadb profiles.
  const mariadbRemoved =
    deployProfile === 'pro' ||
    deployProfile === 'vps-next-postgres' ||
    deployProfile === 'vps-nest-postgres';

  // For vercel/pro, the entire prisma/ directory is pruned. Files that
  // import from '@prisma/client' (which is not generated without a schema)
  // must be excluded from TypeScript type-checking.
  const allPrismaRemoved = deployProfile === 'pro';

  const mariadbOnly =
    deployProfile === 'vps-next-mariadb' || deployProfile === 'vps-nest-mariadb';
  if (!apiRemoved && !mariadbRemoved && !allPrismaRemoved && !mariadbOnly) return;

  // Patch tsconfig.json
  const tsconfigPath = join(targetDir, 'tsconfig.json');
  if (await fileExists(tsconfigPath)) {
    const raw = await readFile(tsconfigPath, 'utf8');

    // Step 1: regex-based api/ path removal (preserves JSON comment-like structure)
    let tsconfigStr = raw;
    if (apiRemoved) {
      // Remove path mapping lines containing "api/"
      tsconfigStr = tsconfigStr.replace(/^\s*"[^"]*":\s*\["[^"]*api[^"]*"\][,]?\s*\n/gm, '');
      // Remove project references entries pointing to api/
      tsconfigStr = tsconfigStr.replace(/^\s*\{\s*"path":\s*"[^"]*api[^"]*"\s*\}[,]?\s*\n/gm, '');
      await writeFile(tsconfigPath, tsconfigStr);
    }

    // Step 2: add prisma-related entries to tsconfig.exclude[]
    const excludeEntries: string[] = [];

    if (mariadbRemoved) {
      // prisma-mariadb.ts uses webpackIgnore to skip webpack bundling, but
      // TypeScript still resolves the import() path at type-check time.
      excludeEntries.push('src/lib/infrastructure/prisma-mariadb.ts');
    }

    // For mariadb-only profiles (vps-next-mariadb, vps-nest-mariadb), the
    // postgres @prisma/client is NOT generated because prisma/schema.prisma is
    // pruned. Two files import from '@prisma/client' and fail tsc with TS2307:
    //   - prisma-mariadb.ts (drift guards — stripped by Root 2b fix above, but
    //     tsconfig exclude provides defense-in-depth)
    //   - prisma.ts (postgres-only singleton — not used by mariadb-only code
    //     paths, but remains as an orphan file; excluding from tsc prevents
    //     TS2307 "PrismaClient has no exported member" false-positive errors)
    if (mariadbOnly) {
      excludeEntries.push('src/lib/infrastructure/prisma-mariadb.ts');
      excludeEntries.push('src/lib/infrastructure/prisma.ts');
    }

    if (allPrismaRemoved) {
      // On vercel/pro, all Prisma schema + generated client files are pruned.
      // Files below import from '@prisma/client' whose PrismaClient type is
      // only generated when prisma/schema.prisma exists (postgres schema).
      excludeEntries.push(
        'src/lib/infrastructure/prisma.ts',
        'src/lib/infrastructure/prisma-client.ts',
        'src/lib/infrastructure/repositories/prisma/prisma-user.repository.ts',
        'src/lib/infrastructure/adapters/real/nextauth-auth.adapter.ts',
      );
    }

    if (excludeEntries.length > 0) {
      // Re-read after potential api patch above
      const current = JSON.parse(await readFile(tsconfigPath, 'utf8')) as {
        exclude?: string[];
        [key: string]: unknown;
      };
      if (!Array.isArray(current.exclude)) {
        current.exclude = [];
      }
      for (const entry of excludeEntries) {
        if (!current.exclude.includes(entry)) {
          current.exclude.push(entry);
        }
      }
      await writeFile(tsconfigPath, `${JSON.stringify(current, null, 2)}\n`);
    }
  }

  if (!apiRemoved) return;

  // Patch eslint.config.mjs: remove import/require lines referencing api/ config
  const eslintPath = join(targetDir, 'eslint.config.mjs');
  if (await fileExists(eslintPath)) {
    let eslint = await readFile(eslintPath, 'utf8');
    // Remove import lines that reference api/
    eslint = eslint.replace(/^[^\n]*['"]\.\/api[^\n]*\n/gm, '');
    // Remove spread/object entries that reference api config variable
    eslint = eslint.replace(/^\s*\.\.\.api[A-Za-z]*Config[^\n]*\n/gm, '');
    await writeFile(eslintPath, eslint);
  }
}

async function initGit(targetDir: string, execa: ExecaFn): Promise<void> {
  const opts = { cwd: targetDir } as const;
  await execa('git', ['init', '-b', 'main'], opts);
  await execa('git', ['add', '-A'], opts);
  await execa(
    'git',
    ['commit', '-m', 'chore: initial commit from @takuma-hirai/create-app'],
    opts,
  );
}

async function installDeps(
  targetDir: string,
  pm: PackageManager,
  execa: ExecaFn,
): Promise<void> {
  await execa(pm, ['install'], { cwd: targetDir });
}

export async function postClone(opts: PostCloneOptions): Promise<void> {
  const execa = opts.execa ?? defaultExeca;
  try {
    await rewritePackageName(opts.targetDir, opts.projectName);
    await prunePatternFiles(opts.targetDir, opts.deployProfile);
    await patchRootConfigs(opts.targetDir, opts.deployProfile);
    await writeEnvLocal(opts.targetDir, opts.deployProfile, opts.loginStrategy, opts.authDomain);

    if (opts.git) {
      await initGit(opts.targetDir, execa);
    }
    if (opts.install) {
      await installDeps(opts.targetDir, opts.pm, execa);
    }
  } catch (err: unknown) {
    throw classifyError(err);
  }
}
