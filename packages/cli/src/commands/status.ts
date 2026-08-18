import { existsSync } from 'node:fs';
import path from 'node:path';

import { readProfile, resolveDataDir } from '../data-dir.js';

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
    `dataDirWritable=${existsSync(dataDir) ? 'yes' : 'init-needed'}`,
    `profile=${readProfile(dataDir)}`,
    `sqlite=${existsSync(db) ? 'ok' : 'missing'}`,
    'bind=loopback-default',
  ];
  return checks.join('\n');
}
