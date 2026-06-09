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
  await writeFile(join(dir, 'docker-compose.yml'), 'services: {}\n');
  await writeFile(join(dir, 'vercel.json'), '{}\n');
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
      profile: 'vercel-supabase',
      install: false,
      git: false,
      execa,
    });

    const pkg = JSON.parse(await readFile(join(workDir, 'package.json'), 'utf8'));
    expect(pkg.name).toBe('my-fresh-app');
  });

  it('.env.example を .env.local に copy する', async () => {
    const execa = makeExeca();
    await postClone({
      targetDir: workDir,
      projectName: 'my-fresh-app',
      pm: 'pnpm',
      profile: 'vercel-supabase',
      install: false,
      git: false,
      execa,
    });

    const envLocal = await readFile(join(workDir, '.env.local'), 'utf8');
    expect(envLocal).toContain('NEXT_PUBLIC_FOO=bar');
  });

  it('git: true 時は git init + add + commit を execa で実行する', async () => {
    const execa = makeExeca();
    await postClone({
      targetDir: workDir,
      projectName: 'my-fresh-app',
      pm: 'pnpm',
      profile: 'vercel-supabase',
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
      profile: 'vercel-supabase',
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
      profile: 'vercel-supabase',
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
      profile: 'vercel-supabase',
      install: false,
      git: false,
      execa,
    });
    expect(execa.mock.calls.filter((c) => c[0] === 'pnpm')).toHaveLength(0);
  });

  it('vercel profile 選択時は Dockerfile / docker-compose.yml を削除する', async () => {
    const execa = makeExeca();
    await postClone({
      targetDir: workDir,
      projectName: 'my-fresh-app',
      pm: 'pnpm',
      profile: 'vercel-supabase',
      install: false,
      git: false,
      execa,
    });
    await expect(stat(join(workDir, 'Dockerfile'))).rejects.toThrow();
    await expect(stat(join(workDir, 'docker-compose.yml'))).rejects.toThrow();
    // vercel.json は残る
    await expect(stat(join(workDir, 'vercel.json'))).resolves.toBeDefined();
  });

  it('vps profile 選択時は vercel.json を削除する', async () => {
    const execa = makeExeca();
    await postClone({
      targetDir: workDir,
      projectName: 'my-fresh-app',
      pm: 'pnpm',
      profile: 'vps',
      install: false,
      git: false,
      execa,
    });
    await expect(stat(join(workDir, 'vercel.json'))).rejects.toThrow();
    // Dockerfile は残る
    await expect(stat(join(workDir, 'Dockerfile'))).resolves.toBeDefined();
  });
});
