import { mkdtempSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { cmdBackup, cmdRestore, backupManifest } from '../../src/commands/backup.js';
import { cmdInit, cmdRemember, cmdRecall } from '../../src/commands/memory.js';
import { cmdDoctor, cmdStatus } from '../../src/commands/status.js';

describe('status doctor backup', () => {
  it('reports a data dir and round-trips gzip backup', async () => {
    const dataDir = mkdtempSync(path.join(os.tmpdir(), 'brainledge-bak-'));
    cmdInit(dataDir);
    await cmdRemember('Alice moved to Tokyo in July 2026.', dataDir);
    expect(cmdStatus(dataDir)).toMatch(/standalone/u);
    expect(cmdDoctor(dataDir)).toMatch(/node=/u);
    expect(cmdDoctor(dataDir)).toMatch(/sqlite=ok/u);
    expect(cmdDoctor(dataDir)).toMatch(/bind=loopback-default/u);
    const archive = path.join(dataDir, 'backup.sqlite.gz');
    await cmdBackup(archive, dataDir);
    expect(existsSync(`${archive}.config.json`)).toBe(true);
    mkdirSync(path.join(dataDir, 'blobs'), { recursive: true });
    writeFileSync(path.join(dataDir, 'blobs', 'note.txt'), 'blob-bytes');
    await cmdBackup(archive, dataDir);
    const restored = mkdtempSync(path.join(os.tmpdir(), 'brainledge-rst-'));
    await cmdRestore(archive, restored);
    expect(existsSync(path.join(restored, 'config.json'))).toBe(true);
    expect(existsSync(path.join(restored, 'blobs', 'note.txt'))).toBe(true);
    const recalled = await cmdRecall('Alice', restored);
    expect(recalled).toMatch(/Tokyo/u);
    expect(backupManifest().schemaVersion).toBe(1);
  });
});
