import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { cloneTemplate, TEMPLATE_SOURCE } from '../src/clone.js';

/**
 * H-01 2 経路責務分離: clone.ts は経路 B (template fetch) のみ実装。
 * giget + git clone fallback の 2 段を、deps injection で network なしに検証する。
 *
 * v0.1.1+: template repo monorepo 化に伴い:
 *   - TEMPLATE_SOURCE は `.../next-clean-arch-template/template` (subdir 付き、giget 解釈)
 *   - git clone fallback は tmp dir に full clone → template/ の中身を target に移動
 *
 * fallback の filesystem 副作用は、tmp dir に擬似的な `template/` を作って
 * 中身が target dir に移ったことで検証する。
 */

function makeDeps() {
  return {
    downloadTemplate: vi.fn(),
    execa: vi.fn().mockResolvedValue({ exitCode: 0 }),
    log: vi.fn(),
    errorLog: vi.fn(),
  };
}

/** execa('git', ['clone', '--depth=1', URL, tmpRoot]) を擬似実行する。
 * fallback 実装は tmpRoot 配下の `template/` を期待するため、ここで作る。 */
function makeExecaGitCloneStub(opts?: { withTemplateDir?: boolean }) {
  const withTemplateDir = opts?.withTemplateDir ?? true;
  return vi.fn(async (_cmd: string, args: readonly string[]) => {
    const tmpRoot = args[args.length - 1];
    if (withTemplateDir) {
      const templateDir = path.join(tmpRoot, 'template');
      fs.mkdirSync(templateDir, { recursive: true });
      fs.writeFileSync(
        path.join(templateDir, 'package.json'),
        '{"name":"sample-template"}',
      );
    } else {
      // clone 自体は成功するが template/ subdir が無い (repo 構造の壊れ)
      fs.mkdirSync(tmpRoot, { recursive: true });
    }
    return { exitCode: 0 } as { exitCode: number };
  });
}

function makeTempTargetDir(): string {
  return path.join(
    os.tmpdir(),
    `create-app-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  );
}

describe('cloneTemplate: giget 成功', () => {
  beforeEach(() => {
    delete process.env.GIGET_AUTH;
  });

  it('giget 成功時は git clone fallback を呼ばず target dir を返す', async () => {
    const deps = makeDeps();
    deps.downloadTemplate.mockResolvedValue({ dir: '/tmp/my-app' });

    await cloneTemplate('/tmp/my-app', deps);

    expect(deps.downloadTemplate).toHaveBeenCalledOnce();
    // v0.1.1+: source は github:thirai-classlab/next-clean-arch-template/template
    // (giget の subdir 指定で monorepo 内の template/ を指す)
    expect(TEMPLATE_SOURCE).toBe(
      'github:thirai-classlab/next-clean-arch-template/template',
    );
    expect(deps.downloadTemplate).toHaveBeenCalledWith(
      TEMPLATE_SOURCE,
      expect.objectContaining({ dir: '/tmp/my-app' }),
    );
    expect(deps.execa).not.toHaveBeenCalled();
  });

  it('giget の auth は process.env.GIGET_AUTH のみを参照する (npmrc _authToken は使わない)', async () => {
    const deps = makeDeps();
    process.env.GIGET_AUTH = 'pat_b_token';
    deps.downloadTemplate.mockResolvedValue({ dir: '/tmp/my-app' });

    await cloneTemplate('/tmp/my-app', deps);

    expect(deps.downloadTemplate).toHaveBeenCalledWith(
      TEMPLATE_SOURCE,
      expect.objectContaining({ auth: 'pat_b_token' }),
    );
  });
});

describe('cloneTemplate: 404 fallback', () => {
  beforeEach(() => {
    delete process.env.GIGET_AUTH;
  });
  afterEach(() => {
    delete process.env.GIGET_AUTH;
  });

  it('404 + GIGET_AUTH 未設定 -> Phase 0 §6 案内 + git clone fallback 実行', async () => {
    const deps = makeDeps();
    deps.execa = makeExecaGitCloneStub();
    deps.downloadTemplate.mockRejectedValue(new Error('404 Not Found'));
    const targetDir = makeTempTargetDir();

    try {
      await cloneTemplate(targetDir, deps);

      // 案内メッセージ (Phase 0 §6 / GIGET_AUTH 言及)
      const allLogs = [
        ...deps.errorLog.mock.calls.flat(),
        ...deps.log.mock.calls.flat(),
      ].join('\n');
      expect(allLogs).toMatch(/GIGET_AUTH/);
      expect(allLogs).toMatch(/§6|classlab-npm-auth/);

      // git clone fallback
      expect(deps.execa).toHaveBeenCalledOnce();
      const [cmd, args] = deps.execa.mock.calls[0];
      expect(cmd).toBe('git');
      expect(args).toContain('clone');
      expect(args).toContain('--depth=1');
      // v0.1.1+: 最後の引数は tmp dir (full clone 先)、targetDir 直指定ではない
      const lastArg = args[args.length - 1];
      expect(lastArg).not.toBe(targetDir);
      expect(typeof lastArg).toBe('string');
      expect((lastArg as string).startsWith(os.tmpdir())).toBe(true);
      // template/ の中身が targetDir に移動済 (package.json が存在)
      expect(fs.existsSync(path.join(targetDir, 'package.json'))).toBe(true);
    } finally {
      fs.rmSync(targetDir, { recursive: true, force: true });
    }
  });

  it('404 + GIGET_AUTH 設定済 -> 案内なしで git clone fallback 実行', async () => {
    const deps = makeDeps();
    deps.execa = makeExecaGitCloneStub();
    process.env.GIGET_AUTH = 'pat_b_token';
    deps.downloadTemplate.mockRejectedValue(new Error('404 Not Found'));
    const targetDir = makeTempTargetDir();

    try {
      await cloneTemplate(targetDir, deps);

      const errLogs = deps.errorLog.mock.calls.flat().join('\n');
      // GIGET_AUTH 設定済なので「未設定」案内は出さない
      expect(errLogs).not.toMatch(/未設定/);
      expect(deps.execa).toHaveBeenCalledOnce();
      expect(deps.execa.mock.calls[0][0]).toBe('git');
      // template/ の中身が targetDir に移動済
      expect(fs.existsSync(path.join(targetDir, 'package.json'))).toBe(true);
    } finally {
      fs.rmSync(targetDir, { recursive: true, force: true });
    }
  });
});

describe('cloneTemplate: ENOTFOUND fallback', () => {
  beforeEach(() => {
    delete process.env.GIGET_AUTH;
  });

  it('ENOTFOUND -> git clone fallback 実行', async () => {
    const deps = makeDeps();
    deps.execa = makeExecaGitCloneStub();
    const err = Object.assign(new Error('getaddrinfo ENOTFOUND codeload.github.com'), {
      code: 'ENOTFOUND',
    });
    deps.downloadTemplate.mockRejectedValue(err);
    const targetDir = makeTempTargetDir();

    try {
      await cloneTemplate(targetDir, deps);

      expect(deps.execa).toHaveBeenCalledOnce();
      expect(deps.execa.mock.calls[0][0]).toBe('git');
      expect(fs.existsSync(path.join(targetDir, 'package.json'))).toBe(true);
    } finally {
      fs.rmSync(targetDir, { recursive: true, force: true });
    }
  });

  it('giget + git clone fallback 両方失敗時は CreateAppError を throw する', async () => {
    const deps = makeDeps();
    deps.downloadTemplate.mockRejectedValue(new Error('404 Not Found'));
    deps.execa.mockRejectedValue(
      Object.assign(new Error('git: command not found'), { code: 'ENOENT' }),
    );

    await expect(cloneTemplate('/tmp/my-app', deps)).rejects.toThrow();
  });

  it('git clone は成功するが template/ subdir が無い場合 CreateAppError を throw する', async () => {
    const deps = makeDeps();
    // template/ を作らない stub (= monorepo 構造が壊れているケース)
    deps.execa = makeExecaGitCloneStub({ withTemplateDir: false });
    deps.downloadTemplate.mockRejectedValue(new Error('404 Not Found'));
    const targetDir = makeTempTargetDir();

    try {
      await expect(cloneTemplate(targetDir, deps)).rejects.toThrow(
        /template subdir/,
      );
    } finally {
      fs.rmSync(targetDir, { recursive: true, force: true });
    }
  });
});
