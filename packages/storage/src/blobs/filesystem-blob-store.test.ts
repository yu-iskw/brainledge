import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { createFilesystemBlobStore } from './filesystem-blob-store.js';

describe('filesystem blob store', () => {
  it('puts and gets bytes and returns undefined for a missing key', async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'brainledge-fs-blob-'));
    const store = createFilesystemBlobStore(root);
    const bytes = new Uint8Array([1, 2, 3]);
    await store.put('nested/dir/a.bin', bytes);
    expect(await store.get('nested/dir/a.bin')).toEqual(bytes);
    expect(await store.get('missing.bin')).toBeUndefined();
  });
});
