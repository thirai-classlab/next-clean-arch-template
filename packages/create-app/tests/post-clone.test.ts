import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtemp, mkdir, writeFile, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { postClone } from '../src/post-clone.js';

let workDir: string;

async function scaffoldFakeTemplate(dir: string) {
  await mkdir(dir, { recursive: true });
  await writeFile(
    join(dir, 'package.json'),
    JSON.stringify({ name: 'next-clean-arch-template', version: '0.0.0' }, null, 2),
  );
  await writeFile(join(dir, '.env.example'), 'NEXT_PUBLIC_FOO=bar\n');
  await writeFile(join(dir, 'Dockerfile'), 'FROM node:20\n');
  await writeFile(join(dir, 'vercel.json'), '{}\n');
  // Variant files needed by Root 1 fix
  await mkdir(join(dir, 'src/lib/infrastructure'), { recursive: true });
  await writeFile(join(dir, 'src/lib/infrastructure/prisma-client.ts'), 'export {};\n');
  await writeFile(join(dir, 'src/lib/infrastructure/prisma-client.postgres.ts'), 'export {};\n');
  await writeFile(join(dir, 'src/lib/infrastructure/prisma-client.mariadb.ts'), 'export {};\n');
}

function makeExeca() {
  return vi.fn().mockResolvedValue({ exitCode: 0 });
}

describe('postClone: scaffold 後処理', () => {
  beforeEach(async () => {
    workDir = await mkdtemp(join(tmpdir(), 'create-app-test-'));
    await scaffoldFakeTemplate(workDir);
  });

  afterEach(async () => {
    await rm(workDir, { recursive: true, force: true });
  });

  it('package.json name を projectName に置換する', async () => {
    const execa = makeExeca();
    await postClone({
      targetDir: workDir,
      projectName: 'my-fresh-app',
      pm: 'pnpm',
      deployProfile: 'pro',
      loginStrategy: 'sso',
      authDomain: '',
      install: false,
      git: false,
      execa,
    });

    const pkg = JSON.parse(await readFile(join(workDir, 'package.json'), 'utf8'));
    expect(pkg.name).toBe('my-fresh-app');
  });

  it('.env.local を MOCK_MODE=true で作成する (pro profile)', async () => {
    const execa = makeExeca();
    await postClone({
      targetDir: workDir,
      projectName: 'my-fresh-app',
      pm: 'pnpm',
      deployProfile: 'pro',
      loginStrategy: 'sso',
      authDomain: '',
      install: false,
      git: false,
      execa,
    });

    const envLocal = await readFile(join(workDir, '.env.local'), 'utf8');
    expect(envLocal).toContain('MOCK_MODE=true');
    // Root 3 fix: pro pattern writes minimal, not pro (local dev is mock-safe)
    expect(envLocal).toContain('DEPLOY_PROFILE=minimal');
  });

  it('git: true 時は git init + add + commit を execa で実行する', async () => {
    const execa = makeExeca();
    await postClone({
      targetDir: workDir,
      projectName: 'my-fresh-app',
      pm: 'pnpm',
      deployProfile: 'vps-next-postgres',
      loginStrategy: 'sso',
      authDomain: '',
      install: false,
      git: true,
      execa,
    });

    const gitCalls = execa.mock.calls.filter((c) => c[0] === 'git');
    expect(gitCalls.length).toBeGreaterThanOrEqual(2); // init + add + commit
    const subcommands = gitCalls.map((c) => c[1][0]);
    expect(subcommands).toContain('init');
    expect(subcommands).toContain('commit');
  });

  it('git: false 時は git を一切呼ばない', async () => {
    const execa = makeExeca();
    await postClone({
      targetDir: workDir,
      projectName: 'my-fresh-app',
      pm: 'pnpm',
      deployProfile: 'pro',
      loginStrategy: 'sso',
      authDomain: '',
      install: false,
      git: false,
      execa,
    });
    expect(execa.mock.calls.filter((c) => c[0] === 'git')).toHaveLength(0);
  });

  it('install: true 時は選択 pm で install を実行する', async () => {
    const execa = makeExeca();
    await postClone({
      targetDir: workDir,
      projectName: 'my-fresh-app',
      pm: 'pnpm',
      deployProfile: 'vps-next-postgres',
      loginStrategy: 'sso',
      authDomain: '',
      install: true,
      git: false,
      execa,
    });
    const installCall = execa.mock.calls.find((c) => c[0] === 'pnpm');
    expect(installCall).toBeDefined();
    expect(installCall![1]).toContain('install');
  });

  it('install: false 時は pm install を呼ばない', async () => {
    const execa = makeExeca();
    await postClone({
      targetDir: workDir,
      projectName: 'my-fresh-app',
      pm: 'pnpm',
      deployProfile: 'pro',
      loginStrategy: 'sso',
      authDomain: '',
      install: false,
      git: false,
      execa,
    });
    expect(execa.mock.calls.filter((c) => c[0] === 'pnpm')).toHaveLength(0);
  });

  it('pro profile: variant sidecar files are removed after pruning', async () => {
    const execa = makeExeca();
    await postClone({
      targetDir: workDir,
      projectName: 'my-fresh-app',
      pm: 'pnpm',
      deployProfile: 'pro',
      loginStrategy: 'sso',
      authDomain: '',
      install: false,
      git: false,
      execa,
    });
    // Both variant sidecar files must be removed
    await expect(stat(join(workDir, 'src/lib/infrastructure/prisma-client.postgres.ts'))).rejects.toThrow();
    await expect(stat(join(workDir, 'src/lib/infrastructure/prisma-client.mariadb.ts'))).rejects.toThrow();
  });

  it('vps-next-postgres profile: postgres variant copied to prisma-client.ts, mariadb variant removed', async () => {
    // Scaffold a dir with variant content for identification
    const dir = await mkdtemp(join(tmpdir(), 'create-app-variant-'));
    try {
      await scaffoldFakeTemplate(dir);
      // Write distinguishable content to identify which variant was chosen
      await writeFile(join(dir, 'src/lib/infrastructure/prisma-client.postgres.ts'), 'export const VARIANT="postgres";\n');
      await writeFile(join(dir, 'src/lib/infrastructure/prisma-client.mariadb.ts'), 'export const VARIANT="mariadb";\n');

      const execa = makeExeca();
      await postClone({
        targetDir: dir,
        projectName: 'test-app',
        pm: 'pnpm',
        deployProfile: 'vps-next-postgres',
        loginStrategy: 'sso',
        authDomain: '',
        install: false,
        git: false,
        execa,
      });

      // prisma-client.ts should now contain postgres variant content
      const clientContent = await readFile(join(dir, 'src/lib/infrastructure/prisma-client.ts'), 'utf8');
      expect(clientContent).toContain('VARIANT="postgres"');

      // Sidecar variant files should be removed
      await expect(stat(join(dir, 'src/lib/infrastructure/prisma-client.postgres.ts'))).rejects.toThrow();
      await expect(stat(join(dir, 'src/lib/infrastructure/prisma-client.mariadb.ts'))).rejects.toThrow();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('vps-next-mariadb profile: mariadb variant copied to prisma-client.ts, postgres variant removed', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'create-app-variant-'));
    try {
      await scaffoldFakeTemplate(dir);
      await writeFile(join(dir, 'src/lib/infrastructure/prisma-client.postgres.ts'), 'export const VARIANT="postgres";\n');
      await writeFile(join(dir, 'src/lib/infrastructure/prisma-client.mariadb.ts'), 'export const VARIANT="mariadb";\n');

      const execa = makeExeca();
      await postClone({
        targetDir: dir,
        projectName: 'test-app',
        pm: 'pnpm',
        deployProfile: 'vps-next-mariadb',
        loginStrategy: 'sso',
        authDomain: '',
        install: false,
        git: false,
        execa,
      });

      const clientContent = await readFile(join(dir, 'src/lib/infrastructure/prisma-client.ts'), 'utf8');
      expect(clientContent).toContain('VARIANT="mariadb"');

      await expect(stat(join(dir, 'src/lib/infrastructure/prisma-client.postgres.ts'))).rejects.toThrow();
      await expect(stat(join(dir, 'src/lib/infrastructure/prisma-client.mariadb.ts'))).rejects.toThrow();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
