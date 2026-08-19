import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { createObjectStorageAdapter } from './object-storage.js';

describe('object storage adapters', () => {
  it('stores blobs for fs, gcs, and s3 prefixes', async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'brainledge-blob-'));
    for (const kind of ['fs', 'gcs', 's3'] as const) {
      const store = createObjectStorageAdapter(kind, root);
      await store.put('a.txt', new Uint8Array([1, 2, 3]));
      const got = await store.get('a.txt');
      expect(got).toEqual(new Uint8Array([1, 2, 3]));
    }
  });
});
