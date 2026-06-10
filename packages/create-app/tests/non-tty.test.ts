import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveConfig, resolveDeployProfile, resolveLoginStrategy } from '../src/config-resolver.js';
import { postClone } from '../src/post-clone.js';

// ---------------------------------------------------------------------------
// Non-TTY contract: resolveConfig
// ---------------------------------------------------------------------------

describe('non-TTY contract: resolveConfig', () => {
  it('with all flags provided and isTTY=false → returns config, no missing', () => {
    const result = resolveConfig(
      {
        projectName: 'headless-app',
        target: 'vercel',
        backend: 'next-only',
        db: 'postgres',
        auth: ['google', 'email-pw'],
        authDomain: '',
        pm: 'npm',
        install: false,
        git: false,
      },
      false,
    );
    expect('config' in result).toBe(true);
    expect('missing' in result).toBe(false);
    if (!('config' in result)) return;
    expect(result.config.projectName).toBe('headless-app');
    expect(result.config.target).toBe('vercel');
    expect(result.config.pm).toBe('npm');
    expect(result.config.install).toBe(false);
    expect(result.config.git).toBe(false);
  });

  it('with no flags and isTTY=false → returns missing=[name]', () => {
    // Root 4 fix: project name is required in non-TTY mode.
    const result = resolveConfig({}, false);
    expect('missing' in result).toBe(true);
    if (!('missing' in result)) return;
    expect(result.missing).toContain('name');
  });

  it('with projectName only and isTTY=false → config returned with all defaults', () => {
    const result = resolveConfig({ projectName: 'my-app' }, false);
    expect('config' in result).toBe(true);
    if (!('config' in result)) return;
    expect(result.config.target).toBe('vercel');
    expect(result.config.pm).toBe('pnpm');
    expect(result.config.install).toBe(true);
    expect(result.config.git).toBe(true);
  });

  it('isTTY=false + target=vps without backend/db → returns missing=[backend, db]', () => {
    // Root 4 fix: VPS target requires explicit backend and db in non-TTY mode.
    const result = resolveConfig({ projectName: 'my-app', target: 'vps' }, false);
    expect('missing' in result).toBe(true);
    if (!('missing' in result)) return;
    expect(result.missing).toContain('backend');
    expect(result.missing).toContain('db');
  });

  it('isTTY=false + target=vps + backend+db provided → config returned with defaults for rest', () => {
    const result = resolveConfig({ projectName: 'my-app', target: 'vps', backend: 'next-only', db: 'mariadb' }, false);
    expect('config' in result).toBe(true);
    if (!('config' in result)) return;
    expect(result.config.target).toBe('vps');
    expect(result.config.db).toBe('mariadb');
    expect(result.config.backend).toBe('next-only');
    expect(result.config.pm).toBe('pnpm');           // default
  });
});

// ---------------------------------------------------------------------------
// Non-TTY contract: runPrompts skips all prompts when all argv provided
// ---------------------------------------------------------------------------

describe('non-TTY contract: runPrompts with fully-provided argv', () => {
  it('returns pre-filled answers without calling prompts when all argv keys set', async () => {
    // When all fields are provided in argv, runPrompts builds an empty questions array
    // and returns the merged result directly without calling prompts().
    // We verify this by passing complete argv and asserting the return value matches.
    const { runPrompts } = await import('../src/prompt.js');
    const result = await runPrompts({
      projectName: 'no-prompt-app',
      target: 'vercel',
      backend: 'next-only',
      db: 'postgres',
      auth: ['google'],
      authDomain: '',
      pm: 'pnpm',
      install: false,
      git: false,
    });
    // All values should be exactly what was provided, no prompt interaction
    expect(result.projectName).toBe('no-prompt-app');
    expect(result.target).toBe('vercel');
    expect(result.auth).toEqual(['google']);
    expect(result.pm).toBe('pnpm');
    expect(result.install).toBe(false);
    expect(result.git).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Non-TTY postClone: writes correct .env.local per pattern without subprocess
// ---------------------------------------------------------------------------

describe('non-TTY postClone: .env.local written correctly per pattern', () => {
  let tmpDir: string;

  async function scaffoldMinimal(dir: string) {
    const mkd = (rel: string) => mkdir(join(dir, rel), { recursive: true });
    const touch = (rel: string, content = 'content\n') => writeFile(join(dir, rel), content);

    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'template', version: '0.0.0' }, null, 2),
    );
    // Variant files needed by Root 1 fix (copyFile in prunePatternFiles)
    await mkd('src/lib/infrastructure');
    await touch('src/lib/infrastructure/prisma-client.ts', 'export {};\n');
    await touch('src/lib/infrastructure/prisma-client.postgres.ts', 'export {};\n');
    await touch('src/lib/infrastructure/prisma-client.mariadb.ts', 'export {};\n');
    // Other pruning targets — force:true skips missing, but include key ones
  }

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'non-tty-test-'));
    await scaffoldMinimal(tmpDir);
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  const cases = [
    {
      target: 'vercel' as const,
      backend: 'next-only' as const,
      db: 'postgres' as const,
      auth: ['google', 'email-pw'] as ('google' | 'email-pw')[],
      authDomain: '',
      expectedProfile: 'pro',
      // Root 3 fix: vercel/pro pattern writes DEPLOY_PROFILE=minimal for local dev
      expectedContent: 'DEPLOY_PROFILE=minimal',
    },
    {
      target: 'vps' as const,
      backend: 'next-only' as const,
      db: 'postgres' as const,
      auth: ['google'] as ('google' | 'email-pw')[],
      authDomain: '',
      expectedProfile: 'vps-next-postgres',
      expectedContent: 'DEPLOY_PROFILE=vps-next-postgres',
    },
    {
      target: 'vps' as const,
      backend: 'next-nest' as const,
      db: 'mariadb' as const,
      auth: ['email-pw'] as ('google' | 'email-pw')[],
      authDomain: 'school.example.com',
      expectedProfile: 'vps-nest-mariadb',
      expectedContent: 'AUTH_ALLOWED_EMAIL_DOMAIN=school.example.com',
    },
  ] as const;

  for (const c of cases) {
    it(`${c.expectedProfile}: writes correct .env.local without subprocess`, async () => {
      // Use a fresh dir for each case
      const dir = await mkdtemp(join(tmpdir(), `non-tty-case-`));
      try {
        await scaffoldMinimal(dir);
        const execa = vi.fn().mockResolvedValue({ exitCode: 0 });
        const deployProfile = resolveDeployProfile(c.target, c.backend, c.db);
        const loginStrategy = resolveLoginStrategy(c.auth);
        await postClone({
          targetDir: dir,
          projectName: 'test',
          pm: 'pnpm',
          deployProfile,
          loginStrategy,
          authDomain: c.authDomain,
          install: false,
          git: false,
          execa,
        });
        // No subprocess should have been called
        expect(execa).not.toHaveBeenCalled();
        const content = await readFile(join(dir, '.env.local'), 'utf8');
        expect(content).toContain(c.expectedContent);
        expect(content).toContain('MOCK_MODE=true');
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    });
  }
});
