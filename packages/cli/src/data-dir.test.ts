import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { initDataDir, readProfile, resolveDataDir } from './data-dir.js';

describe('data dir', () => {
  it('resolves an override and initializes a standalone profile twice', () => {
    const dataDir = mkdtempSync(path.join(os.tmpdir(), 'brainledge-cli-data-'));
    expect(resolveDataDir(dataDir)).toBe(dataDir);
    initDataDir(dataDir);
    expect(readProfile(dataDir)).toBe('standalone');
    expect(() => {
      initDataDir(dataDir);
    }).not.toThrow();
    expect(readProfile(dataDir)).toBe('standalone');
  });
});
