import { createReadStream, createWriteStream, existsSync, mkdirSync, cpSync } from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { createGzip, createGunzip } from 'node:zlib';

import { SCHEMA_VERSION } from '@brainledge/storage';

import { initDataDir, resolveDataDir } from '../data-dir.js';

export async function cmdBackup(destination: string, dataDirFlag?: string): Promise<void> {
  const dataDir = resolveDataDir(dataDirFlag);
  const db = path.join(dataDir, 'database.sqlite');
  if (!existsSync(db)) {
    throw new Error('No database to backup. Run brainledge init first.');
  }
  mkdirSync(path.dirname(destination), { recursive: true });
  await pipeline(createReadStream(db), createGzip(), createWriteStream(destination));
  const blobs = path.join(dataDir, 'blobs');
  if (existsSync(blobs)) {
    cpSync(blobs, `${destination}.blobs`, { recursive: true });
  }
  const config = path.join(dataDir, 'config.json');
  if (existsSync(config)) {
    cpSync(config, `${destination}.config.json`);
  }
}

export async function cmdRestore(source: string, dataDirFlag?: string): Promise<void> {
  const dataDir = resolveDataDir(dataDirFlag);
  initDataDir(dataDir);
  const db = path.join(dataDir, 'database.sqlite');
  await pipeline(createReadStream(source), createGunzip(), createWriteStream(db));
  const configBackup = `${source}.config.json`;
  if (existsSync(configBackup)) {
    cpSync(configBackup, path.join(dataDir, 'config.json'));
  }
  const blobsBackup = `${source}.blobs`;
  if (existsSync(blobsBackup)) {
    cpSync(blobsBackup, path.join(dataDir, 'blobs'), { recursive: true });
  }
}

export function backupManifest(): { schemaVersion: number; profile: string } {
  return { schemaVersion: SCHEMA_VERSION, profile: 'standalone' };
}
