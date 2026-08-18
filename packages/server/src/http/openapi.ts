import { z } from 'zod';

import {
  decisionBody,
  errorEnvelope,
  forgetQuery,
  ingestBody,
  recallBody,
  rememberBody,
  spaceCreateBody,
  spaceUpdateBody,
} from './schemas.js';

function jsonSchema(schema: z.ZodType): Record<string, unknown> {
  const candidate = z as unknown as {
    toJSONSchema?: (value: z.ZodType) => Record<string, unknown>;
  };
  if (typeof candidate.toJSONSchema === 'function') {
    return candidate.toJSONSchema(schema);
  }
  return { type: 'object', description: schema.description };
}

function jsonContent(schema: z.ZodType): Record<string, unknown> {
  return {
    content: {
      'application/json': {
        schema: jsonSchema(schema),
      },
    },
  };
}

function operation(input: {
  summary: string;
  body?: z.ZodType;
  response?: z.ZodType;
}): Record<string, unknown> {
  return {
    summary: input.summary,
    ...(input.body === undefined
      ? {}
      : { requestBody: { required: true, ...jsonContent(input.body) } }),
    responses: {
      '200': {
        description: input.summary,
        ...(input.response === undefined ? {} : jsonContent(input.response)),
      },
      '400': { description: 'invalid request', ...jsonContent(errorEnvelope) },
      '401': { description: 'unauthorized', ...jsonContent(errorEnvelope) },
      '404': { description: 'not found', ...jsonContent(errorEnvelope) },
    },
  };
}

const listResponse = z.object({
  items: z.array(z.unknown()),
  nextCursor: z.string().nullable(),
});

export const openApiDocument = {
  openapi: '3.1.0',
  info: { title: 'Brainledge API', version: '1.0.0' },
  paths: {
    '/health': { get: operation({ summary: 'ok' }) },
    '/': { get: { summary: 'ui', responses: { '200': { description: 'ui' } } } },
    '/mcp': {
      get: operation({ summary: 'mcp discovery' }),
      post: operation({ summary: 'mcp streamable http' }),
    },
    '/api/v1/openapi.json': { get: operation({ summary: 'openapi' }) },
    '/api/v1/me': { get: operation({ summary: 'principal' }) },
    '/api/v1/workspaces': { get: operation({ summary: 'workspaces', response: listResponse }) },
    '/api/v1/spaces': {
      get: operation({ summary: 'list spaces', response: listResponse }),
      post: operation({ summary: 'create space', body: spaceCreateBody }),
    },
    '/api/v1/spaces/{spaceId}': {
      get: operation({ summary: 'get space' }),
      patch: operation({ summary: 'update space', body: spaceUpdateBody }),
      delete: operation({ summary: 'delete space' }),
    },
    '/api/v1/spaces/{spaceId}/memories': {
      get: operation({ summary: 'list memories', response: listResponse }),
      post: operation({ summary: 'remember', body: rememberBody }),
    },
    '/api/v1/spaces/{spaceId}/memories/{memoryId}': {
      delete: operation({ summary: 'forget', body: forgetQuery }),
    },
    '/api/v1/spaces/{spaceId}/recall': {
      post: operation({ summary: 'recall', body: recallBody }),
    },
    '/api/v1/spaces/{spaceId}/ingestions': {
      post: operation({ summary: 'ingest', body: ingestBody }),
    },
    '/api/v1/spaces/{spaceId}/consolidate': {
      post: operation({ summary: 'consolidate' }),
    },
    '/api/v1/spaces/{spaceId}/entities': {
      get: operation({ summary: 'entities', response: listResponse }),
    },
    '/api/v1/spaces/{spaceId}/facts': {
      get: operation({ summary: 'facts', response: listResponse }),
    },
    '/api/v1/spaces/{spaceId}/timeline': {
      get: operation({ summary: 'timeline', response: listResponse }),
    },
    '/api/v1/spaces/{spaceId}/provenance': {
      get: operation({ summary: 'provenance', response: listResponse }),
    },
    '/api/v1/spaces/{spaceId}/decisions': {
      get: operation({ summary: 'list decisions', response: listResponse }),
      post: operation({ summary: 'record decision', body: decisionBody }),
    },
    '/api/v1/spaces/{spaceId}/export': { get: operation({ summary: 'export' }) },
    '/api/v1/ingestions/{runId}': { get: operation({ summary: 'ingestion run' }) },
  },
} as const;

export const REQUIRED_OPENAPI_PATHS = Object.keys(openApiDocument.paths);
