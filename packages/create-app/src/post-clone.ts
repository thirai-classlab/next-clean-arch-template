import { readFile, writeFile, copyFile, rm, access } from 'node:fs/promises';
import { join } from 'node:path';
import { execa as defaultExeca } from 'execa';
import type { PackageManager, Profile } from './prompt.js';
import { classifyError } from './errors.js';

/**
 * draft 10 Step 2.4: clone 完了後の後処理。
 * (a) package.json name 置換 (b) .env.example -> .env.local copy
 * (c) git init + initial commit (d) pm install (e) profile 別 file 削除。
 * execa は injectable (test で network/subprocess なしに検証)。
 */

type ExecaFn = typeof defaultExeca;

export interface PostCloneOptions {
  targetDir: string;
  projectName: string;
  pm: PackageManager;
  profile: Profile;
  install: boolean;
  git: boolean;
  execa?: ExecaFn;
}

const VERCEL_PROFILES: Profile[] = ['vercel-managed', 'vercel-supabase'];

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function rewritePackageName(
  targetDir: string,
  projectName: string,
): Promise<void> {
  const pkgPath = join(targetDir, 'package.json');
  const pkg = JSON.parse(await readFile(pkgPath, 'utf8'));
  pkg.name = projectName;
  await writeFile(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
}

async function copyEnvExample(targetDir: string): Promise<void> {
  const src = join(targetDir, '.env.example');
  if (await fileExists(src)) {
    await copyFile(src, join(targetDir, '.env.local'));
  }
}

async function pruneProfileFiles(
  targetDir: string,
  profile: Profile,
): Promise<void> {
  const toRemove: string[] = VERCEL_PROFILES.includes(profile)
    ? ['Dockerfile', 'docker-compose.yml']
    : profile === 'vps'
      ? ['vercel.json']
      : [];
  await Promise.all(
    toRemove.map((f) => rm(join(targetDir, f), { force: true })),
  );
}

async function initGit(targetDir: string, execa: ExecaFn): Promise<void> {
  const opts = { cwd: targetDir } as const;
  await execa('git', ['init', '-b', 'main'], opts);
  await execa('git', ['add', '-A'], opts);
  await execa(
    'git',
    ['commit', '-m', 'chore: initial commit from @takuma-hirai/create-app'],
    opts,
  );
}

async function installDeps(
  targetDir: string,
  pm: PackageManager,
  execa: ExecaFn,
): Promise<void> {
  await execa(pm, ['install'], { cwd: targetDir });
}

export async function postClone(opts: PostCloneOptions): Promise<void> {
  const execa = opts.execa ?? defaultExeca;
  try {
    await rewritePackageName(opts.targetDir, opts.projectName);
    await copyEnvExample(opts.targetDir);
    await pruneProfileFiles(opts.targetDir, opts.profile);

    if (opts.git) {
      await initGit(opts.targetDir, execa);
    }
    if (opts.install) {
      await installDeps(opts.targetDir, opts.pm, execa);
    }
  } catch (err: unknown) {
    throw classifyError(err);
  }
}
