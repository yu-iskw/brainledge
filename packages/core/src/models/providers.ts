export interface GenerationRequest {
  readonly prompt: string;
  readonly model?: string;
  readonly timeoutMs?: number;
  readonly jsonSchema?: Record<string, unknown>;
}

export interface GenerationResponse {
  readonly text: string;
  readonly model: string;
  readonly usage?: { readonly inputTokens: number; readonly outputTokens: number };
}

export interface EmbeddingRequest {
  readonly texts: readonly string[];
  readonly model?: string;
}

export interface EmbeddingResponse {
  readonly vectors: readonly (readonly number[])[];
  readonly model: string;
}

export interface TextGenerationProvider {
  generate(request: GenerationRequest): Promise<GenerationResponse>;
}

export interface EmbeddingProvider {
  embed(request: EmbeddingRequest): Promise<EmbeddingResponse>;
}

export function createFakeTextGenerationProvider(): TextGenerationProvider {
  return {
    generate(request): Promise<GenerationResponse> {
      return Promise.resolve({ text: `echo:${request.prompt}`, model: 'fake' });
    },
  };
}

export function createFakeEmbeddingProvider(dimension = 8): EmbeddingProvider {
  return {
    embed(request): Promise<EmbeddingResponse> {
      const vectors = request.texts.map((text) => {
        return Array.from({ length: dimension }, (_, index) => {
          const code = text.charCodeAt(index % Math.max(text.length, 1)) || 0;
          return (code % 13) / 13;
        });
      });
      return Promise.resolve({ vectors, model: 'fake-embed' });
    },
  };
}
