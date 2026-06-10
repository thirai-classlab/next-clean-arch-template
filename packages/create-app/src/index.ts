#!/usr/bin/env node
import { resolve } from 'node:path';
import { access } from 'node:fs/promises';
import { Command } from 'commander';
import { red } from 'kleur/colors';
import { cloneTemplate } from './clone.js';
import { runPrompts } from './prompt.js';
import type { PackageManager } from './prompt.js';
import { postClone } from './post-clone.js';
import {
  resolveConfig,
  resolveDeployProfile,
  resolveLoginStrategy,
} from './config-resolver.js';
import type { FlagArgs } from './config-resolver.js';
import { CreateAppError, ExitCode, classifyError } from './errors.js';

interface RawOptions {
  pm?: PackageManager;
  target?: 'vercel' | 'vps';
  backend?: 'next-only' | 'next-nest';
  db?: 'postgres' | 'mariadb';
  auth?: ('google' | 'email-pw')[];
  authDomain?: string;
  install: boolean;
  git: boolean;
  force: boolean;
  // Legacy --profile flag (mapped to target/backend/db)
  profile?: string;
}

async function dirExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Map legacy --profile value to FlagArgs fields.
 * New callers use --target / --backend / --db directly.
 */
function applyLegacyProfile(
  profile: string | undefined,
  flags: FlagArgs,
): FlagArgs {
  if (!profile) return flags;
  if (profile === 'vercel-supabase' || profile === 'vercel-managed' || profile === 'vercel') {
    return { ...flags, target: 'vercel' };
  }
  if (profile === 'vps') {
    return { ...flags, target: 'vps', backend: flags.backend ?? 'next-only', db: flags.db ?? 'postgres' };
  }
  // unknown profile — ignore, let prompts handle it
  return flags;
}

async function run(projectName: string | undefined, opts: RawOptions): Promise<void> {
  const isTTY = process.stdin.isTTY ?? false;

  const rawFlags: FlagArgs = applyLegacyProfile(opts.profile, {
    projectName,
    target: opts.target,
    backend: opts.backend,
    db: opts.db,
    auth: opts.auth,
    authDomain: opts.authDomain,
    pm: opts.pm,
    install: opts.install,
    git: opts.git,
  });

  // Non-TTY fast-fail: validate required flags before attempting prompts.
  if (!isTTY) {
    const validation = resolveConfig(rawFlags, false);
    if ('missing' in validation) {
      const flagList = validation.missing.join(', ');
      throw new CreateAppError(
        `Non-TTY mode requires explicit flags. Missing: ${flagList}\n` +
          `  name: positional argument (e.g. npx @takuma-hirai/create-app my-app)\n` +
          `  --target vps requires: --backend <next-only|next-nest> --db <postgres|mariadb>`,
        ExitCode.NETWORK, // exit 1
      );
    }
  }

  // Run interactive prompts (skips any field already set in rawFlags)
  const answers = await runPrompts(rawFlags);
  const targetDir = resolve(process.cwd(), answers.projectName);

  if ((await dirExists(targetDir)) && !opts.force) {
    throw new CreateAppError(
      `ディレクトリが既に存在します: ${answers.projectName} (--force で上書き)`,
      ExitCode.EXISTING_DIR,
    );
  }

  const deployProfile = resolveDeployProfile(answers.target, answers.backend, answers.db);
  const loginStrategy = resolveLoginStrategy(answers.auth);

  await cloneTemplate(targetDir);
  await postClone({
    targetDir,
    projectName: answers.projectName,
    pm: answers.pm,
    deployProfile,
    loginStrategy,
    authDomain: answers.authDomain,
    install: opts.install && answers.install,
    git: opts.git && answers.git,
  });

  console.log(`\n✓ ${answers.projectName} を作成しました`);
  console.log(`  cd ${answers.projectName} && ${answers.pm} dev`);
}

const program = new Command();
program
  .name('create-classlab-app')
  .description('ClassLab Next.js Clean Architecture template scaffolder')
  .version('0.1.1')
  .argument('[project-name]', 'Target directory name')
  .option('--pm <manager>', 'Package manager (pnpm/npm/yarn)')
  .option('--target <target>', 'Deploy target: vercel | vps')
  .option('--backend <backend>', 'Backend architecture: next-only | next-nest (VPS only)')
  .option('--db <db>', 'Database: postgres | mariadb (VPS only)')
  .option('--auth <providers...>', 'Auth providers: google, email-pw')
  .option('--auth-domain <domain>', 'Restrict to email domain (blank = no restriction)')
  .option('--profile <profile>', 'Legacy deploy profile (use --target instead)')
  .option('--no-install', 'Skip dependency install')
  .option('--no-git', 'Skip git init')
  .option('--force', 'Overwrite existing directory', false)
  .action(async (projectName: string | undefined, opts: RawOptions) => {
    try {
      await run(projectName, opts);
    } catch (err: unknown) {
      const appErr = classifyError(err);
      console.error(red(`Error: ${appErr.message}`));
      process.exit(appErr.exitCode);
    }
  });

program.parseAsync();
