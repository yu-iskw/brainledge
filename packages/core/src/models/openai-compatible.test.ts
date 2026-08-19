import { describe, expect, it } from 'vitest';

import { createOpenAiCompatibleProvider } from './openai-compatible.js';

describe('openai-compatible provider', () => {
  it('posts chat completions through an injected fetch', async () => {
    let chatBody = '';
    const provider = createOpenAiCompatibleProvider({
      baseUrl: 'https://api.example.test',
      apiKey: 'sk-test',
      model: 'gpt-test',
      fetchImpl: (input, init) => {
        const url =
          input instanceof URL ? input.href : typeof input === 'string' ? input : input.url;
        if (url.includes('/chat/completions')) {
          chatBody = typeof init?.body === 'string' ? init.body : '';
          return Promise.resolve(
            new Response(
              JSON.stringify({
                choices: [{ message: { content: 'ok' } }],
                usage: { prompt_tokens: 1, completion_tokens: 1 },
              }),
              { status: 200 },
            ),
          );
        }
        return Promise.resolve(
          new Response(JSON.stringify({ data: [{ embedding: [0.1, 0.2] }] }), { status: 200 }),
        );
      },
    });
    const generated = await provider.generate({
      prompt: 'hi',
      jsonSchema: { type: 'object', properties: { facts: { type: 'array' } } },
    });
    expect(generated.text).toBe('ok');
    expect(chatBody).toMatch(/json_schema/u);
    const embedded = await provider.embed({ texts: ['hi'] });
    expect(embedded.vectors[0]).toEqual([0.1, 0.2]);
  });

  it('classifies retryable and fatal model errors', async () => {
    const retry = createOpenAiCompatibleProvider({
      baseUrl: 'https://api.example.test',
      apiKey: 'sk-test',
      model: 'gpt-test',
      fetchImpl: () => Promise.resolve(new Response('nope', { status: 500 })),
    });
    await expect(retry.generate({ prompt: 'hi' })).rejects.toThrow(/RETRY/u);
    const fatal = createOpenAiCompatibleProvider({
      baseUrl: 'https://api.example.test',
      apiKey: 'sk-test',
      model: 'gpt-test',
      fetchImpl: () => Promise.resolve(new Response('nope', { status: 400 })),
    });
    await expect(fatal.embed({ texts: ['hi'] })).rejects.toThrow(/FATAL/u);
  });
});
