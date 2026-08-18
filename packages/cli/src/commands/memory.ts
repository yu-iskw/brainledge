import { LOCAL_SPACE_ID, localContext, type ForgetMode } from '@brainledge/core';
import { openStandalone } from '@brainledge/storage';

import { initDataDir, resolveDataDir } from '../data-dir.js';

type FetchImpl = typeof fetch;

export function cmdInit(dataDirFlag?: string): string {
  const dataDir = resolveDataDir(dataDirFlag);
  initDataDir(dataDir);
  const handle = openStandalone(dataDir);
  handle.close();
  return dataDir;
}

function resolveApiToken(explicit?: string): string | undefined {
  if (explicit !== undefined && explicit.length > 0) {
    return explicit;
  }
  const fromEnv = process.env.BRAINLEDGE_API_TOKEN;
  return fromEnv !== undefined && fromEnv.length > 0 ? fromEnv : undefined;
}

function formatRecall(result: {
  readonly memories: readonly { readonly content: string }[];
  readonly facts?: readonly { readonly summary: string }[];
}): string {
  if (result.memories.length === 0) {
    return 'No memories found.';
  }
  const memories = result.memories.map((hit) => hit.content).join('\n---\n');
  const facts = result.facts;
  if (facts === undefined || facts.length === 0) {
    return memories;
  }
  return `${memories}\n\nFacts:\n${facts.map((hit) => hit.summary).join('\n')}`;
}

function jsonHeaders(apiToken?: string): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = resolveApiToken(apiToken);
  if (typeof token === 'string') {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function failedStatusMessage(action: string, status: number): string {
  if (status === 401) {
    return `${action} failed: 401 unauthorized. Pass --token or set BRAINLEDGE_API_TOKEN.`;
  }
  return `${action} failed: ${String(status)}`;
}

export async function cmdRemember(
  content: string,
  dataDirFlag?: string,
  serverUrl?: string,
  fetchImpl?: FetchImpl,
  apiToken?: string,
): Promise<string> {
  if (serverUrl !== undefined && serverUrl.length > 0) {
    const fetchFn = fetchImpl ?? fetch;
    const response = await fetchFn(`${serverUrl}/api/v1/spaces/${LOCAL_SPACE_ID}/memories`, {
      method: 'POST',
      headers: jsonHeaders(apiToken),
      body: JSON.stringify({ content }),
    });
    if (!response.ok) {
      throw new Error(failedStatusMessage('remember', response.status));
    }
    const body = (await response.json()) as { episodeId: string };
    return body.episodeId;
  }
  const dataDir = resolveDataDir(dataDirFlag);
  initDataDir(dataDir);
  const handle = openStandalone(dataDir);
  try {
    const result = await handle.application.memory.remember(localContext(), {
      spaceId: LOCAL_SPACE_ID,
      content,
    });
    return result.episodeId;
  } finally {
    handle.close();
  }
}

export async function cmdRecall(
  query: string,
  dataDirFlag?: string,
  serverUrl?: string,
  fetchImpl?: FetchImpl,
  apiToken?: string,
): Promise<string> {
  if (serverUrl !== undefined && serverUrl.length > 0) {
    const fetchFn = fetchImpl ?? fetch;
    const response = await fetchFn(`${serverUrl}/api/v1/spaces/${LOCAL_SPACE_ID}/recall`, {
      method: 'POST',
      headers: jsonHeaders(apiToken),
      body: JSON.stringify({ query }),
    });
    if (!response.ok) {
      throw new Error(failedStatusMessage('recall', response.status));
    }
    const body = (await response.json()) as {
      memories: { content: string }[];
      facts?: { summary: string }[];
    };
    return formatRecall(body);
  }
  const dataDir = resolveDataDir(dataDirFlag);
  const handle = openStandalone(dataDir);
  try {
    const result = await handle.application.memory.recall(localContext(), {
      spaceId: LOCAL_SPACE_ID,
      query,
    });
    return formatRecall(result);
  } finally {
    handle.close();
  }
}

export function parseForgetMode(raw: string | undefined): ForgetMode {
  const mode = raw ?? 'hide';
  if (mode === 'hide' || mode === 'delete' || mode === 'retract' || mode === 'purge') {
    return mode;
  }
  throw new Error('forget --mode must be hide, delete, retract, or purge');
}

export async function cmdForget(
  memoryId: string,
  dataDirFlag?: string,
  mode: ForgetMode = 'hide',
  serverUrl?: string,
  fetchImpl?: FetchImpl,
  apiToken?: string,
): Promise<string> {
  if (memoryId.length === 0) {
    throw new Error('forget requires a memory id');
  }
  if (serverUrl !== undefined && serverUrl.length > 0) {
    const fetchFn = fetchImpl ?? fetch;
    const response = await fetchFn(
      `${serverUrl}/api/v1/spaces/${LOCAL_SPACE_ID}/memories/${memoryId}?mode=${mode}`,
      {
        method: 'DELETE',
        headers: jsonHeaders(apiToken),
      },
    );
    if (!response.ok) {
      throw new Error(failedStatusMessage('forget', response.status));
    }
    return `forgot ${memoryId} (${mode})`;
  }
  const dataDir = resolveDataDir(dataDirFlag);
  const handle = openStandalone(dataDir);
  try {
    await handle.application.memory.forget(localContext(), {
      spaceId: LOCAL_SPACE_ID,
      memoryId,
      mode,
    });
    return `forgot ${memoryId} (${mode})`;
  } finally {
    handle.close();
  }
}

export async function cmdConsolidate(
  dataDirFlag?: string,
  serverUrl?: string,
  fetchImpl?: FetchImpl,
  apiToken?: string,
): Promise<string> {
  if (serverUrl !== undefined && serverUrl.length > 0) {
    const fetchFn = fetchImpl ?? fetch;
    const response = await fetchFn(`${serverUrl}/api/v1/spaces/${LOCAL_SPACE_ID}/consolidate`, {
      method: 'POST',
      headers: jsonHeaders(apiToken),
    });
    if (!response.ok) {
      throw new Error(failedStatusMessage('consolidate', response.status));
    }
    const body = (await response.json()) as { factCount: number };
    return `consolidated ${String(body.factCount)} facts`;
  }
  const dataDir = resolveDataDir(dataDirFlag);
  const handle = openStandalone(dataDir);
  try {
    const result = await handle.application.memory.consolidate(localContext(), {
      spaceId: LOCAL_SPACE_ID,
    });
    return `consolidated ${String(result.factCount)} facts`;
  } finally {
    handle.close();
  }
}
