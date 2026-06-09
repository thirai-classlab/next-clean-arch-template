import { describe, it, expect } from 'vitest';
import {
  CreateAppError,
  ExitCode,
  classifyError,
} from '../src/errors.js';

describe('errors: ExitCode mapping', () => {
  it('assigns distinct exit codes 1-5 to each error category', () => {
    expect(ExitCode.NETWORK).toBe(1);
    expect(ExitCode.DISK).toBe(2);
    expect(ExitCode.PERMISSION).toBe(3);
    expect(ExitCode.EXISTING_DIR).toBe(4);
    expect(ExitCode.MISSING_TEMPLATE).toBe(5);
  });
});

describe('errors: CreateAppError carries code + message', () => {
  it('exposes exitCode and a red-formattable message', () => {
    const err = new CreateAppError(
      'network down',
      ExitCode.NETWORK,
    );
    expect(err).toBeInstanceOf(Error);
    expect(err.exitCode).toBe(ExitCode.NETWORK);
    expect(err.message).toContain('network down');
  });
});

describe('errors: classifyError maps raw errors to the 5 paths', () => {
  it('ENOTFOUND / ECONNREFUSED -> NETWORK (exit 1)', () => {
    expect(classifyError({ code: 'ENOTFOUND' }).exitCode).toBe(ExitCode.NETWORK);
    expect(classifyError({ code: 'ECONNREFUSED' }).exitCode).toBe(ExitCode.NETWORK);
    expect(classifyError({ message: 'getaddrinfo ENOTFOUND github.com' }).exitCode).toBe(
      ExitCode.NETWORK,
    );
  });

  it('ENOSPC -> DISK (exit 2)', () => {
    expect(classifyError({ code: 'ENOSPC' }).exitCode).toBe(ExitCode.DISK);
    expect(classifyError({ message: 'ENOSPC: no space left on device' }).exitCode).toBe(
      ExitCode.DISK,
    );
  });

  it('EACCES / EPERM -> PERMISSION (exit 3)', () => {
    expect(classifyError({ code: 'EACCES' }).exitCode).toBe(ExitCode.PERMISSION);
    expect(classifyError({ code: 'EPERM' }).exitCode).toBe(ExitCode.PERMISSION);
  });

  it('EEXIST / existing directory -> EXISTING_DIR (exit 4)', () => {
    expect(classifyError({ code: 'EEXIST' }).exitCode).toBe(ExitCode.EXISTING_DIR);
    expect(classifyError({ message: 'directory already exists' }).exitCode).toBe(
      ExitCode.EXISTING_DIR,
    );
  });

  it('404 / Not Found -> MISSING_TEMPLATE (exit 5)', () => {
    expect(classifyError({ message: '404 Not Found' }).exitCode).toBe(
      ExitCode.MISSING_TEMPLATE,
    );
    expect(classifyError({ message: 'Not Found' }).exitCode).toBe(
      ExitCode.MISSING_TEMPLATE,
    );
  });

  it('passes through an existing CreateAppError unchanged', () => {
    const original = new CreateAppError('boom', ExitCode.DISK);
    expect(classifyError(original)).toBe(original);
  });

  it('unknown error defaults to NETWORK (exit 1) as a safe generic', () => {
    expect(classifyError({ message: 'totally unexpected' }).exitCode).toBe(
      ExitCode.NETWORK,
    );
  });
});
