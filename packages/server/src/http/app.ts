import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import {
  hashLocalApiToken,
  localContext,
  verifyLocalApiToken,
  type Application,
} from '@brainledge/core';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';

import { parseMcpProfiles } from '../mcp/profiles.js';
import { MCP_PROTOCOL_VERSION, toMcpV2Request } from '../mcp/protocol.js';
import { createBrainledgeMcpHandler } from '../mcp/server.js';
import { formatRequestLog } from '../observability/log.js';

import { DEFAULT_UI_HTML } from './default-ui.js';
import {
  errorBody,
  mapError,
  requestId,
  REQUEST_ID_HEADER,
  type ErrorBody,
} from './http-shared.js';
import { openApiDocument, REQUIRED_OPENAPI_PATHS } from './openapi.js';
import { registerRestApi } from './rest.js';

export { openApiDocument, REQUIRED_OPENAPI_PATHS };

export interface CreateHttpAppOptions {
  readonly apiToken?: string;
  readonly uiHtml?: string;
  readonly uiAssetRoot?: string;
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

  app.get('/assets/:file', (context) => {
    const root = options?.uiAssetRoot;
    if (root === undefined) {
      return context.notFound();
    }
    const file = context.req.param('file');
    if (file.includes('..') || file.includes('/') || file.includes('\\')) {
      return context.notFound();
    }
    const fullPath = path.join(root, file);
    if (!existsSync(fullPath)) {
      return context.notFound();
    }
    const extension = path.extname(file);
    const contentType =
      extension === '.js'
        ? 'text/javascript; charset=utf-8'
        : extension === '.css'
          ? 'text/css; charset=utf-8'
          : 'application/octet-stream';
    return context.body(readFileSync(fullPath), 200, { 'content-type': contentType });
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

  registerRestApi(app, application);

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
