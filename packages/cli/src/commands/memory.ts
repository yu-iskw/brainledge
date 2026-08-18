import { LOCAL_SPACE_ID, localContext } from '@brainledge/core';
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

export async function cmdRemember(
  content: string,
  dataDirFlag?: string,
  serverUrl?: string,
  fetchImpl?: FetchImpl,
): Promise<string> {
  if (serverUrl !== undefined && serverUrl.length > 0) {
    const fetchFn = fetchImpl ?? fetch;
    const response = await fetchFn(`${serverUrl}/api/v1/spaces/${LOCAL_SPACE_ID}/memories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    if (!response.ok) {
      throw new Error(`remember failed: ${response.status}`);
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
): Promise<string> {
  if (serverUrl !== undefined && serverUrl.length > 0) {
    const fetchFn = fetchImpl ?? fetch;
    const response = await fetchFn(`${serverUrl}/api/v1/spaces/${LOCAL_SPACE_ID}/recall`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    if (!response.ok) {
      throw new Error(`recall failed: ${response.status}`);
    }
    const body = (await response.json()) as { memories: { content: string }[] };
    if (body.memories.length === 0) {
      return 'No memories found.';
    }
    return body.memories.map((hit) => hit.content).join('\n---\n');
  }
  const dataDir = resolveDataDir(dataDirFlag);
  const handle = openStandalone(dataDir);
  try {
    const result = await handle.application.memory.recall(localContext(), {
      spaceId: LOCAL_SPACE_ID,
      query,
    });
    if (result.memories.length === 0) {
      return 'No memories found.';
    }
    return result.memories.map((hit) => hit.content).join('\n---\n');
  } finally {
    handle.close();
  }
}
