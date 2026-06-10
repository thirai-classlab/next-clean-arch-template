import prompts from 'prompts';
import { CreateAppError, CANCEL_EXIT_CODE } from './errors.js';
import type { FlagArgs } from './config-resolver.js';

/**
 * Interactive prompt layer.
 * Accepts pre-resolved FlagArgs; any field that is undefined triggers a prompt.
 * When all fields are provided, the questions array is empty and prompts()
 * returns immediately without reading from TTY — safe in non-TTY / CI contexts.
 */

export const PACKAGE_MANAGERS = ['pnpm', 'npm', 'yarn'] as const;

// Legacy profile list kept for backward-compat with prompt.test.ts.
// New code uses target/backend/db/auth flags via FlagArgs.
export const PROFILES = [
  'vercel-managed',
  'vercel-supabase',
  'vps',
  'air-gap',
] as const;

export type PackageManager = (typeof PACKAGE_MANAGERS)[number];
export type Profile = (typeof PROFILES)[number];

/**
 * CliArgs for backward-compat with old index.ts callers.
 * New callers pass FlagArgs directly to runPrompts.
 */
export interface CliArgs {
  projectName?: string;
  pm?: PackageManager;
  profile?: Profile;
}

export interface ScaffoldOptions {
  projectName: string;
  target: 'vercel' | 'vps';
  backend: 'next-only' | 'next-nest';
  db: 'postgres' | 'mariadb';
  auth: ('google' | 'email-pw')[];
  authDomain: string;
  pm: PackageManager;
  install: boolean;
  git: boolean;
}

/**
 * Run interactive prompts for any field not already provided in argv.
 * When all fields are set in argv, the questions array is empty and the
 * function returns synchronously (no TTY needed).
 *
 * @param argv - FlagArgs from CLI flags (or a legacy CliArgs for tests)
 */
export async function runPrompts(argv: FlagArgs): Promise<ScaffoldOptions> {
  let cancelled = false;

  const questions: prompts.PromptObject[] = [];

  if (argv.projectName === undefined) {
    questions.push({
      type: 'text',
      name: 'projectName',
      message: 'Project name?',
      initial: 'my-classlab-app',
    });
  }

  if (argv.target === undefined) {
    questions.push({
      type: 'select',
      name: 'target',
      message: 'Deploy target?',
      choices: [
        { title: 'Vercel (recommended)', value: 'vercel' },
        { title: 'VPS (self-hosted)', value: 'vps' },
      ],
      initial: 0,
    });
  }

  if (argv.backend === undefined) {
    questions.push({
      type: 'select',
      name: 'backend',
      message: 'Backend architecture?',
      choices: [
        { title: 'Next.js only (App Router + Server Actions)', value: 'next-only' },
        { title: 'Next.js + NestJS API', value: 'next-nest' },
      ],
      initial: 0,
    });
  }

  if (argv.db === undefined) {
    questions.push({
      type: 'select',
      name: 'db',
      message: 'Database?',
      choices: [
        { title: 'PostgreSQL', value: 'postgres' },
        { title: 'MariaDB / MySQL', value: 'mariadb' },
      ],
      initial: 0,
    });
  }

  if (argv.auth === undefined) {
    questions.push({
      type: 'multiselect',
      name: 'auth',
      message: 'Auth providers?',
      choices: [
        { title: 'Google SSO', value: 'google', selected: true },
        { title: 'Email + Password', value: 'email-pw', selected: true },
      ],
      min: 1,
    });
  }

  if (argv.authDomain === undefined) {
    questions.push({
      type: 'text',
      name: 'authDomain',
      message: 'Restrict to email domain? (leave blank for no restriction)',
      initial: '',
    });
  }

  if (argv.pm === undefined) {
    questions.push({
      type: 'select',
      name: 'pm',
      message: 'Package manager?',
      choices: PACKAGE_MANAGERS.map((value) => ({ title: value, value })),
      initial: 0,
    });
  }

  if (argv.install === undefined) {
    questions.push({
      type: 'confirm',
      name: 'install',
      message: 'Install dependencies now?',
      initial: true,
    });
  }

  if (argv.git === undefined) {
    questions.push({
      type: 'confirm',
      name: 'git',
      message: 'Initialize git repo?',
      initial: true,
    });
  }

  const responses = await prompts(questions, {
    onCancel: () => {
      cancelled = true;
      return false;
    },
  });

  if (cancelled) {
    throw new CreateAppError('キャンセルされました', CANCEL_EXIT_CODE);
  }

  // Merge argv defaults with prompt responses
  const projectName = argv.projectName ?? (responses.projectName as string | undefined);
  if (projectName === undefined) {
    throw new CreateAppError('キャンセルされました', CANCEL_EXIT_CODE);
  }

  return {
    projectName,
    target: argv.target ?? (responses.target as 'vercel' | 'vps' | undefined) ?? 'vercel',
    backend: argv.backend ?? (responses.backend as 'next-only' | 'next-nest' | undefined) ?? 'next-only',
    db: argv.db ?? (responses.db as 'postgres' | 'mariadb' | undefined) ?? 'postgres',
    auth: argv.auth ?? (responses.auth as ('google' | 'email-pw')[] | undefined) ?? ['google', 'email-pw'],
    authDomain: argv.authDomain ?? (responses.authDomain as string | undefined) ?? '',
    pm: argv.pm ?? (responses.pm as PackageManager | undefined) ?? 'pnpm',
    install: argv.install ?? (responses.install as boolean | undefined) ?? true,
    git: argv.git ?? (responses.git as boolean | undefined) ?? true,
  };
}
