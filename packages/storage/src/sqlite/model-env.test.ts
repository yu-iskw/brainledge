import { describe, expect, it } from 'vitest';

import { textGenerationProviderFromEnv } from './model-env.js';

describe('textGenerationProviderFromEnv', () => {
  it('returns undefined when no key or base URL is set', () => {
    expect(textGenerationProviderFromEnv({})).toBeUndefined();
    expect(textGenerationProviderFromEnv({ BRAINLEDGE_LLM_API_KEY: 'sk-test' })).toBeUndefined();
  });

  it('builds an OpenAI-compatible provider when env is set', () => {
    expect(
      textGenerationProviderFromEnv({
        BRAINLEDGE_LLM_API_KEY: 'sk-test',
        BRAINLEDGE_LLM_BASE_URL: 'https://api.example.test',
        BRAINLEDGE_LLM_MODEL: 'gpt-test',
      }),
    ).toBeDefined();
  });
});
