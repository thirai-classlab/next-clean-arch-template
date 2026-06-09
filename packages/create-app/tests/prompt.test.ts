import { describe, it, expect, beforeEach } from 'vitest';
import prompts from 'prompts';
import { runPrompts, PROFILES, PACKAGE_MANAGERS } from '../src/prompt.js';

describe('runPrompts: 正規化された options object を返す', () => {
  beforeEach(() => {
    // prompts.inject の残りキューをクリア
    // @ts-expect-error internal reset for test isolation
    prompts._injected = undefined;
  });

  it('全 prompt 応答 -> 正規化 options object', async () => {
    prompts.inject(['my-app', 'pnpm', 'vercel-supabase', true, true]);

    const result = await runPrompts({});

    expect(result).toEqual({
      projectName: 'my-app',
      pm: 'pnpm',
      profile: 'vercel-supabase',
      install: true,
      git: true,
    });
  });

  it('引数で渡された projectName / pm / profile を初期値に使う', async () => {
    // text の initial は引数 projectName、select は inject 値が優先される
    prompts.inject(['cli-passed-name', 'npm', 'vps', false, false]);

    const result = await runPrompts({
      projectName: 'cli-passed-name',
      pm: 'npm',
      profile: 'vps',
    });

    expect(result.projectName).toBe('cli-passed-name');
    expect(result.pm).toBe('npm');
    expect(result.profile).toBe('vps');
    expect(result.install).toBe(false);
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

  it('PROFILES は 4 deploy profile', () => {
    expect(PROFILES).toEqual([
      'vercel-managed',
      'vercel-supabase',
      'vps',
      'air-gap',
    ]);
  });
});
