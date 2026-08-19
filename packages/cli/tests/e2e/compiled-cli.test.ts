import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const cli = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../dist/main.js');

describe.skipIf(!existsSync(cli))('compiled CLI', () => {
  it('init, remember, recall, consolidate, and unknown command via node dist', () => {
    const dataDir = mkdtempSync(path.join(os.tmpdir(), 'brainledge-compiled-'));
    const run = (args: string[]): ReturnType<typeof spawnSync> =>
      spawnSync(process.execPath, [cli, ...args, '--data-dir', dataDir], { encoding: 'utf8' });
    expect(run(['init']).status).toBe(0);
    const remembered = run(['remember', 'Alice moved to Tokyo in July 2026.']);
    expect(remembered.status).toBe(0);
    expect(remembered.stdout).toMatch(/^ep_/u);
    const recalled = run(['recall', 'Alice']);
    expect(recalled.status).toBe(0);
    expect(recalled.stdout).toMatch(/Tokyo/u);
    expect(run(['consolidate']).status).toBe(0);
    expect(run(['nosuch']).status).toBe(1);
  });
});
