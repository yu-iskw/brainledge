import { describe, expect, it } from 'vitest';

import { createFakeEmbeddingProvider, createFakeTextGenerationProvider } from './providers.js';

describe('createFakeTextGenerationProvider', () => {
  it('echoes the prompt', async () => {
    const generated = await createFakeTextGenerationProvider().generate({ prompt: 'hello' });
    expect(generated.text).toBe('echo:hello');
    expect(generated.model).toBe('fake');
  });
});

describe('createFakeEmbeddingProvider', () => {
  it('returns vectors of the requested dimension', async () => {
    const embedded = await createFakeEmbeddingProvider(4).embed({ texts: ['Alice'] });
    expect(embedded.vectors).toHaveLength(1);
    expect(embedded.vectors[0]).toHaveLength(4);
    expect(embedded.model).toBe('fake-embed');
  });
});
