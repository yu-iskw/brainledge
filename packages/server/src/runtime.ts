import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  LOCAL_SPACE_ID,
  MAX_INGEST_BYTES,
  asIngestionRunId,
  assertSafeIngestionUrl,
  localContext,
  runQueuedJobs,
  type Application,
  type IngestionRepository,
  type JobRecord,
} from '@brainledge/core';
import { openStandalone } from '@brainledge/storage';
import { serve } from '@hono/node-server';

import { createHttpApp } from './http/app.js';
import { DEFAULT_UI_HTML } from './http/default-ui.js';
import { htmlToReadableText } from './ingest/html-to-text.js';
import { readTextCapped } from './ingest/read-capped.js';
import { defaultListenHost, defaultListenPort, prepareListen } from './listen.js';

function loadUiBundle(explicit?: string): { html: string; assetRoot?: string } {
  if (explicit !== undefined && explicit.length > 0) {
    if (explicit.startsWith('<')) {
      return { html: explicit };
    }
    const htmlPath = explicit;
    const html = readFileSync(htmlPath, 'utf8');
    const assetRoot = path.join(path.dirname(htmlPath), 'assets');
    return { html, assetRoot: existsSync(assetRoot) ? assetRoot : undefined };
  }
  const fromEnv = process.env.BRAINLEDGE_UI_HTML;
  if (fromEnv !== undefined && fromEnv.length > 0) {
    return loadUiBundle(fromEnv);
  }
  const bundled = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../web/dist/index.html',
  );
  if (existsSync(bundled)) {
    const assetRoot = path.join(path.dirname(bundled), 'assets');
    return {
      html: readFileSync(bundled, 'utf8'),
      assetRoot: existsSync(assetRoot) ? assetRoot : undefined,
    };
  }
  return { html: DEFAULT_UI_HTML };
}

export function loadUiHtml(explicit?: string): string {
  return loadUiBundle(explicit).html;
}

export function createStandaloneJobHandlers(
  application: Application,
  fetchImpl: typeof fetch = fetch,
): Readonly<Record<string, (job: JobRecord) => Promise<void>>> {
  return {
    async consolidate(job) {
      const payload = JSON.parse(job.payloadJson) as { spaceId?: string };
      await application.memory.consolidate(localContext(), {
        spaceId: payload.spaceId ?? LOCAL_SPACE_ID,
      });
    },
    async 'ingest-url'(job) {
      const payload = JSON.parse(job.payloadJson) as {
        spaceId?: string;
        url?: string;
        runId?: string;
      };
      if (payload.url === undefined || payload.url.length === 0) {
        throw new Error('ingest-url job missing url');
      }
      const ctx = localContext();
      const ingestions: IngestionRepository = application.ports.ingestions;
      const runId = payload.runId === undefined ? undefined : asIngestionRunId(payload.runId);
      if (runId !== undefined) {
        await ingestions.updateStatus({
          workspaceId: ctx.workspaceId,
          runId,
          status: 'running',
        });
      }
      try {
        assertSafeIngestionUrl(payload.url);
        const response = await fetchImpl(payload.url, {
          redirect: 'error',
          signal: AbortSignal.timeout(30_000),
        });
        if (!response.ok) {
          throw new Error(`ingest-url HTTP ${String(response.status)}`);
        }
        const contentType = response.headers.get('content-type') ?? '';
        const raw = await readTextCapped(response, MAX_INGEST_BYTES);
        const markdown = htmlToReadableText(raw, contentType);
        await application.knowledge?.ingestMarkdown(ctx, {
          spaceId: payload.spaceId ?? LOCAL_SPACE_ID,
          markdown,
        });
        if (runId !== undefined) {
          await ingestions.updateStatus({
            workspaceId: ctx.workspaceId,
            runId,
            status: 'succeeded',
          });
        }
      } catch (error) {
        if (runId !== undefined) {
          await ingestions.updateStatus({
            workspaceId: ctx.workspaceId,
            runId,
            status: 'failed',
            errorCode: error instanceof Error ? error.message : 'INGEST_URL_FAILED',
          });
        }
        throw error;
      }
    },
  };
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  if (isAborted(signal)) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const onAbort = (): void => {
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
    if (isAborted(signal)) {
      onAbort();
    }
  });
}

function isAborted(signal?: AbortSignal): boolean {
  return signal !== undefined && signal.aborted;
}

export async function runStandaloneWorker(
  application: Application,
  options?: { once?: boolean; pollMs?: number; fetchImpl?: typeof fetch; signal?: AbortSignal },
): Promise<number> {
  const handlers = createStandaloneJobHandlers(application, options?.fetchImpl);
  const once =
    options?.once === true ||
    (options?.signal === undefined && process.env.BRAINLEDGE_WORKER_ONCE === '1');
  const signal = options?.signal;
  let total = 0;
  for (;;) {
    if (isAborted(signal)) {
      return total;
    }
    const processed = await runQueuedJobs(application.ports.jobs, handlers);
    total += processed;
    if (once || isAborted(signal)) {
      return total;
    }
    if (processed === 0) {
      await delay(options?.pollMs ?? 1000, signal);
    }
  }
}

export function startStandaloneHttpServer(dataDir: string): { close: () => void } {
  prepareListen();
  const handle = openStandalone(dataDir);
  const ui = loadUiBundle();
  const app = createHttpApp(handle.application, {
    apiToken: process.env.BRAINLEDGE_API_TOKEN,
    uiHtml: ui.html,
    uiAssetRoot: ui.assetRoot,
  });
  const hostname = defaultListenHost();
  const port = defaultListenPort();
  const server = serve({ fetch: app.fetch, hostname, port });
  const workerAbort = new AbortController();
  void runStandaloneWorker(handle.application, {
    signal: workerAbort.signal,
    pollMs: 1000,
  }).catch((error: unknown) => {
    if (workerAbort.signal.aborted || (error instanceof Error && error.name === 'AbortError')) {
      return;
    }
    console.error(error);
  });
  console.log(`Brainledge listening on ${hostname}:${port}`);
  return {
    close() {
      workerAbort.abort();
      server.close();
      handle.close();
    },
  };
}
