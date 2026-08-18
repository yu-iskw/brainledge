import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline';

import { LOCAL_SPACE_ID, localContext, type Application } from '@brainledge/core';
import {
  handleMcpJsonRpc,
  parseMcpProfiles,
  runStandaloneWorker,
  startStandaloneHttpServer,
} from '@brainledge/server';
import { openStandalone, SCHEMA_VERSION } from '@brainledge/storage';

import { initDataDir, resolveDataDir } from '../data-dir.js';

export async function cmdExport(destination: string, dataDirFlag?: string): Promise<void> {
  const dataDir = resolveDataDir(dataDirFlag);
  const handle = openStandalone(dataDir);
  try {
    const recalled = await handle.application.memory.recall(localContext(), {
      spaceId: LOCAL_SPACE_ID,
      query: '',
      limit: 1000,
    });
    writeFileSync(
      destination,
      `${JSON.stringify({ schemaVersion: SCHEMA_VERSION, memories: recalled.memories }, null, 2)}\n`,
    );
  } finally {
    handle.close();
  }
}

export async function cmdImport(source: string, dataDirFlag?: string): Promise<number> {
  const dataDir = resolveDataDir(dataDirFlag);
  initDataDir(dataDir);
  const parsed = JSON.parse(readFileSync(source, 'utf8')) as {
    schemaVersion?: number;
    memories?: { content: string }[];
  };
  if (parsed.schemaVersion !== SCHEMA_VERSION) {
    throw new Error('EXPORT_SCHEMA_MISMATCH');
  }
  const handle = openStandalone(dataDir);
  try {
    let count = 0;
    for (const memory of parsed.memories ?? []) {
      await handle.application.memory.remember(localContext(), {
        spaceId: LOCAL_SPACE_ID,
        content: memory.content,
      });
      count += 1;
    }
    return count;
  } finally {
    handle.close();
  }
}

export async function cmdMigrate(
  fromDir: string,
  toDir: string,
  flags: readonly string[],
): Promise<string> {
  assertMigrateConsent(flags);
  mkdirSync(toDir, { recursive: true });
  const archive = path.join(toDir, 'migrate-export.json');
  await cmdExport(archive, fromDir);
  const count = await cmdImport(archive, toDir);
  return `migrated ${String(count)} memories between SQLite data directories`;
}

export function cmdMigrateHelp(): string {
  return 'brainledge migrate --from sqlite --to postgres --space ks_default --from-dir DIR --to-dir DIR --i-understand';
}

export function assertMigrateConsent(flags: readonly string[]): void {
  if (!flags.includes('--i-understand')) {
    throw new Error('migrate requires --i-understand');
  }
}

export function describeServeMode(dataDirFlag?: string, remote?: string): string {
  if (remote !== undefined && remote.length > 0) {
    return `remote:${remote}`;
  }
  const dataDir = resolveDataDir(dataDirFlag);
  mkdirSync(dataDir, { recursive: true });
  return `local:${dataDir}`;
}

export function cmdServe(dataDirFlag?: string, remote?: string): void {
  if (remote !== undefined && remote.length > 0) {
    throw new Error(
      `serve starts a local HTTP listener. To talk to ${remote}, pass --server to remember/recall instead.`,
    );
  }
  const dataDir = resolveDataDir(dataDirFlag);
  initDataDir(dataDir);
  process.env.BRAINLEDGE_DATA_DIR = dataDir;
  startStandaloneHttpServer(dataDir);
}

export async function runMcpStdio(application: Application, input: string): Promise<string> {
  return handleMcpJsonRpc(
    application,
    parseMcpProfiles(process.env.BRAINLEDGE_MCP_PROFILES),
    input,
  );
}

export async function cmdMcp(dataDirFlag?: string, jsonRpcLine?: string): Promise<string> {
  const dataDir = resolveDataDir(dataDirFlag);
  if (!existsSync(path.join(dataDir, 'database.sqlite'))) {
    throw new Error('Run brainledge init first');
  }
  const handle = openStandalone(dataDir);
  if (jsonRpcLine !== undefined && jsonRpcLine.length > 0) {
    try {
      return await runMcpStdio(handle.application, jsonRpcLine);
    } finally {
      handle.close();
    }
  }
  const rl = createInterface({ input: process.stdin, terminal: false });
  try {
    for await (const line of rl) {
      if (line.trim().length === 0) {
        continue;
      }
      const response = await runMcpStdio(handle.application, line);
      process.stdout.write(`${response}\n`);
    }
  } finally {
    handle.close();
    rl.close();
  }
  return '';
}

export async function cmdWorker(dataDirFlag?: string): Promise<string> {
  const dataDir = resolveDataDir(dataDirFlag);
  if (!existsSync(path.join(dataDir, 'database.sqlite'))) {
    throw new Error('Run brainledge init first');
  }
  const handle = openStandalone(dataDir);
  try {
    const processed = await runStandaloneWorker(handle.application, { once: true });
    return `worker processed ${String(processed)} jobs`;
  } finally {
    handle.close();
  }
}
