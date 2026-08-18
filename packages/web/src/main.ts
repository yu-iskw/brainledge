import { apiGet, apiPost, FetchError } from './api.js';

import type {
  Entity,
  Episode,
  Fact,
  IngestionResult,
  KnowledgeSpace,
  Principal,
  ProvenanceItem,
  RecallResult,
  Workspace,
} from './types.js';

const DEFAULT_SPACE_ID = 'ks_default';
const SPACES_STATUS_ID = 'spaces-status';
const MEMORIES_STATUS_ID = 'memories-status';
const INGESTION_STATUS_ID = 'ingestion-status';
const REMEMBER_STATUS_ID = 'remember-status';

const INGESTION_TERMINAL_STATUSES = new Set([
  'succeeded',
  'completed',
  'failed',
  'cancelled',
  'error',
]);

interface AppState {
  selectedSpaceId: string;
  principal: Principal | null;
  workspaces: readonly Workspace[];
  spaces: readonly KnowledgeSpace[];
  episodes: readonly Episode[];
  facts: readonly Fact[];
  entities: Map<string, string>;
  provenance: readonly ProvenanceItem[];
}

const state: AppState = {
  selectedSpaceId: DEFAULT_SPACE_ID,
  principal: null,
  workspaces: [],
  spaces: [],
  episodes: [],
  facts: [],
  entities: new Map(),
  provenance: [],
};

let ingestionPollTimer: ReturnType<typeof setInterval> | undefined;

function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (element === null) {
    throw new Error(`Missing element #${id}`);
  }
  return element as T;
}

function setText(id: string, text: string): void {
  byId<HTMLElement>(id).textContent = text;
}

function setStatus(id: string, text: string): void {
  setText(id, text);
}

function setGlobalError(message: string): void {
  setText('global-error', message);
}

function clearGlobalError(): void {
  setGlobalError('');
}

function formatError(error: unknown, fallback: string): string {
  if (error instanceof FetchError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

async function safeCall<T>(
  action: () => Promise<T>,
  options: { onError?: (message: string) => void; fallback?: string } = {},
): Promise<T | undefined> {
  try {
    return await action();
  } catch (error) {
    const message = formatError(error, options.fallback ?? 'Request failed');
    if (options.onError) {
      options.onError(message);
    } else {
      setGlobalError(message);
    }
    return undefined;
  }
}

function spacePath(path: string): string {
  return `/api/v1/spaces/${encodeURIComponent(state.selectedSpaceId)}${path}`;
}

function renderOverview(): void {
  const principal = state.principal;
  setText('overview-principal', principal ? `${principal.id} (${principal.type})` : 'Unknown');
  const space = state.spaces.find((item) => item.id === state.selectedSpaceId);
  setText('overview-space', space ? `${space.name} (${space.id})` : state.selectedSpaceId);
  setText('overview-episode-count', String(state.episodes.length));
  setText('overview-fact-count', String(state.facts.length));
}

function renderSpacesList(): void {
  const list = byId<HTMLUListElement>('spaces-list');
  list.replaceChildren();

  if (state.spaces.length === 0) {
    const item = document.createElement('li');
    item.textContent = 'No spaces yet.';
    list.append(item);
    return;
  }

  for (const space of state.spaces) {
    const item = document.createElement('li');
    if (space.id === state.selectedSpaceId) {
      item.classList.add('selected');
    }
    item.dataset.spaceId = space.id;

    const title = document.createElement('strong');
    title.textContent = space.name;

    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = `${space.id} · ${space.visibility}`;

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = space.id === state.selectedSpaceId ? 'Selected' : 'Select';
    button.disabled = space.id === state.selectedSpaceId;
    button.addEventListener('click', () => {
      void selectSpace(space.id);
    });

    item.append(title, meta, button);
    list.append(item);
  }
}

function renderEpisodeList(targetId: string, episodes: readonly Episode[]): void {
  const list = byId<HTMLUListElement>(targetId);
  list.replaceChildren();

  if (episodes.length === 0) {
    const item = document.createElement('li');
    item.textContent = 'No episodes yet.';
    list.append(item);
    return;
  }

  for (const episode of episodes) {
    const item = document.createElement('li');
    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = `${episode.observedAt}${episode.kind ? ` · ${episode.kind}` : ''} · ${episode.id}`;

    const content = document.createElement('p');
    content.textContent = episode.content;

    item.append(meta, content);
    list.append(item);
  }
}

function renderProvenance(): void {
  const list = byId<HTMLUListElement>('provenance-list');
  list.replaceChildren();

  if (state.provenance.length === 0) {
    const item = document.createElement('li');
    item.textContent = 'No provenance items yet.';
    list.append(item);
    return;
  }

  for (const entry of state.provenance) {
    const item = document.createElement('li');
    item.textContent = `${entry.episodeId} → ${entry.relation}`;
    list.append(item);
  }
}

function entityLabel(entityId: string): string {
  return state.entities.get(entityId) ?? entityId;
}

function formatFactObject(object: Fact['object']): string {
  if ('entity' in object) {
    return entityLabel(object.entity.entityId);
  }
  return String(object.value);
}

function renderGraph(): void {
  const list = byId<HTMLUListElement>('graph-list');
  list.replaceChildren();

  if (state.facts.length === 0) {
    const item = document.createElement('li');
    item.textContent = 'No facts yet. Run consolidate or ingest knowledge to populate the graph.';
    list.append(item);
    return;
  }

  for (const fact of state.facts) {
    const item = document.createElement('li');
    const triple = `${entityLabel(fact.subject.entityId)} → ${fact.predicate.id} → ${formatFactObject(fact.object)}`;
    item.textContent = triple;

    if (fact.status) {
      const meta = document.createElement('div');
      meta.className = 'meta';
      meta.textContent = `${fact.id} · ${fact.status}`;
      item.append(meta);
    }

    list.append(item);
  }
}

function renderAll(): void {
  renderOverview();
  renderSpacesList();
  renderEpisodeList('memory-list', state.episodes);
  renderEpisodeList('timeline-list', state.episodes);
  renderProvenance();
  renderGraph();
}

async function loadPrincipal(): Promise<void> {
  const principal = await safeCall(() => apiGet<Principal>('/api/v1/me'), {
    onError: (message) => setStatus('overview-status', message),
  });
  if (principal) {
    state.principal = principal;
  }
}

async function loadWorkspaces(): Promise<void> {
  const result = await safeCall(() => apiGet<{ items: Workspace[] }>('/api/v1/workspaces'), {
    onError: () => undefined,
  });
  if (result) {
    state.workspaces = result.items;
  }
}

async function loadSpaces(): Promise<void> {
  const result = await safeCall(() => apiGet<{ items: KnowledgeSpace[] }>('/api/v1/spaces'), {
    onError: (message) => setStatus(SPACES_STATUS_ID, message),
  });
  if (!result) {
    return;
  }
  state.spaces = result.items;
  if (!state.spaces.some((space) => space.id === state.selectedSpaceId)) {
    state.selectedSpaceId = state.spaces[0]?.id ?? state.selectedSpaceId;
  }
}

async function loadTimeline(): Promise<void> {
  const result = await safeCall(() => apiGet<{ items: Episode[] }>(spacePath('/timeline')), {
    onError: (message) => {
      setStatus(MEMORIES_STATUS_ID, message);
      setStatus('timeline-status', message);
    },
  });
  if (result) {
    state.episodes = result.items;
    setStatus(MEMORIES_STATUS_ID, '');
    setStatus('timeline-status', '');
  }
}

async function loadFactsAndEntities(): Promise<void> {
  const factsResult = await safeCall(() => apiGet<{ items: Fact[] }>(spacePath('/facts')), {
    onError: (message) => setStatus('graph-status', message),
  });
  if (factsResult) {
    state.facts = factsResult.items;
    setStatus('graph-status', '');
  }

  const entitiesResult = await safeCall(() => apiGet<{ items: Entity[] }>(spacePath('/entities')), {
    onError: () => undefined,
  });
  if (entitiesResult) {
    state.entities = new Map(
      entitiesResult.items.map((entity) => [entity.id, entity.canonicalName]),
    );
  }
}

async function loadProvenance(): Promise<void> {
  const result = await safeCall(
    () => apiGet<{ items: ProvenanceItem[] }>(spacePath('/provenance')),
    { onError: (message) => setStatus('provenance-status', message) },
  );
  if (result) {
    state.provenance = result.items;
    setStatus('provenance-status', '');
  }
}

async function loadMemoryListFallback(): Promise<void> {
  if (state.episodes.length > 0) {
    return;
  }
  const result = await safeCall(
    () => apiPost<RecallResult>(spacePath('/recall'), { query: '', limit: 50 }),
    { onError: (message) => setStatus(MEMORIES_STATUS_ID, message) },
  );
  if (!result) {
    return;
  }
  state.episodes = result.memories.map((hit) => ({
    id: hit.episodeId,
    content: hit.content,
    observedAt: hit.observedAt ?? '',
  }));
}

async function loadSpaceProjections(): Promise<void> {
  await loadTimeline();
  await loadMemoryListFallback();
  await Promise.all([loadFactsAndEntities(), loadProvenance()]);
  renderAll();
}

async function selectSpace(spaceId: string): Promise<void> {
  clearGlobalError();
  state.selectedSpaceId = spaceId;
  setStatus(SPACES_STATUS_ID, `Selected ${spaceId}`);
  await loadSpaceProjections();
}

async function bootstrap(): Promise<void> {
  clearGlobalError();
  await Promise.all([loadPrincipal(), loadWorkspaces(), loadSpaces()]);
  renderAll();
  await loadSpaceProjections();
}

async function remember(): Promise<void> {
  const input = byId<HTMLTextAreaElement>('remember-input');
  setStatus(REMEMBER_STATUS_ID, 'Saving…');
  const result = await safeCall(
    () =>
      apiPost<{ episodeId: string }>(spacePath('/memories'), {
        content: input.value,
      }),
    { onError: (message) => setStatus(REMEMBER_STATUS_ID, message) },
  );
  if (!result) {
    return;
  }
  setStatus(REMEMBER_STATUS_ID, `Saved ${result.episodeId}`);
  input.value = '';
  await loadSpaceProjections();
}

async function recall(): Promise<void> {
  const input = byId<HTMLInputElement>('recall-input');
  const output = byId<HTMLPreElement>('recall-output');
  output.textContent = 'Searching…';

  const result = await safeCall(
    () =>
      apiPost<RecallResult>(spacePath('/recall'), {
        query: input.value,
      }),
    {
      onError: (message) => {
        output.textContent = message;
      },
    },
  );
  if (!result) {
    return;
  }

  const memories = result.memories.map((hit) => hit.content).join('\n---\n');
  const facts = result.facts.map((hit) => hit.summary).join('\n');
  output.textContent = memories.length > 0 ? memories : 'No memories found.';
  if (facts.length > 0) {
    output.textContent += `\n\nFacts:\n${facts}`;
  }
  if (result.provenanceSummary && result.provenanceSummary.length > 0) {
    const provenance = result.provenanceSummary
      .map((item) => `${item.episodeId} → ${item.relation}`)
      .join('\n');
    output.textContent += `\n\nProvenance:\n${provenance}`;
  }
}

function stopIngestionPoll(): void {
  if (ingestionPollTimer !== undefined) {
    clearInterval(ingestionPollTimer);
    ingestionPollTimer = undefined;
  }
}

function ingestionRunId(result: IngestionResult): string | undefined {
  return result.runId ?? result.jobId ?? result.requestId;
}

async function pollIngestion(runId: string): Promise<void> {
  const result = await safeCall(
    () => apiGet<IngestionResult>(`/api/v1/ingestions/${encodeURIComponent(runId)}`),
    { onError: (message) => setStatus(INGESTION_STATUS_ID, message) },
  );
  if (!result) {
    stopIngestionPoll();
    return;
  }

  const detail = result.errorCode ? ` (${result.errorCode})` : '';
  setStatus(INGESTION_STATUS_ID, `Run ${runId}: ${result.status}${detail}`);

  if (INGESTION_TERMINAL_STATUSES.has(result.status)) {
    stopIngestionPoll();
    await loadSpaceProjections();
  }
}

function startIngestionPoll(runId: string): void {
  stopIngestionPoll();
  void pollIngestion(runId);
  ingestionPollTimer = setInterval(() => {
    void pollIngestion(runId);
  }, 2000);
}

async function ingestMarkdown(): Promise<void> {
  const markdown = byId<HTMLTextAreaElement>('ingest-markdown').value;
  setStatus(INGESTION_STATUS_ID, 'Submitting…');

  const result = await safeCall(
    () => apiPost<IngestionResult>(spacePath('/ingestions'), { markdown }),
    { onError: (message) => setStatus(INGESTION_STATUS_ID, message) },
  );
  if (!result) {
    return;
  }

  const segments = result.segments !== undefined ? ` · ${result.segments} segments` : '';
  setStatus(INGESTION_STATUS_ID, `Status: ${result.status}${segments}`);

  const runId = ingestionRunId(result);
  if (runId) {
    startIngestionPoll(runId);
  } else if (
    result.status === 'queued' ||
    result.status === 'completed' ||
    result.status === 'succeeded'
  ) {
    await loadSpaceProjections();
  }
}

async function createSpace(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const nameInput = byId<HTMLInputElement>('space-name-input');
  const name = nameInput.value.trim();
  if (name.length === 0) {
    setStatus(SPACES_STATUS_ID, 'Space name is required.');
    return;
  }

  setStatus(SPACES_STATUS_ID, 'Creating…');
  const result = await safeCall(
    () =>
      apiPost<KnowledgeSpace>('/api/v1/spaces', {
        name,
        visibility: 'private',
      }),
    { onError: (message) => setStatus(SPACES_STATUS_ID, message) },
  );
  if (!result) {
    return;
  }

  nameInput.value = '';
  setStatus(SPACES_STATUS_ID, `Created ${result.name} (${result.id})`);
  await loadSpaces();
  await selectSpace(result.id);
}

function bindEvents(): void {
  byId<HTMLButtonElement>('remember-button').addEventListener('click', () => {
    void remember();
  });
  byId<HTMLButtonElement>('recall-button').addEventListener('click', () => {
    void recall();
  });
  byId<HTMLButtonElement>('ingest-button').addEventListener('click', () => {
    void ingestMarkdown();
  });
  byId<HTMLFormElement>('spaces-create-form').addEventListener('submit', (event) => {
    void createSpace(event);
  });
  byId<HTMLInputElement>('recall-input').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      void recall();
    }
  });
}

void bootstrap().catch((error: unknown) => {
  setGlobalError(formatError(error, 'Failed to initialize the UI'));
});

bindEvents();
