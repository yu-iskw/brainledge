import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  cmdConsolidate,
  cmdForget,
  cmdInit,
  cmdRecall,
  cmdRemember,
} from '../../src/commands/memory.js';

describe('standalone skeleton e2e', () => {
  it('remembers, recalls, consolidates, forgets, and still isolates hidden memories', async () => {
    const dataDir = mkdtempSync(path.join(os.tmpdir(), 'brainledge-e2e-'));
    cmdInit(dataDir);
    const episodeId = await cmdRemember('Alice moved to Tokyo in July 2026.', dataDir);
    const first = await cmdRecall('Where does Alice live?', dataDir);
    expect(first).toMatch(/Tokyo/u);
    expect(await cmdConsolidate(dataDir)).toMatch(/consolidated/u);
    const second = await cmdRecall('Alice', dataDir);
    expect(second).toMatch(/Tokyo/u);
    expect(await cmdForget(episodeId, { dataDirFlag: dataDir, mode: 'hide' })).toMatch(/forgot/u);
    expect(await cmdRecall('Alice', dataDir)).toMatch(/No memories found/u);
  });
});
