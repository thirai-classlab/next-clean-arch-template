import { downloadTemplate } from 'giget';
import { execa } from 'execa';
import { red, yellow } from 'kleur/colors';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { CreateAppError, ExitCode } from './errors.js';

/**
 * H-01 2 経路責務分離: 本 module は経路 B (template fetch) のみ実装。
 * 経路 A (CLI install = npm/npx 責務) はコード側で扱わない。
 *
 * giget 失敗時は git clone --depth=1 に fallback する 2 段構成。
 * giget の auth は process.env.GIGET_AUTH (PAT_B) のみ参照し、
 * npm registry auth (~/.npmrc _authToken = PAT_A) とは混同しない。
 *
 * v0.1.1+: template repo が monorepo 化されたため、template は repo root の
 * `template/` subfolder に存在する。
 * - giget: `github:thirai-classlab/next-clean-arch-template/template` 形式で
 *   subdir 指定をサポート (giget README §Examples 参照)。
 * - git clone fallback: `git clone` は subdir 指定不可のため、tmp dir に
 *   full clone → `template/` の中身を target dir に移し替えて完結する。
 */

/** giget が subdir を解釈するための default template source 文字列 */
export const TEMPLATE_SOURCE =
  'github:thirai-classlab/next-clean-arch-template/template';

/**
 * 実際に使用する template source を解決する。
 * `CREATE_APP_TEMPLATE_SOURCE` env で上書き可能 — fork / branch / E2E 検証で
 * `github:owner/repo/subdir#ref` 形式の任意 source を指定できる。
 * 未設定時は default の TEMPLATE_SOURCE を返す。
 */
export function resolveTemplateSource(): string {
  const override = process.env.CREATE_APP_TEMPLATE_SOURCE;
  return override !== undefined && override !== '' ? override : TEMPLATE_SOURCE;
}

/** git clone fallback で使う完全な repo URL (subdir 指定なし) */
const TEMPLATE_GIT_URL =
  'https://github.com/thirai-classlab/next-clean-arch-template.git';

/** monorepo 内で template 本体が置かれている subdir 名 */
const TEMPLATE_SUBDIR = 'template';

/** test から network 依存を切り離すための injectable deps。 */
export interface CloneDeps {
  downloadTemplate: typeof downloadTemplate;
  execa: typeof execa;
  log: (msg: string) => void;
  errorLog: (msg: string) => void;
}

const defaultDeps: CloneDeps = {
  downloadTemplate,
  execa,
  log: (msg) => console.log(msg),
  errorLog: (msg) => console.error(msg),
};

export async function cloneTemplate(
  targetDir: string,
  deps: CloneDeps = defaultDeps,
): Promise<void> {
  const source = resolveTemplateSource();
  const isOverridden = source !== TEMPLATE_SOURCE;

  try {
    await deps.downloadTemplate(source, {
      dir: targetDir,
      force: false,
      // PAT_B (giget 専用)。npm registry auth PAT_A とは別 token。
      auth: process.env.GIGET_AUTH,
    });
    return;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);

    // CREATE_APP_TEMPLATE_SOURCE 上書き時は default repo への git clone fallback を
    // しない (上書き元と異なる source から黙って取得すると検証が無意味になる)。
    if (isOverridden) {
      throw new CreateAppError(
        `CREATE_APP_TEMPLATE_SOURCE (${source}) からの template 取得に失敗しました: ${msg}`,
        ExitCode.MISSING_TEMPLATE,
      );
    }

    // 404 + GIGET_AUTH 未設定 = private repo 認証漏れの可能性を案内
    if (/Not Found|404/.test(msg) && !process.env.GIGET_AUTH) {
      deps.errorLog(
        red('giget: 404 Not Found — GIGET_AUTH env が未設定の可能性'),
      );
      deps.errorLog(
        yellow(
          'private repo の場合、docs/onboarding/classlab-npm-auth.md §6 を参照',
        ),
      );
    }

    // fallback: git clone --depth=1
    // (public repo なら auth 不要、private なら gh CLI 経由 auth が効く)
    await fallbackGitClone(targetDir, deps);
  }
}

async function fallbackGitClone(
  targetDir: string,
  deps: CloneDeps,
): Promise<void> {
  // git clone は subdir 指定不可のため、tmp dir に full clone してから
  // monorepo 内の `template/` の中身を targetDir に移し替える。
  // tmp dir は os.tmpdir() 配下に一意 prefix で作成し、最後に必ず cleanup。
  const tmpRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'create-classlab-app-'),
  );
  try {
    await deps.execa('git', [
      'clone',
      '--depth=1',
      TEMPLATE_GIT_URL,
      tmpRoot,
    ]);

    const templateRoot = path.join(tmpRoot, TEMPLATE_SUBDIR);
    if (!fs.existsSync(templateRoot)) {
      throw new CreateAppError(
        `template subdir '${TEMPLATE_SUBDIR}/' が repo に存在しません ` +
          `(${TEMPLATE_GIT_URL})。template repo の構造が期待と異なる可能性があります。`,
        ExitCode.MISSING_TEMPLATE,
      );
    }

    fs.mkdirSync(targetDir, { recursive: true });
    // template/ の中身 (= dotfile 含む全 entry) を targetDir に移動。
    // template/ 自体は移動せず中身だけ展開し、`.git/` (template repo 自体の
    // clone history) は持ち込まない。
    for (const entry of fs.readdirSync(templateRoot)) {
      const src = path.join(templateRoot, entry);
      const dst = path.join(targetDir, entry);
      fs.renameSync(src, dst);
    }
  } catch (gitErr: unknown) {
    if (gitErr instanceof CreateAppError) throw gitErr;
    const msg = gitErr instanceof Error ? gitErr.message : String(gitErr);
    throw new CreateAppError(
      `template clone に失敗しました (giget + git clone 両方失敗): ${msg}`,
      ExitCode.MISSING_TEMPLATE,
    );
  } finally {
    // 成功 / 失敗いずれでも tmp dir を片付ける (template/ の中身は移動済なので
    // tmpRoot 配下には .git/ と空 template/ が残る程度)。
    try {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    } catch {
      /* cleanup 失敗は無視 (next-tick の OS GC に任せる) */
    }
  }
}
