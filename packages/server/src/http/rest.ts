import {
  asDecisionId,
  asIngestionRunId,
  asKnowledgeSpaceId,
  assertSafeIngestionUrl,
  createDecision,
  localContext,
  LOCAL_WORKSPACE_ID,
  newId,
  type Application,
  type KnowledgeSpace,
} from '@brainledge/core';

import { enqueueJob, errorBody, requestId, REQUEST_ID_HEADER } from './http-shared.js';
import { openApiDocument } from './openapi.js';
import {
  decisionBody,
  forgetQuery,
  ingestBody,
  recallBody,
  rememberBody,
  spaceCreateBody,
  spaceUpdateBody,
} from './schemas.js';

import type { Hono } from 'hono';

const SPACE_NOT_FOUND = 'Space not found';
const SPACE_BY_ID_ROUTE = '/api/v1/spaces/:spaceId';

export function registerRestApi(app: Hono, application: Application): void {
  registerOpenApiRoutes(app);
  registerWorkspaceRoutes(app);
  registerSpaceRoutes(app, application);
  registerMemoryRoutes(app, application);
  registerIngestionRoutes(app, application);
  registerKnowledgeRoutes(app, application);
}

function registerOpenApiRoutes(app: Hono): void {
  app.get('/api/v1/openapi.json', (context) => context.json(openApiDocument));
}

function registerWorkspaceRoutes(app: Hono): void {
  app.get('/api/v1/me', (context) => {
    const principal = localContext().principal;
    return context.json({ id: principal.id, type: principal.type });
  });

  app.get('/api/v1/workspaces', (context) => {
    return context.json({
      items: [{ id: LOCAL_WORKSPACE_ID, name: 'personal' }],
      nextCursor: null,
    });
  });
}

function registerSpaceRoutes(app: Hono, application: Application): void {
  app.get('/api/v1/spaces', async (context) => {
    const spaces = await application.ports.spaces.list({
      workspaceId: localContext().workspaceId,
    });
    const limit = Number(context.req.query('limit') ?? String(spaces.length));
    return context.json({ items: spaces.slice(0, limit), nextCursor: null });
  });

  app.post('/api/v1/spaces', async (context) => {
    const id = requestId(context.req.header(REQUEST_ID_HEADER));
    const parsed = spaceCreateBody.safeParse(await context.req.json());
    if (!parsed.success) {
      return context.json(errorBody('INVALID_BODY', 'name required', id), 400);
    }
    const ctx = localContext();
    const space: KnowledgeSpace = {
      id: asKnowledgeSpaceId(newId('ks')),
      workspaceId: ctx.workspaceId,
      ownerPrincipalId: ctx.principal.id,
      name: parsed.data.name,
      visibility: parsed.data.visibility ?? 'private',
    };
    await application.ports.spaces.insert({ workspaceId: ctx.workspaceId, space });
    return context.json({ ...space, requestId: id });
  });

  app.get(SPACE_BY_ID_ROUTE, async (context) => {
    const id = requestId(context.req.header(REQUEST_ID_HEADER));
    const space = await application.ports.spaces.get({
      workspaceId: localContext().workspaceId,
      spaceId: asKnowledgeSpaceId(context.req.param('spaceId')),
    });
    if (space === undefined) {
      return context.json(errorBody('NOT_FOUND', SPACE_NOT_FOUND, id), 404);
    }
    return context.json(space);
  });

  app.patch(SPACE_BY_ID_ROUTE, async (context) => {
    const id = requestId(context.req.header(REQUEST_ID_HEADER));
    const parsed = spaceUpdateBody.safeParse(await context.req.json());
    if (!parsed.success) {
      return context.json(errorBody('INVALID_BODY', 'invalid space update', id), 400);
    }
    const ctx = localContext();
    const spaceId = asKnowledgeSpaceId(context.req.param('spaceId'));
    const existing = await application.ports.spaces.get({
      workspaceId: ctx.workspaceId,
      spaceId,
    });
    if (existing === undefined) {
      return context.json(errorBody('NOT_FOUND', SPACE_NOT_FOUND, id), 404);
    }
    const updated: KnowledgeSpace = {
      ...existing,
      name: parsed.data.name ?? existing.name,
      visibility: parsed.data.visibility ?? existing.visibility,
    };
    await application.ports.spaces.update({ workspaceId: ctx.workspaceId, space: updated });
    return context.json({ ...updated, requestId: id });
  });

  app.delete(SPACE_BY_ID_ROUTE, async (context) => {
    const id = requestId(context.req.header(REQUEST_ID_HEADER));
    await application.ports.spaces.remove({
      workspaceId: localContext().workspaceId,
      spaceId: asKnowledgeSpaceId(context.req.param('spaceId')),
    });
    return context.json({ status: 'ok', requestId: id });
  });
}

function registerMemoryRoutes(app: Hono, application: Application): void {
  app.get('/api/v1/spaces/:spaceId/memories', async (context) => {
    const items = await application.ports.episodes.listRecent({
      workspaceId: localContext().workspaceId,
      knowledgeSpaceId: asKnowledgeSpaceId(context.req.param('spaceId')),
      limit: 50,
    });
    return context.json({ items, nextCursor: null });
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
}

function registerIngestionRoutes(app: Hono, application: Application): void {
  app.post('/api/v1/spaces/:spaceId/ingestions', async (context) => {
    const id = requestId(context.req.header(REQUEST_ID_HEADER));
    const parsed = ingestBody.safeParse(await context.req.json());
    if (!parsed.success) {
      return context.json(errorBody('INVALID_BODY', 'markdown or url required', id), 400);
    }
    const ctx = localContext();
    const spaceId = context.req.param('spaceId');
    if (parsed.data.url !== undefined) {
      assertSafeIngestionUrl(parsed.data.url);
    }
    const ingestions = application.ports.ingestions;
    if (parsed.data.idempotencyKey !== undefined) {
      const existing = await ingestions.findByIdempotencyKey({
        workspaceId: ctx.workspaceId,
        knowledgeSpaceId: asKnowledgeSpaceId(spaceId),
        idempotencyKey: parsed.data.idempotencyKey,
      });
      if (existing !== undefined) {
        return context.json({ ...existing, runId: existing.id, requestId: id });
      }
    }
    const runId = asIngestionRunId(newId('ing'));
    const run = {
      id: runId,
      workspaceId: ctx.workspaceId,
      knowledgeSpaceId: asKnowledgeSpaceId(spaceId),
      status: 'queued' as const,
      idempotencyKey: parsed.data.idempotencyKey,
      createdAt: application.ports.clock.now(),
    };
    await ingestions.insert({ workspaceId: ctx.workspaceId, run });
    if (parsed.data.url !== undefined) {
      const jobId = await enqueueJob(application, 'ingest-url', {
        spaceId,
        url: parsed.data.url,
        runId,
        idempotencyKey: parsed.data.idempotencyKey,
      });
      return context.json({
        status: 'queued',
        url: parsed.data.url,
        jobId,
        runId,
        requestId: id,
        idempotencyKey: parsed.data.idempotencyKey,
      });
    }
    await ingestions.updateStatus({
      workspaceId: ctx.workspaceId,
      runId,
      status: 'running',
    });
    try {
      const result = await application.knowledge?.ingestMarkdown(ctx, {
        spaceId,
        markdown: parsed.data.markdown ?? '',
      });
      await ingestions.updateStatus({
        workspaceId: ctx.workspaceId,
        runId,
        status: 'succeeded',
      });
      return context.json({
        status: 'succeeded',
        segments: result?.segments ?? 0,
        runId,
        requestId: id,
        idempotencyKey: parsed.data.idempotencyKey,
      });
    } catch (error) {
      await ingestions.updateStatus({
        workspaceId: ctx.workspaceId,
        runId,
        status: 'failed',
        errorCode: error instanceof Error ? error.message : 'INGEST_FAILED',
      });
      throw error;
    }
  });

  app.get('/api/v1/ingestions/:runId', async (context) => {
    const id = requestId(context.req.header(REQUEST_ID_HEADER));
    const run = await application.ports.ingestions.findById({
      workspaceId: localContext().workspaceId,
      runId: asIngestionRunId(context.req.param('runId')),
    });
    if (run === undefined) {
      return context.json(errorBody('NOT_FOUND', 'Ingestion run not found', id), 404);
    }
    return context.json({ ...run, runId: run.id, requestId: id });
  });
}

function registerKnowledgeRoutes(app: Hono, application: Application): void {
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

  app.get('/api/v1/spaces/:spaceId/decisions', async (context) => {
    const items = await application.ports.decisions.list({
      workspaceId: localContext().workspaceId,
      knowledgeSpaceId: asKnowledgeSpaceId(context.req.param('spaceId')),
    });
    return context.json({ items, nextCursor: null });
  });

  app.post('/api/v1/spaces/:spaceId/decisions', async (context) => {
    const id = requestId(context.req.header(REQUEST_ID_HEADER));
    const parsed = decisionBody.safeParse(await context.req.json());
    if (!parsed.success) {
      return context.json(errorBody('INVALID_BODY', 'action required', id), 400);
    }
    const ctx = localContext();
    const now = application.ports.clock.now();
    const spaceId = asKnowledgeSpaceId(context.req.param('spaceId'));
    const decision = createDecision({
      id: asDecisionId(newId('dec')),
      workspaceId: ctx.workspaceId,
      knowledgeSpaceId: spaceId,
      action: parsed.data.action,
      rationale: parsed.data.rationale ?? '',
      snapshot: {
        workspaceId: ctx.workspaceId,
        knowledgeSpaceId: spaceId,
        episodeIds: [],
        factIds: [],
        capturedAt: now,
      },
      createdAt: now,
      status: 'proposed',
    });
    await application.ports.decisions.record({ workspaceId: ctx.workspaceId, decision });
    return context.json({ ...decision, requestId: id });
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
}
