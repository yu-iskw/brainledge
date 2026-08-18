import { existsSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { openSqliteDatabase } from '@brainledge/storage';

import { readProfile, resolveDataDir } from '../data-dir.js';

function probeDataDirWritable(dataDir: string): string {
  if (!existsSync(dataDir)) {
    return 'init-needed';
  }
  const probe = path.join(dataDir, '.doctor-write');
  try {
    writeFileSync(probe, 'probe', { flag: 'w' });
    unlinkSync(probe);
    return 'yes';
  } catch {
    return 'no';
  }
}

function checkSqliteIntegrity(dbPath: string): string {
  if (!existsSync(dbPath)) {
    return 'missing';
  }
  try {
    const database = openSqliteDatabase(dbPath);
    try {
      const rows = database.prepare('PRAGMA integrity_check').all() as {
        integrity_check: string;
      }[];
      const results = rows.map((row) => row.integrity_check);
      if (results.length === 1 && results[0] === 'ok') {
        return 'ok';
      }
      return `corrupt (${results.join(', ')})`;
    } finally {
      database.close();
    }
  } catch {
    return 'corrupt';
  }
}

function resolveBindStatus(): string {
  const host = process.env.BRAINLEDGE_HOST ?? '127.0.0.1';
  const loopback = host === '127.0.0.1' || host === '::1' || host === 'localhost';
  if (loopback) {
    return 'bind=loopback-default';
  }
  const unsafeBind = process.env.BRAINLEDGE_UNSAFE_BIND === '1';
  const apiToken = process.env.BRAINLEDGE_API_TOKEN;
  const hasAuth = apiToken !== undefined && apiToken.length > 0;
  if (unsafeBind && hasAuth) {
    return 'bind=non-loopback-auth-ok';
  }
  return 'bind=non-loopback-unauthenticated';
}

export function cmdStatus(dataDirFlag?: string): string {
  const dataDir = resolveDataDir(dataDirFlag);
  const db = path.join(dataDir, 'database.sqlite');
  return [
    `dataDir=${dataDir}`,
    `profile=${readProfile(dataDir)}`,
    `database=${existsSync(db) ? 'present' : 'missing'}`,
  ].join('\n');
}

export function cmdDoctor(dataDirFlag?: string): string {
  const dataDir = resolveDataDir(dataDirFlag);
  const db = path.join(dataDir, 'database.sqlite');
  const checks = [
    `node=${process.versions.node}`,
    `nodeMajor=${Number(process.versions.node.split('.')[0]) >= 24 ? 'ok' : 'need-24'}`,
    `dataDirWritable=${probeDataDirWritable(dataDir)}`,
    `profile=${readProfile(dataDir)}`,
    `sqlite=${checkSqliteIntegrity(db)}`,
    resolveBindStatus(),
  ];
  return checks.join('\n');
}
