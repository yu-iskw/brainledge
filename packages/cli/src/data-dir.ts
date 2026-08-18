import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { resolveServerDataDir } from '@brainledge/server';

const CONFIG_NAME = 'config.json';

export function resolveDataDir(override?: string): string {
  if (override !== undefined && override.length > 0) {
    return override;
  }
  return resolveServerDataDir();
}

export function initDataDir(dataDir: string): void {
  mkdirSync(path.join(dataDir, 'blobs'), { recursive: true });
  const configPath = path.join(dataDir, CONFIG_NAME);
  try {
    writeFileSync(
      configPath,
      `${JSON.stringify({ profile: 'standalone', schemaVersion: 1 }, null, 2)}\n`,
      { flag: 'wx' },
    );
  } catch (error) {
    if (!isNodeError(error) || error.code !== 'EEXIST') {
      throw error;
    }
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}

export function readProfile(dataDir: string): string {
  const configPath = path.join(dataDir, CONFIG_NAME);
  if (!existsSync(configPath)) {
    return 'standalone';
  }
  const parsed = JSON.parse(readFileSync(configPath, 'utf8')) as { profile?: string };
  return parsed.profile ?? 'standalone';
}
