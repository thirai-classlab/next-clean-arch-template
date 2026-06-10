import { describe, it, expect, beforeEach } from 'vitest';
import prompts from 'prompts';
import { runPrompts, PROFILES, PACKAGE_MANAGERS } from '../src/prompt.js';

describe('runPrompts: 正規化された options object を返す', () => {
  beforeEach(() => {
    // prompts.inject の残りキューをクリア
    // @ts-expect-error internal reset for test isolation
    prompts._injected = undefined;
  });

  it('全 prompt 応答 -> 正規化 options object (新インターフェース)', async () => {
    // New interface: target/backend/db/auth/authDomain/pm/install/git
    // projectName is first, then target, backend, db, auth, authDomain, pm, install, git
    prompts.inject([
      'my-app',       // projectName
      'vercel',       // target
      'next-only',    // backend
      'postgres',     // db
      ['google'],     // auth (multiselect)
      '',             // authDomain
      'pnpm',         // pm
      true,           // install
      true,           // git
    ]);

    const result = await runPrompts({});

    expect(result.projectName).toBe('my-app');
    expect(result.target).toBe('vercel');
    expect(result.backend).toBe('next-only');
    expect(result.db).toBe('postgres');
    expect(result.auth).toEqual(['google']);
    expect(result.pm).toBe('pnpm');
    expect(result.install).toBe(true);
    expect(result.git).toBe(true);
  });

  it('引数で渡された全フィールドがある場合、プロンプトを一切呼ばない', async () => {
    // When all fields provided, questions array is empty — no prompts called.
    // This is the key non-TTY correctness guarantee.
    const result = await runPrompts({
      projectName: 'cli-passed-name',
      target: 'vps',
      backend: 'next-only',
      db: 'postgres',
      auth: ['google', 'email-pw'],
      authDomain: '',
      pm: 'npm',
      install: false,
      git: false,
    });

    expect(result.projectName).toBe('cli-passed-name');
    expect(result.target).toBe('vps');
    expect(result.pm).toBe('npm');
    expect(result.install).toBe(false);
    expect(result.git).toBe(false);
  });

  it('部分的なフィールドのみ渡した場合、残りが prompts.inject の値で補完される', async () => {
    // Only projectName provided — the rest are prompted
    prompts.inject([
      'vercel',       // target
      'next-only',    // backend
      'postgres',     // db
      ['email-pw'],   // auth
      '',             // authDomain
      'yarn',         // pm
      true,           // install
      false,          // git
    ]);

    const result = await runPrompts({ projectName: 'partial-app' });

    expect(result.projectName).toBe('partial-app');
    expect(result.pm).toBe('yarn');
    expect(result.git).toBe(false);
  });

  it('Ctrl-C (cancel) で graceful exit (code 130) を throw する', async () => {
    // injected error はキャンセルをシミュレートする
    prompts.inject([new Error('simulate cancel')]);

    await expect(runPrompts({})).rejects.toMatchObject({ exitCode: 130 });
  });
});

describe('prompt: 定数の SSoT', () => {
  it('PACKAGE_MANAGERS は pnpm/npm/yarn', () => {
    expect(PACKAGE_MANAGERS).toEqual(['pnpm', 'npm', 'yarn']);
  });

  it('PROFILES は 4 deploy profile (backward-compat 定数)', () => {
    expect(PROFILES).toEqual([
      'vercel-managed',
      'vercel-supabase',
      'vps',
      'air-gap',
    ]);
  });
});
