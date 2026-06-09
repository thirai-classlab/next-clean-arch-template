#!/usr/bin/env node
import { resolve } from 'node:path';
import { access } from 'node:fs/promises';
import { Command } from 'commander';
import { red } from 'kleur/colors';
import { cloneTemplate } from './clone.js';
import { runPrompts } from './prompt.js';
import type { CliArgs, PackageManager, Profile } from './prompt.js';
import { postClone } from './post-clone.js';
import { CreateAppError, ExitCode, classifyError } from './errors.js';

interface RawOptions {
  pm: PackageManager;
  profile: Profile;
  install: boolean;
  git: boolean;
  force: boolean;
}

async function dirExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function run(projectName: string | undefined, opts: RawOptions): Promise<void> {
  const argv: CliArgs = {
    projectName,
    pm: opts.pm,
    profile: opts.profile,
  };

  const answers = await runPrompts(argv);
  const targetDir = resolve(process.cwd(), answers.projectName);

  if ((await dirExists(targetDir)) && !opts.force) {
    throw new CreateAppError(
      `ディレクトリが既に存在します: ${answers.projectName} (--force で上書き)`,
      ExitCode.EXISTING_DIR,
    );
  }

  await cloneTemplate(targetDir);
  await postClone({
    targetDir,
    projectName: answers.projectName,
    pm: answers.pm,
    profile: answers.profile,
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
  .version('0.1.0')
  .argument('[project-name]', 'Target directory name')
  .option('--pm <manager>', 'Package manager (pnpm/npm/yarn)', 'pnpm')
  .option('--profile <profile>', 'Deploy profile', 'vercel-supabase')
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
