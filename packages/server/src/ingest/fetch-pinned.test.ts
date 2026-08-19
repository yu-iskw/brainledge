import { describe, expect, it } from 'vitest';

import { fetchPinnedIngestUrl } from './fetch-pinned.js';

describe('fetchPinnedIngestUrl', () => {
  it('refuses to fetch when DNS resolves to a blocked address', async () => {
    await expect(
      fetchPinnedIngestUrl('https://evil.example/doc.md', () =>
        Promise.resolve([{ address: '127.0.0.1', family: 4 }]),
      ),
    ).rejects.toThrow(/SSRF/u);
  });
});
