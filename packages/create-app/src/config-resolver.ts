/**
 * Pure resolver: maps raw CLI flags + TTY state → ResolvedConfig.
 * No I/O — fully unit-testable.
 */

export type DeployProfile =
  | 'pro'
  | 'vps-next-postgres'
  | 'vps-next-mariadb'
  | 'vps-nest-postgres'
  | 'vps-nest-mariadb';

export type LoginStrategy = 'sso' | 'email-pass' | 'both';

export interface ResolvedConfig {
  projectName: string;
  target: 'vercel' | 'vps';
  backend: 'next-only' | 'next-nest'; // meaningful only when target=vps
  db: 'postgres' | 'mariadb';         // meaningful only when target=vps
  auth: ('google' | 'email-pw')[];
  authDomain: string;                  // '' means no restriction
  pm: 'pnpm' | 'npm' | 'yarn';
  install: boolean;
  git: boolean;
}

export interface FlagArgs {
  projectName?: string;
  target?: 'vercel' | 'vps';
  backend?: 'next-only' | 'next-nest';
  db?: 'postgres' | 'mariadb';
  auth?: ('google' | 'email-pw')[];
  authDomain?: string;   // undefined = not provided (prompt); '' = --no-auth-domain
  pm?: 'pnpm' | 'npm' | 'yarn';
  install?: boolean;     // undefined = not provided (prompt)
  git?: boolean;         // undefined = not provided (prompt)
}

const DEFAULTS = {
  projectName: 'my-app',
  target: 'vercel' as const,
  backend: 'next-only' as const,
  db: 'postgres' as const,
  auth: ['google', 'email-pw'] as ('google' | 'email-pw')[],
  authDomain: '',
  pm: 'pnpm' as const,
  install: true,
  git: true,
};

/**
 * Derive DEPLOY_PROFILE from (target, backend, db).
 */
export function resolveDeployProfile(
  target: 'vercel' | 'vps',
  backend: 'next-only' | 'next-nest',
  db: 'postgres' | 'mariadb',
): DeployProfile {
  if (target === 'vercel') return 'pro';
  if (backend === 'next-only' && db === 'postgres') return 'vps-next-postgres';
  if (backend === 'next-only' && db === 'mariadb') return 'vps-next-mariadb';
  if (backend === 'next-nest' && db === 'postgres') return 'vps-nest-postgres';
  return 'vps-nest-mariadb';
}

/**
 * Derive LOGIN_STRATEGY from auth multiselect answer.
 */
export function resolveLoginStrategy(
  auth: ('google' | 'email-pw')[],
): LoginStrategy {
  const hasGoogle = auth.includes('google');
  const hasEmail = auth.includes('email-pw');
  if (hasGoogle && hasEmail) return 'both';
  if (hasGoogle) return 'sso';
  return 'email-pass';
}

/**
 * Pure function — no I/O, fully unit-testable.
 *
 * Returns { config } when all values are resolvable,
 * or { missing } with a list of flag names that are required in non-TTY mode
 * but were not provided:
 *   - `name`    — project name is always required (no sensible default for the
 *                 output directory name in a headless / CI invocation)
 *   - `backend` — required when --target vps (architecture choice is explicit;
 *                 defaulting silently would scaffold the wrong layout)
 *   - `db`      — required when --target vps (same reasoning as --backend)
 *
 * TTY callers receive { config } unconditionally — the interactive prompts
 * fill in anything that was not provided via flags.
 */
export function resolveConfig(
  flags: FlagArgs,
  isTTY: boolean,
): { config: ResolvedConfig } | { missing: string[] } {
  if (!isTTY) {
    const missing: string[] = [];

    // Project name has no sensible default in headless mode: the scaffolded
    // directory name must be chosen explicitly by the caller.
    if (flags.projectName === undefined) {
      missing.push('name');
    }

    // For VPS targets, backend architecture and DB engine must be explicit.
    // Silently defaulting to next-only/postgres would scaffold the wrong
    // layout without any feedback to the caller.
    const effectiveTarget = flags.target ?? DEFAULTS.target;
    if (effectiveTarget === 'vps') {
      if (flags.backend === undefined) {
        missing.push('backend');
      }
      if (flags.db === undefined) {
        missing.push('db');
      }
    }

    if (missing.length > 0) {
      return { missing };
    }
  }

  const config: ResolvedConfig = {
    projectName: flags.projectName ?? DEFAULTS.projectName,
    target: flags.target ?? DEFAULTS.target,
    backend: flags.backend ?? DEFAULTS.backend,
    db: flags.db ?? DEFAULTS.db,
    auth: flags.auth ?? DEFAULTS.auth,
    authDomain: flags.authDomain ?? DEFAULTS.authDomain,
    pm: flags.pm ?? DEFAULTS.pm,
    install: flags.install ?? DEFAULTS.install,
    git: flags.git ?? DEFAULTS.git,
  };
  return { config };
}
