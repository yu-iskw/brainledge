import { describe, expect, it } from 'vitest';

import { readTextCapped } from './read-capped.js';

describe('readTextCapped', () => {
  it('returns small bodies and rejects oversized streams before they finish', async () => {
    expect(await readTextCapped(new Response('hello'), 100)).toBe('hello');
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('aa'));
        controller.enqueue(new TextEncoder().encode('bb'));
        controller.close();
      },
    });
    await expect(readTextCapped(new Response(stream), 3)).rejects.toThrow('INGEST_TOO_LARGE');
    await expect(
      readTextCapped(new Response('ok', { headers: { 'content-length': '999999' } }), 10),
    ).rejects.toThrow('INGEST_TOO_LARGE');
  });
});
