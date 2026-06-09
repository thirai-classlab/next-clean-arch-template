import prompts from 'prompts';
import { CreateAppError, CANCEL_EXIT_CODE } from './errors.js';

/**
 * draft 10 Step 2.3: interactive prompt。
 * 引数省略 / 不足時に prompts で 5 質問。
 * test は prompts.inject() で network/TTY なしに検証する。
 */

export const PACKAGE_MANAGERS = ['pnpm', 'npm', 'yarn'] as const;
export const PROFILES = [
  'vercel-managed',
  'vercel-supabase',
  'vps',
  'air-gap',
] as const;

export type PackageManager = (typeof PACKAGE_MANAGERS)[number];
export type Profile = (typeof PROFILES)[number];

export interface CliArgs {
  projectName?: string;
  pm?: PackageManager;
  profile?: Profile;
}

export interface ScaffoldOptions {
  projectName: string;
  pm: PackageManager;
  profile: Profile;
  install: boolean;
  git: boolean;
}

export async function runPrompts(argv: CliArgs): Promise<ScaffoldOptions> {
  let cancelled = false;
  const responses = await prompts(
    [
      {
        type: 'text',
        name: 'projectName',
        message: 'Project name?',
        initial: argv.projectName ?? 'my-classlab-app',
      },
      {
        type: 'select',
        name: 'pm',
        message: 'Package manager?',
        choices: PACKAGE_MANAGERS.map((value) => ({ title: value, value })),
        initial: Math.max(
          0,
          PACKAGE_MANAGERS.indexOf(argv.pm ?? 'pnpm'),
        ),
      },
      {
        type: 'select',
        name: 'profile',
        message: 'Deploy profile?',
        choices: [
          { title: 'Vercel-managed (zero-ops)', value: 'vercel-managed' },
          { title: 'Vercel + Supabase (recommended)', value: 'vercel-supabase' },
          { title: 'VPS (Docker + Postgres)', value: 'vps' },
          { title: 'Air-gap (on-prem)', value: 'air-gap' },
        ],
        initial: Math.max(0, PROFILES.indexOf(argv.profile ?? 'vercel-supabase')),
      },
      {
        type: 'confirm',
        name: 'install',
        message: 'Install dependencies now?',
        initial: true,
      },
      {
        type: 'confirm',
        name: 'git',
        message: 'Initialize git repo?',
        initial: true,
      },
    ],
    {
      onCancel: () => {
        cancelled = true;
        return false;
      },
    },
  );

  if (cancelled || responses.projectName === undefined) {
    throw new CreateAppError('キャンセルされました', CANCEL_EXIT_CODE);
  }

  return {
    projectName: responses.projectName,
    pm: responses.pm,
    profile: responses.profile,
    install: responses.install,
    git: responses.git,
  };
}
