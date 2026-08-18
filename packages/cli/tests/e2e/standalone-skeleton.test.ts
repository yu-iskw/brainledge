import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { cmdInit, cmdRecall, cmdRemember } from '../../src/commands/memory.js';

describe('standalone skeleton e2e', () => {
  it('remembers, recalls, restarts, and still recalls', async () => {
    const dataDir = mkdtempSync(path.join(os.tmpdir(), 'brainledge-e2e-'));
    cmdInit(dataDir);
    await cmdRemember('Alice moved to Tokyo in July 2026.', dataDir);
    const first = await cmdRecall('Where does Alice live?', dataDir);
    expect(first).toMatch(/Tokyo/u);
    const second = await cmdRecall('Alice', dataDir);
    expect(second).toMatch(/Tokyo/u);
  });
});
