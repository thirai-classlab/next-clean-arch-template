import { describe, it, expect } from 'vitest';
import {
  resolveConfig,
  resolveDeployProfile,
  resolveLoginStrategy,
} from '../src/config-resolver.js';

// ---------------------------------------------------------------------------
// resolveDeployProfile — 5 matrix cells
// ---------------------------------------------------------------------------

describe('resolveDeployProfile: all 5 pattern cells', () => {
  it('vercel → pro', () => {
    expect(resolveDeployProfile('vercel', 'next-only', 'postgres')).toBe('pro');
    expect(resolveDeployProfile('vercel', 'next-nest', 'mariadb')).toBe('pro');
  });

  it('vps + next-only + postgres → vps-next-postgres', () => {
    expect(resolveDeployProfile('vps', 'next-only', 'postgres')).toBe('vps-next-postgres');
  });

  it('vps + next-only + mariadb → vps-next-mariadb', () => {
    expect(resolveDeployProfile('vps', 'next-only', 'mariadb')).toBe('vps-next-mariadb');
  });

  it('vps + next-nest + postgres → vps-nest-postgres', () => {
    expect(resolveDeployProfile('vps', 'next-nest', 'postgres')).toBe('vps-nest-postgres');
  });

  it('vps + next-nest + mariadb → vps-nest-mariadb', () => {
    expect(resolveDeployProfile('vps', 'next-nest', 'mariadb')).toBe('vps-nest-mariadb');
  });
});

// ---------------------------------------------------------------------------
// resolveLoginStrategy — auth multiselect → LOGIN_STRATEGY
// ---------------------------------------------------------------------------

describe('resolveLoginStrategy: auth array → login strategy', () => {
  it('google only → sso', () => {
    expect(resolveLoginStrategy(['google'])).toBe('sso');
  });

  it('email-pw only → email-pass', () => {
    expect(resolveLoginStrategy(['email-pw'])).toBe('email-pass');
  });

  it('both google + email-pw → both', () => {
    expect(resolveLoginStrategy(['google', 'email-pw'])).toBe('both');
    expect(resolveLoginStrategy(['email-pw', 'google'])).toBe('both');
  });
});

// ---------------------------------------------------------------------------
// resolveConfig — non-TTY path
// ---------------------------------------------------------------------------

describe('resolveConfig: non-TTY with no flags', () => {
  it('returns missing=[name] when projectName is not provided', () => {
    // Root 4 fix: non-TTY requires explicit project name — no sensible default
    // for the output directory name in a headless / CI invocation.
    const result = resolveConfig({}, false);
    expect('missing' in result).toBe(true);
    if (!('missing' in result)) return;
    expect(result.missing).toContain('name');
  });

  it('returns config with all defaults when projectName is provided', () => {
    const result = resolveConfig({ projectName: 'my-app' }, false);
    expect('config' in result).toBe(true);
    if (!('config' in result)) return;
    const { config } = result;
    expect(config.target).toBe('vercel');
    expect(config.backend).toBe('next-only');
    expect(config.db).toBe('postgres');
    expect(config.auth).toEqual(['google', 'email-pw']);
    expect(config.authDomain).toBe('');
    expect(config.pm).toBe('pnpm');
    expect(config.install).toBe(true);
    expect(config.git).toBe(true);
    expect(config.projectName).toBe('my-app');
  });
});

describe('resolveConfig: non-TTY missing flag validation', () => {
  it('returns missing=[name] when projectName is omitted', () => {
    const result = resolveConfig({}, false);
    expect('missing' in result).toBe(true);
    if (!('missing' in result)) return;
    expect(result.missing).toContain('name');
    expect(result.missing).not.toContain('backend');
    expect(result.missing).not.toContain('db');
  });

  it('returns missing=[backend, db] when target=vps but backend/db omitted', () => {
    const result = resolveConfig({ projectName: 'my-app', target: 'vps' }, false);
    expect('missing' in result).toBe(true);
    if (!('missing' in result)) return;
    expect(result.missing).toContain('backend');
    expect(result.missing).toContain('db');
    expect(result.missing).not.toContain('name');
  });

  it('returns missing=[name, backend, db] when target=vps and all three omitted', () => {
    const result = resolveConfig({ target: 'vps' }, false);
    expect('missing' in result).toBe(true);
    if (!('missing' in result)) return;
    expect(result.missing).toContain('name');
    expect(result.missing).toContain('backend');
    expect(result.missing).toContain('db');
  });

  it('returns config when target=vps and name+backend+db all provided', () => {
    const result = resolveConfig(
      { projectName: 'my-app', target: 'vps', backend: 'next-only', db: 'postgres' },
      false,
    );
    expect('config' in result).toBe(true);
    if (!('config' in result)) return;
    expect(result.config.target).toBe('vps');
    expect(result.config.backend).toBe('next-only');
    expect(result.config.db).toBe('postgres');
  });

  it('does not require backend/db when target=vercel', () => {
    const result = resolveConfig({ projectName: 'my-app', target: 'vercel' }, false);
    expect('config' in result).toBe(true);
  });
});

describe('resolveConfig: non-TTY with explicit flags', () => {
  it('--target vps --backend next-nest --db mariadb resolves to vps-nest-mariadb', () => {
    const result = resolveConfig(
      { projectName: 'my-app', target: 'vps', backend: 'next-nest', db: 'mariadb' },
      false,
    );
    expect('config' in result).toBe(true);
    if (!('config' in result)) return;
    const { config } = result;
    expect(config.target).toBe('vps');
    expect(config.backend).toBe('next-nest');
    expect(config.db).toBe('mariadb');
  });

  it('--auth google resolves to sso via resolveLoginStrategy', () => {
    const result = resolveConfig({ projectName: 'my-app', auth: ['google'] }, false);
    expect('config' in result).toBe(true);
    if (!('config' in result)) return;
    expect(result.config.auth).toEqual(['google']);
    expect(resolveLoginStrategy(result.config.auth)).toBe('sso');
  });

  it('--auth email-pw resolves to email-pass', () => {
    const result = resolveConfig({ projectName: 'my-app', auth: ['email-pw'] }, false);
    expect('config' in result).toBe(true);
    if (!('config' in result)) return;
    expect(result.config.auth).toEqual(['email-pw']);
    expect(resolveLoginStrategy(result.config.auth)).toBe('email-pass');
  });

  it('--auth google,email-pw resolves to both', () => {
    const result = resolveConfig({ projectName: 'my-app', auth: ['google', 'email-pw'] }, false);
    expect('config' in result).toBe(true);
    if (!('config' in result)) return;
    expect(resolveLoginStrategy(result.config.auth)).toBe('both');
  });

  it('--auth-domain example.com sets authDomain', () => {
    const result = resolveConfig({ projectName: 'my-app', authDomain: 'example.com' }, false);
    expect('config' in result).toBe(true);
    if (!('config' in result)) return;
    expect(result.config.authDomain).toBe('example.com');
  });

  it('--no-auth-domain (authDomain="") keeps authDomain empty', () => {
    const result = resolveConfig({ projectName: 'my-app', authDomain: '' }, false);
    expect('config' in result).toBe(true);
    if (!('config' in result)) return;
    expect(result.config.authDomain).toBe('');
  });

  it('isTTY=false + all flags provided → config returned', () => {
    const result = resolveConfig(
      {
        projectName: 'test-app',
        target: 'vercel',
        backend: 'next-only',
        db: 'postgres',
        auth: ['google'],
        authDomain: '',
        pm: 'npm',
        install: false,
        git: false,
      },
      false,
    );
    expect('config' in result).toBe(true);
    if (!('config' in result)) return;
    expect(result.config.projectName).toBe('test-app');
    expect(result.config.pm).toBe('npm');
    expect(result.config.install).toBe(false);
    expect(result.config.git).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// resolveConfig — TTY path
// ---------------------------------------------------------------------------

describe('resolveConfig: TTY path', () => {
  it('with no flags, returns config with all defaults applied', () => {
    const result = resolveConfig({}, true);
    expect('config' in result).toBe(true);
    if (!('config' in result)) return;
    expect(result.config.target).toBe('vercel');
    expect(result.config.pm).toBe('pnpm');
  });

  it('partial flags are applied, rest use defaults', () => {
    const result = resolveConfig({ target: 'vps', pm: 'yarn' }, true);
    expect('config' in result).toBe(true);
    if (!('config' in result)) return;
    expect(result.config.target).toBe('vps');
    expect(result.config.pm).toBe('yarn');
    expect(result.config.backend).toBe('next-only'); // default
    expect(result.config.db).toBe('postgres');       // default
  });
});

// ---------------------------------------------------------------------------
// Legacy --profile back-compat (mapping applied in index.ts, tested here via
// the resolved FlagArgs that would be passed to resolveConfig)
// ---------------------------------------------------------------------------

describe('legacy --profile mappings (FlagArgs equivalents)', () => {
  it('vercel-supabase → target=vercel → pro profile', () => {
    // After applyLegacyProfile, flagArgs.target = 'vercel'
    // projectName required in non-TTY; index.ts always provides the positional arg.
    const result = resolveConfig({ projectName: 'my-app', target: 'vercel' }, false);
    expect('config' in result).toBe(true);
    if (!('config' in result)) return;
    expect(result.config.target).toBe('vercel');
    expect(resolveDeployProfile(result.config.target, result.config.backend, result.config.db)).toBe('pro');
  });

  it('vps (legacy) → target=vps, backend=next-only, db=postgres → vps-next-postgres', () => {
    const result = resolveConfig(
      { projectName: 'my-app', target: 'vps', backend: 'next-only', db: 'postgres' },
      false,
    );
    expect('config' in result).toBe(true);
    if (!('config' in result)) return;
    expect(
      resolveDeployProfile(result.config.target, result.config.backend, result.config.db),
    ).toBe('vps-next-postgres');
  });
});
