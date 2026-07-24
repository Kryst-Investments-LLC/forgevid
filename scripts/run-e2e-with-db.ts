/**
 * Cross-platform isolated database runner.
 *
 * Starts a throwaway PostgreSQL container on a random host port, applies the
 * real Prisma migrations, runs the runtime E2E suite, and removes the container
 * even when migration or verification fails.
 */
import { randomBytes } from 'crypto';
import { spawnSync } from 'child_process';
import { join } from 'path';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

const container = `forgevid-e2e-pg-${randomBytes(5).toString('hex')}`;
const docker = process.platform === 'win32' ? 'docker.exe' : 'docker';
const prismaCli = join(process.cwd(), 'node_modules', 'prisma', 'build', 'index.js');
const tsxCli = join(process.cwd(), 'node_modules', 'tsx', 'dist', 'cli.mjs');

function run(
  command: string,
  args: string[],
  options: { capture?: boolean; env?: NodeJS.ProcessEnv } = {},
): string {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: options.env ?? process.env,
    encoding: 'utf8',
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = options.capture
      ? `\n${String(result.stderr || result.stdout).trim()}`
      : '';
    throw new Error(`${command} ${args.join(' ')} failed (${result.status})${detail}`);
  }
  return String(result.stdout ?? '').trim();
}

function sleep(ms: number) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function runWithRetries(command: string, args: string[], env: NodeJS.ProcessEnv, attempts = 5) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      run(command, args, { env });
      return;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        console.warn(`database command not ready (attempt ${attempt}/${attempts}); retrying...`);
        sleep(1_000);
      }
    }
  }
  throw lastError;
}

try {
  run(docker, [
    'run',
    '-d',
    '--rm',
    '--name',
    container,
    '-e',
    'POSTGRES_USER=postgres',
    '-e',
    'POSTGRES_PASSWORD=forgevid_e2e',
    '-e',
    'POSTGRES_DB=forgevid_e2e',
    '-p',
    '127.0.0.1::5432',
    'postgres:16-alpine',
  ]);

  const portOutput = run(docker, ['port', container, '5432/tcp'], { capture: true });
  const port = portOutput.match(/:(\d+)\s*$/)?.[1];
  if (!port) throw new Error(`Could not resolve PostgreSQL port from: ${portOutput}`);

  let ready = false;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const result = spawnSync(
      docker,
      ['exec', container, 'pg_isready', '-U', 'postgres', '-d', 'forgevid_e2e'],
      { stdio: 'ignore' },
    );
    if (result.status === 0) {
      ready = true;
      break;
    }
    sleep(1_000);
  }
  if (!ready) throw new Error('Scratch PostgreSQL did not become ready within 60 seconds');

  console.log(`scratch postgres container on 127.0.0.1:${port}`);
  const env = {
    ...process.env,
    DATABASE_URL: `postgresql://postgres:forgevid_e2e@127.0.0.1:${port}/forgevid_e2e`,
    // The suite uses reserved .test recipients. Never let an isolated database
    // verification contact the configured production SMTP service.
    SMTP_HOST: '',
    SMTP_PORT: '',
    SMTP_USER: '',
    SMTP_PASSWORD: '',
    SMTP_FROM: '',
    // Provider integrations have their own explicit live verifier. Keep this
    // database suite deterministic, free, and isolated from external services.
    CLOUDINARY_CLOUD_NAME: '',
    CLOUDINARY_API_KEY: '',
    CLOUDINARY_API_SECRET: '',
  };
  for (const providerKey of [
    'GEMINI_API_KEY',
    'OPENAI_API_KEY',
    'ELEVENLABS_API_KEY',
    'PEXELS_API_KEY',
    'HEYGEN_API_KEY',
  ]) {
    delete env[providerKey];
  }
  // pg_isready can succeed a fraction before Prisma's schema-engine connection
  // is usable on Docker Desktop, so tolerate that short startup race.
  runWithRetries(process.execPath, [prismaCli, 'migrate', 'deploy'], env);
  run(process.execPath, [tsxCli, 'scripts/verify-e2e.ts'], { env });
} finally {
  spawnSync(docker, ['rm', '-f', container], { stdio: 'ignore' });
}
