import { createOpenAiCompatibleProvider } from '@brainledge/core';

import type { TextGenerationProvider } from '@brainledge/core';

export function textGenerationProviderFromEnv(
  env: NodeJS.Dict<string> = process.env,
): TextGenerationProvider | undefined {
  const apiKey = env.BRAINLEDGE_LLM_API_KEY?.trim();
  const baseUrl = env.BRAINLEDGE_LLM_BASE_URL?.trim();
  if (
    apiKey === undefined ||
    apiKey.length === 0 ||
    baseUrl === undefined ||
    baseUrl.length === 0
  ) {
    return undefined;
  }
  return createOpenAiCompatibleProvider({
    baseUrl,
    apiKey,
    model: env.BRAINLEDGE_LLM_MODEL?.trim() || 'gpt-4o-mini',
  });
}
