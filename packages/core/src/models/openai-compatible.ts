import type {
  EmbeddingProvider,
  EmbeddingRequest,
  EmbeddingResponse,
  GenerationRequest,
  GenerationResponse,
  TextGenerationProvider,
} from './providers.js';

interface OpenAiCompatibleConfig {
  readonly baseUrl: string;
  readonly apiKey: string;
  readonly model: string;
  readonly fetchImpl?: typeof fetch;
}

function classifyStatus(status: number): 'retry' | 'fatal' {
  if (status === 429 || status >= 500) {
    return 'retry';
  }
  return 'fatal';
}

export function createOpenAiCompatibleProvider(
  config: OpenAiCompatibleConfig,
): TextGenerationProvider & EmbeddingProvider {
  const fetchImpl = config.fetchImpl ?? fetch;
  return {
    async generate(request: GenerationRequest): Promise<GenerationResponse> {
      const response = await fetchImpl(new URL('/v1/chat/completions', config.baseUrl), {
        method: 'POST',
        headers: {
          authorization: `Bearer ${config.apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: request.model ?? config.model,
          messages: [{ role: 'user', content: request.prompt }],
          ...(request.jsonSchema === undefined
            ? {}
            : {
                response_format: {
                  type: 'json_schema',
                  json_schema: {
                    name: 'brainledge_schema',
                    schema: request.jsonSchema,
                    strict: true,
                  },
                },
              }),
        }),
        signal: AbortSignal.timeout(request.timeoutMs ?? 30_000),
      });
      if (!response.ok) {
        throw new Error(
          `MODEL_${classifyStatus(response.status).toUpperCase()}:${response.status}`,
        );
      }
      const body = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };
      return {
        text: body.choices?.[0]?.message?.content ?? '',
        model: request.model ?? config.model,
        usage: {
          inputTokens: body.usage?.prompt_tokens ?? 0,
          outputTokens: body.usage?.completion_tokens ?? 0,
        },
      };
    },
    async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
      const response = await fetchImpl(new URL('/v1/embeddings', config.baseUrl), {
        method: 'POST',
        headers: {
          authorization: `Bearer ${config.apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ model: request.model ?? config.model, input: request.texts }),
      });
      if (!response.ok) {
        throw new Error(
          `MODEL_${classifyStatus(response.status).toUpperCase()}:${response.status}`,
        );
      }
      const body = (await response.json()) as { data?: { embedding: number[] }[] };
      return {
        model: request.model ?? config.model,
        vectors: (body.data ?? []).map((item) => item.embedding),
      };
    },
  };
}

export function createVertexCompatibleProvider(config: OpenAiCompatibleConfig) {
  return createOpenAiCompatibleProvider({ ...config, model: config.model });
}

export function createAnthropicCompatibleProvider(config: OpenAiCompatibleConfig) {
  return createOpenAiCompatibleProvider({ ...config, model: config.model });
}
