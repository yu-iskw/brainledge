import {
  asJobId,
  asKnowledgeSpaceId,
  assertSafeIngestionUrl,
  hashLocalApiToken,
  isAppError,
  localContext,
  newId,
  verifyLocalApiToken,
  type Application,
} from '@brainledge/core';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { z } from 'zod';

import { parseMcpProfiles } from '../mcp/profiles.js';
import { MCP_PROTOCOL_VERSION, toMcpV2Request } from '../mcp/protocol.js';
import { createBrainledgeMcpHandler } from '../mcp/server.js';
import { formatRequestLog } from '../observability/log.js';

import { DEFAULT_UI_HTML } from './default-ui.js';

interface ErrorBody {
  error: { code: string; message: string; requestId: string };
}

export interface CreateHttpAppOptions {
  readonly apiToken?: string;
  readonly uiHtml?: string;
}

const rememberBody = z.object({
  content: z.string().min(1),
  kind: z
    .enum(['conversation', 'note', 'document', 'event', 'tool-result', 'observation'])
    .optional(),
});

const recallBody = z.object({
  query: z.string(),
  limit: z.number().int().positive().max(100).optional(),
});

const ingestBody = z
  .object({
    markdown: z.string().min(1).optional(),
    url: z.string().min(1).optional(),
    idempotencyKey: z.string().optional(),
  })
  .refine((data) => data.markdown !== undefined || data.url !== undefined, {
    message: 'markdown or url required',
  });

export const openApiDocument = {
  openapi: '3.1.0',
  info: { title: 'Brainledge API', version: '1.0.0' },
  paths: {
    '/health': { get: { responses: { '200': { description: 'ok' } } } },
    '/': { get: { responses: { '200': { description: 'ui' } } } },
    '/mcp': {
      get: { responses: { '200': { description: 'mcp discovery' } } },
      post: { responses: { '200': { description: 'mcp streamable http' } } },
    },
    '/api/v1/openapi.json': { get: { responses: { '200': { description: 'openapi' } } } },
    '/api/v1/me': { get: { responses: { '200': { description: 'principal' } } } },
    '/api/v1/spaces': { get: { responses: { '200': { description: 'spaces' } } } },
    '/api/v1/spaces/{spaceId}/memories/{memoryId}': {
      delete: { responses: { '200': { description: 'forget' } } },
    },
    '/api/v1/spaces/{spaceId}/recall': {
      post: { responses: { '200': { description: 'recall' } } },
    },
    '/api/v1/spaces/{spaceId}/ingestions': {
      post: { responses: { '200': { description: 'ingest' } } },
    },
    '/api/v1/spaces/{spaceId}/consolidate': {
      post: { responses: { '200': { description: 'consolidate' } } },
    },
    '/api/v1/spaces/{spaceId}/entities': {
      get: { responses: { '200': { description: 'entities' } } },
    },
    '/api/v1/spaces/{spaceId}/facts': { get: { responses: { '200': { description: 'facts' } } } },
    '/api/v1/spaces/{spaceId}/timeline': {
      get: { responses: { '200': { description: 'timeline' } } },
    },
    '/api/v1/spaces/{spaceId}/provenance': {
      get: { responses: { '200': { description: 'provenance' } } },
    },
    '/api/v1/spaces/{spaceId}/decisions': {
      get: { responses: { '200': { description: 'decisions' } } },
    },
    '/api/v1/spaces/{spaceId}/export': { get: { responses: { '200': { description: 'export' } } } },
    '/api/v1/ingestions/{runId}': {
      get: { responses: { '200': { description: 'ingestion run' } } },
    },
  },
};

export const REQUIRED_OPENAPI_PATHS = Object.keys(openApiDocument.paths);

const REQUEST_ID_HEADER = 'x-request-id';

const forgetQuery = z.object({
  mode: z.enum(['hide', 'delete', 'retract', 'purge']).optional(),
});

function requestId(header?: string): string {
  return header && header.length > 0 ? header : `req_${Date.now()}`;
}

function enqueueJob(
  application: Application,
  type: string,
  payload: Record<string, unknown>,
): Promise<string> {
  const ctx = localContext();
  const jobId = asJobId(newId('job'));
  return application.ports.jobs
    .enqueue({
      workspaceId: ctx.workspaceId,
      job: {
        id: jobId,
        workspaceId: ctx.workspaceId,
        type,
        payloadJson: JSON.stringify(payload),
        status: 'queued',
        attempts: 0,
        createdAt: application.ports.clock.now(),
      },
    })
    .then(() => jobId);
}

export function createHttpApp(application: Application, options?: CreateHttpAppOptions): Hono {
  const configuredApiToken = options?.apiToken ?? process.env.BRAINLEDGE_API_TOKEN;
  const expectedTokenHash =
    configuredApiToken !== undefined && configuredApiToken.length > 0
      ? hashLocalApiToken(configuredApiToken)
      : undefined;
  const mcpProfiles = parseMcpProfiles(process.env.BRAINLEDGE_MCP_PROFILES);
  const mcpHandler = createBrainledgeMcpHandler(application, mcpProfiles);

  const app = new Hono();
  app.use('*', secureHeaders());
  app.use('*', cors());
  app.use('*', async (context, next) => {
    const length = Number(context.req.header('content-length') ?? '0');
    if (length > 1_000_000) {
      return context.json(
        errorBody(
          'PAYLOAD_TOO_LARGE',
          'Body exceeds 1MB',
          requestId(context.req.header(REQUEST_ID_HEADER)),
        ),
        413,
      );
    }
    await next();
  });

  app.onError((error, context) => {
    const id = requestId(context.req.header(REQUEST_ID_HEADER));
    if (error instanceof Error && error.message.startsWith('INGEST_URL_')) {
      return context.json(errorBody(error.message, error.message, id), 400);
    }
    return mapError(context, error, id);
  });

  app.get('/health', (context) => context.json({ status: 'ok' }));

  app.get('/', (context) => {
    const html = options?.uiHtml ?? DEFAULT_UI_HTML;
    return context.html(html);
  });

  if (expectedTokenHash !== undefined) {
    app.use('/api/v1/*', requireBearer(expectedTokenHash));
    app.use('/mcp', async (context, next) => {
      if (context.req.method === 'GET') {
        await next();
        return;
      }
      return requireBearer(expectedTokenHash)(context, next);
    });
  }

  app.use('/api/v1/*', async (context, next) => {
    const id = requestId(context.req.header(REQUEST_ID_HEADER));
    const ctx = localContext();
    console.info(
      formatRequestLog({
        requestId: id,
        principalId: ctx.principal.id,
        workspaceId: ctx.workspaceId,
        knowledgeSpaceId: ctx.knowledgeSpaceId,
      }),
    );
    await next();
  });

  app.get('/api/v1/openapi.json', (context) => context.json(openApiDocument));

  app.get('/api/v1/me', (context) => {
    const principal = localContext().principal;
    return context.json({ id: principal.id, type: principal.type });
  });

  app.get('/api/v1/spaces', async (context) => {
    const spaces = await application.ports.spaces.list({
      workspaceId: localContext().workspaceId,
    });
    return context.json({ items: spaces, nextCursor: null });
  });

  app.post('/api/v1/spaces/:spaceId/memories', async (context) => {
    const id = requestId(context.req.header(REQUEST_ID_HEADER));
    const parsed = rememberBody.safeParse(await context.req.json());
    if (!parsed.success) {
      return context.json(errorBody('INVALID_BODY', 'content required', id), 400);
    }
    const result = await application.memory.remember(localContext(), {
      spaceId: context.req.param('spaceId'),
      content: parsed.data.content,
      kind: parsed.data.kind,
    });
    return context.json({ episodeId: result.episodeId, requestId: id });
  });

  app.delete('/api/v1/spaces/:spaceId/memories/:memoryId', async (context) => {
    const id = requestId(context.req.header(REQUEST_ID_HEADER));
    const parsed = forgetQuery.safeParse({ mode: context.req.query('mode') });
    if (!parsed.success) {
      return context.json(
        errorBody('INVALID_QUERY', 'mode must be hide|delete|retract|purge', id),
        400,
      );
    }
    await application.memory.forget(localContext(), {
      spaceId: context.req.param('spaceId'),
      memoryId: context.req.param('memoryId'),
      mode: parsed.data.mode ?? 'hide',
    });
    return context.json({ status: 'ok', requestId: id });
  });

  app.post('/api/v1/spaces/:spaceId/recall', async (context) => {
    const id = requestId(context.req.header(REQUEST_ID_HEADER));
    const parsed = recallBody.safeParse(await context.req.json());
    if (!parsed.success) {
      return context.json(errorBody('INVALID_BODY', 'query required', id), 400);
    }
    const result = await application.memory.recall(localContext(), {
      spaceId: context.req.param('spaceId'),
      query: parsed.data.query,
      limit: parsed.data.limit,
    });
    return context.json({ ...result, requestId: id });
  });

  app.post('/api/v1/spaces/:spaceId/ingestions', async (context) => {
    const id = requestId(context.req.header(REQUEST_ID_HEADER));
    const parsed = ingestBody.safeParse(await context.req.json());
    if (!parsed.success) {
      return context.json(errorBody('INVALID_BODY', 'markdown or url required', id), 400);
    }
    const spaceId = context.req.param('spaceId');
    if (parsed.data.url !== undefined) {
      assertSafeIngestionUrl(parsed.data.url);
      const jobId = await enqueueJob(application, 'ingest-url', {
        spaceId,
        url: parsed.data.url,
        idempotencyKey: parsed.data.idempotencyKey,
      });
      return context.json({
        status: 'queued',
        url: parsed.data.url,
        jobId,
        requestId: id,
        idempotencyKey: parsed.data.idempotencyKey,
      });
    }
    const result = await application.knowledge?.ingestMarkdown(localContext(), {
      spaceId,
      markdown: parsed.data.markdown ?? '',
    });
    return context.json({
      status: 'queued',
      segments: result?.segments ?? 0,
      requestId: id,
      idempotencyKey: parsed.data.idempotencyKey,
    });
  });

  app.post('/api/v1/spaces/:spaceId/consolidate', async (context) => {
    const id = requestId(context.req.header(REQUEST_ID_HEADER));
    const spaceId = context.req.param('spaceId');
    const result = await application.memory.consolidate(localContext(), { spaceId });
    return context.json({
      status: 'completed',
      factCount: result.factCount,
      requestId: id,
    });
  });

  app.get('/api/v1/spaces/:spaceId/entities', async (context) => {
    const items =
      (await application.knowledge?.queryEntities(localContext(), {
        spaceId: context.req.param('spaceId'),
      })) ?? [];
    return context.json({ items, nextCursor: null });
  });
  app.get('/api/v1/spaces/:spaceId/facts', async (context) => {
    const asOf = context.req.query('asOf');
    const items =
      (await application.knowledge?.queryFacts(localContext(), {
        spaceId: context.req.param('spaceId'),
        asOf,
      })) ?? [];
    return context.json({ items, nextCursor: null });
  });
  app.get('/api/v1/spaces/:spaceId/timeline', async (context) => {
    const items = await application.ports.episodes.listRecent({
      workspaceId: localContext().workspaceId,
      knowledgeSpaceId: asKnowledgeSpaceId(context.req.param('spaceId')),
      limit: 50,
    });
    return context.json({ items, nextCursor: null });
  });
  app.get('/api/v1/spaces/:spaceId/provenance', async (context) => {
    const recalled = await application.memory.recall(localContext(), {
      spaceId: context.req.param('spaceId'),
      query: '',
      limit: 50,
    });
    return context.json({ items: recalled.provenanceSummary });
  });
  app.get('/api/v1/spaces/:spaceId/decisions', (context) => {
    const id = requestId(context.req.header(REQUEST_ID_HEADER));
    return context.json(
      errorBody('NOT_IMPLEMENTED', 'Decisions API is not available in the walking skeleton', id),
      501,
    );
  });
  app.get('/api/v1/spaces/:spaceId/export', async (context) => {
    const spaceId = context.req.param('spaceId');
    const recalled = await application.memory.recall(localContext(), {
      spaceId,
      query: '',
      limit: 1000,
    });
    return context.json({ schemaVersion: 1, spaceId, memories: recalled.memories });
  });
  app.get('/api/v1/ingestions/:runId', (context) => {
    const id = requestId(context.req.header(REQUEST_ID_HEADER));
    return context.json(
      errorBody(
        'NOT_IMPLEMENTED',
        `Ingestion run status is not tracked yet (id ${context.req.param('runId')})`,
        id,
      ),
      501,
    );
  });

  app.get('/mcp', (context) =>
    context.json({
      transport: 'streamable-http',
      protocolVersion: MCP_PROTOCOL_VERSION,
      status: 'ok',
    }),
  );

  app.post('/mcp', async (context) => {
    const adapted = await toMcpV2Request(context.req.raw);
    return mcpHandler.fetch(adapted);
  });

  return app;
}

function requireBearer(expectedTokenHash: string) {
  return async (
    context: {
      req: { header: (name: string) => string | undefined };
      json: (body: ErrorBody, status?: number) => Response;
    },
    next: () => Promise<void>,
  ) => {
    const id = requestId(context.req.header(REQUEST_ID_HEADER));
    const authorization = context.req.header('authorization');
    if (authorization === undefined || !authorization.startsWith('Bearer ')) {
      return context.json(errorBody('UNAUTHORIZED', 'Missing or invalid API token', id), 401);
    }
    const presented = authorization.slice('Bearer '.length);
    if (!verifyLocalApiToken(presented, expectedTokenHash)) {
      return context.json(errorBody('UNAUTHORIZED', 'Missing or invalid API token', id), 401);
    }
    await next();
  };
}

function errorBody(code: string, message: string, id: string): ErrorBody {
  return { error: { code, message, requestId: id } };
}

function mapError(
  context: { json: (body: ErrorBody, status?: number) => Response },
  error: unknown,
  id: string,
): Response {
  if (isAppError(error)) {
    return context.json(errorBody(error.code, error.message, id), error.status);
  }
  return context.json(errorBody('INTERNAL', 'Internal error', id), 500);
}
