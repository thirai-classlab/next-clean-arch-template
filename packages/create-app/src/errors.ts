/**
 * 5 error path の exit code 定義 + 分類 logic。
 * draft 10 Step 2.5: network/disk/permission/existing-dir/missing-template の 5 path。
 */

export const ExitCode = {
  NETWORK: 1,
  DISK: 2,
  PERMISSION: 3,
  EXISTING_DIR: 4,
  MISSING_TEMPLATE: 5,
} as const;

export type ExitCodeValue = (typeof ExitCode)[keyof typeof ExitCode];

/** Ctrl-C (SIGINT) graceful exit。慣習の 128 + SIGINT(2) = 130。 */
export const CANCEL_EXIT_CODE = 130;

/**
 * CLI が user に返す既知 error。exitCode を保持し、index.ts の top-level
 * catch がそのまま process.exit に流す。exitCode は 5 path (1-5) または
 * cancel (130) を取りうるため number で受ける。
 */
export class CreateAppError extends Error {
  readonly exitCode: number;

  constructor(message: string, exitCode: number) {
    super(message);
    this.name = 'CreateAppError';
    this.exitCode = exitCode;
  }
}

interface RawErrorLike {
  code?: string;
  message?: string;
}

/**
 * 任意の raw error を 5 path のいずれかに分類する。
 * すでに CreateAppError ならそのまま返す (再分類しない)。
 */
export function classifyError(err: unknown): CreateAppError {
  if (err instanceof CreateAppError) {
    return err;
  }

  const raw = (err ?? {}) as RawErrorLike;
  const code = raw.code ?? '';
  const message = raw.message ?? (typeof err === 'string' ? err : '');
  const haystack = `${code} ${message}`;

  if (/ENOSPC/i.test(haystack)) {
    return new CreateAppError(
      message || 'ディスク容量が不足しています',
      ExitCode.DISK,
    );
  }
  if (/EACCES|EPERM/i.test(haystack)) {
    return new CreateAppError(
      message || '権限が不足しています',
      ExitCode.PERMISSION,
    );
  }
  if (/EEXIST|already exists|既に存在/i.test(haystack)) {
    return new CreateAppError(
      message || '対象ディレクトリが既に存在します (--force で上書き)',
      ExitCode.EXISTING_DIR,
    );
  }
  if (/404|Not Found/i.test(haystack)) {
    return new CreateAppError(
      message || 'template repo が見つかりません',
      ExitCode.MISSING_TEMPLATE,
    );
  }
  if (/ENOTFOUND|ECONNREFUSED|ETIMEDOUT|network/i.test(haystack)) {
    return new CreateAppError(
      message || 'ネットワークに接続できません',
      ExitCode.NETWORK,
    );
  }

  // unknown は NETWORK (exit 1) を safe generic とする
  return new CreateAppError(message || String(err), ExitCode.NETWORK);
}
