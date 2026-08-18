import './styles.css';

import { apiDelete, apiGet, apiPost, FetchError } from './api.js';
import {
  comparableFactText,
  formatFactSentence,
  formatIngestStatus,
  formatObservedAt,
  formatOperatorLabel,
  formatProvenanceLabel,
  formatSavedStatus,
  humanizeEntityId,
  humanizePredicate,
  spaceInitial,
} from './display.js';
import { byId, setText } from './dom.js';
import { buildKnowledgeGraph } from './graph-model.js';
import { bindKnowledgeGraph } from './graph-view.js';
import { formatRecallFacts } from './recall-format.js';
import { activateMode, bindWorkbenchTabs } from './shell.js';

import type { GraphPalette } from './graph-draw.js';
import type { GraphViewHandle } from './graph-view.js';
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
const OVERVIEW_STATUS_ID = 'overview-status';
const INSPECT_STATUS_ID = 'inspect-status';
const LOADING_MEMORIES_STATUS = 'Loading memories…';
const EMPTY_CAPTURE_TITLE = 'Nothing captured yet';
const EMPTY_CAPTURE_STREAM = 'Add a note or ingest a document to start this space.';
const EMPTY_TIMELINE_TITLE = 'No episodes yet';
const EMPTY_TIMELINE = 'Captured notes and ingests appear here in order.';
const EMPTY_FACTS = 'Select an episode and run Extract facts.';
const EMPTY_RECEIPTS = 'Widen the question or capture more about this topic.';
const MEMORY_LIST_ID = 'memory-list';
const TIMELINE_LIST_ID = 'timeline-list';
const SPACES_CREATE_FORM_ID = 'spaces-create-form';
const NEW_SPACE_TOGGLE_ID = 'new-space-toggle';

const INGESTION_TERMINAL_STATUSES = new Set([
  'succeeded',
  'completed',
  'failed',
  'cancelled',
  'error',
]);

interface AppState {
  selectedSpaceId: string;
  selectedEpisodeId: string | undefined;
  principal: Principal | null;
  workspaces: readonly Workspace[];
  spaces: readonly KnowledgeSpace[];
  episodes: readonly Episode[];
  timeline: readonly Episode[];
  facts: readonly Fact[];
  entities: Map<string, string>;
  provenance: readonly ProvenanceItem[];
}

const state: AppState = {
  selectedSpaceId: DEFAULT_SPACE_ID,
  selectedEpisodeId: undefined,
  principal: null,
  workspaces: [],
  spaces: [],
  episodes: [],
  timeline: [],
  facts: [],
  entities: new Map(),
  provenance: [],
};

let ingestionPollTimer: ReturnType<typeof setInterval> | undefined;
let graphView: GraphViewHandle | undefined;

function cssColor(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value.length > 0 ? value : fallback;
}

function graphPalette(): GraphPalette {
  return {
    ink: cssColor('--ink', '#15202b'),
    muted: cssColor('--muted', '#667788'),
    surface: cssColor('--surface', '#ffffff'),
    accent: cssColor('--accent', '#3d7ea6'),
    brass: cssColor('--brass', '#c4a35a'),
    paper: cssColor('--paper', '#eef1f5'),
    border: cssColor('--border', '#d5dde4'),
  };
}

function graphHost(): Window & { brainledgeGraph?: GraphViewHandle } {
  return window;
}

function ensureGraphView(): GraphViewHandle {
  if (graphView !== undefined) {
    return graphView;
  }
  graphView = bindKnowledgeGraph(
    byId<HTMLCanvasElement>('knowledge-graph'),
    graphPalette(),
    (node, episodeId) => {
      if (episodeId !== undefined) {
        state.selectedEpisodeId = episodeId;
        renderDossier();
        renderEpisodeList(TIMELINE_LIST_ID, state.timeline, EMPTY_TIMELINE_TITLE, EMPTY_TIMELINE);
      }
      const graph = buildKnowledgeGraph(state.facts, state.entities);
      const counts = `${String(graph.nodes.length)} nodes · ${String(graph.edges.length)} edges`;
      setText('graph-caption', node === undefined ? counts : `${counts} · ${node.label}`);
    },
  );
  graphHost().brainledgeGraph = graphView;
  return graphView;
}

function paintKnowledgeMap(): void {
  const graph = buildKnowledgeGraph(state.facts, state.entities);
  const empty = byId<HTMLElement>('graph-empty');
  const canvas = byId<HTMLCanvasElement>('knowledge-graph');
  empty.hidden = graph.nodes.length > 0;
  canvas.hidden = graph.nodes.length === 0;
  setText(
    'graph-caption',
    graph.nodes.length === 0
      ? ''
      : `${String(graph.nodes.length)} nodes · ${String(graph.edges.length)} edges`,
  );
  if (graph.nodes.length === 0) {
    return;
  }
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      ensureGraphView().setGraph(graph.nodes, graph.edges);
    });
  });
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

function entityLabel(entityId: string): string {
  return state.entities.get(entityId) ?? humanizeEntityId(entityId);
}

function formatFactObject(object: Fact['object']): string {
  if ('entity' in object) {
    return entityLabel(object.entity.entityId);
  }
  return String(object.value);
}

function factSentence(fact: Fact): string {
  return formatFactSentence({
    subjectId: fact.subject.entityId,
    predicateId: fact.predicate.id,
    objectText: formatFactObject(fact.object),
    summary: `${entityLabel(fact.subject.entityId)} ${humanizePredicate(fact.predicate.id)} ${formatFactObject(fact.object)}`,
  });
}

function selectedSpace(): KnowledgeSpace | undefined {
  return state.spaces.find((item) => item.id === state.selectedSpaceId);
}

function renderOverviewIdentity(): void {
  const principal = state.principal;
  const operator = formatOperatorLabel(principal?.type);
  const workspace = state.workspaces[0]?.name;
  setText('overview-principal', workspace === undefined ? operator : `${operator} · ${workspace}`);
  const space = selectedSpace();
  const name = space?.name ?? 'Space';
  setText('overview-space', name);
  const badge = document.getElementById('space-initial');
  if (badge instanceof HTMLElement) {
    badge.textContent = spaceInitial(name);
  }
}

function renderOverview(): void {
  renderOverviewIdentity();
  setText('overview-episode-count', String(state.episodes.length));
  setText('overview-fact-count', String(state.facts.length));
}

function renderSpaceSelect(): void {
  const select = byId<HTMLSelectElement>('space-select');
  select.replaceChildren();
  for (const space of state.spaces) {
    const option = document.createElement('option');
    option.value = space.id;
    option.textContent = space.name;
    option.title = space.id;
    option.selected = space.id === state.selectedSpaceId;
    select.append(option);
  }
}

function appendEmptyState(parent: HTMLElement, title: string, copy: string): void {
  const item = document.createElement(parent instanceof HTMLUListElement ? 'li' : 'div');
  item.className = 'empty-state';
  const heading = document.createElement('p');
  heading.className = 'empty-state-title';
  heading.textContent = title;
  const body = document.createElement('p');
  body.className = 'empty-state-copy';
  body.textContent = copy;
  item.append(heading, body);
  parent.append(item);
}

function renderEpisodeList(
  targetId: string,
  episodes: readonly Episode[],
  emptyTitle: string,
  emptyText: string,
): void {
  const list = byId<HTMLUListElement>(targetId);
  list.replaceChildren();
  if (episodes.length === 0) {
    appendEmptyState(list, emptyTitle, emptyText);
    return;
  }
  for (const episode of episodes) {
    const item = document.createElement('li');
    item.title = episode.id;
    if (episode.id === state.selectedEpisodeId) {
      item.classList.add('selected');
    }
    const meta = document.createElement('div');
    meta.className = 'meta';
    const time = document.createElement('time');
    time.dateTime = episode.observedAt;
    time.textContent = formatObservedAt(episode.observedAt);
    meta.append(time);
    const kind = document.createElement('span');
    kind.className = 'pill';
    kind.textContent = episode.kind ?? 'note';
    meta.append(kind);
    const content = document.createElement('p');
    content.textContent = episode.content;
    item.append(meta, content);
    item.addEventListener('click', () => {
      state.selectedEpisodeId = episode.id;
      renderDossier();
      renderEpisodeList(MEMORY_LIST_ID, state.episodes, EMPTY_CAPTURE_TITLE, EMPTY_CAPTURE_STREAM);
      renderEpisodeList(TIMELINE_LIST_ID, state.timeline, EMPTY_TIMELINE_TITLE, EMPTY_TIMELINE);
    });
    list.append(item);
  }
}

function renderDossier(): void {
  const root = byId<HTMLElement>('inspect-dossier');
  root.replaceChildren();
  const episode = [...state.episodes, ...state.timeline].find(
    (item) => item.id === state.selectedEpisodeId,
  );
  if (episode === undefined) {
    appendEmptyState(
      root,
      'Select an episode',
      'Choose a note from the timeline to inspect sources.',
    );
    return;
  }
  const linkedFacts = state.facts.filter(
    (fact) => fact.sourceEpisodeId === state.selectedEpisodeId,
  );
  const content = document.createElement('p');
  content.className = 'dossier-content';
  content.textContent = episode.content;
  const asserted = document.createElement('p');
  asserted.className = 'meta';
  asserted.textContent = `Asserted ${formatObservedAt(episode.observedAt)}`;
  root.append(content, asserted);
  const extraFacts = linkedFacts.filter(
    (fact) => comparableFactText(factSentence(fact)) !== comparableFactText(episode.content),
  );
  if (linkedFacts.length === 0) {
    const hint = document.createElement('p');
    hint.className = 'meta';
    hint.textContent = EMPTY_FACTS;
    root.append(hint);
    return;
  }
  if (extraFacts.length === 0) {
    return;
  }
  const heading = document.createElement('p');
  heading.className = 'eyebrow';
  heading.textContent = 'Also extracted';
  const list = document.createElement('ul');
  list.className = 'data-list';
  for (const fact of extraFacts) {
    const item = document.createElement('li');
    item.textContent = factSentence(fact);
    list.append(item);
  }
  root.append(heading, list);
}

function renderGraph(): void {
  paintKnowledgeMap();
  const list = byId<HTMLUListElement>('graph-list');
  list.replaceChildren();
  if (state.facts.length === 0) {
    return;
  }
  for (const fact of state.facts) {
    const item = document.createElement('li');
    item.title = fact.id;
    const triple = document.createElement('p');
    triple.textContent = factSentence(fact);
    const meta = document.createElement('div');
    meta.className = 'meta';
    const world = [fact.validFrom, fact.validUntil]
      .filter((value): value is string => value !== undefined)
      .map((value) => formatObservedAt(value))
      .join(' → ');
    meta.textContent = `${world.length > 0 ? `World: ${world} · ` : ''}${fact.status ?? 'active'}`;
    item.append(triple, meta);
    item.addEventListener('click', () => {
      if (fact.sourceEpisodeId !== undefined) {
        state.selectedEpisodeId = fact.sourceEpisodeId;
        activateMode('inspect');
        renderDossier();
        renderEpisodeList(TIMELINE_LIST_ID, state.timeline, EMPTY_TIMELINE_TITLE, EMPTY_TIMELINE);
      }
    });
    list.append(item);
  }
}

function renderRecallReceipts(result: RecallResult): void {
  const list = byId<HTMLUListElement>('recall-receipts');
  list.replaceChildren();
  if (result.facts.length === 0) {
    appendEmptyState(list, 'No matching facts', EMPTY_RECEIPTS);
    return;
  }
  for (const hit of result.facts) {
    const item = document.createElement('li');
    item.textContent = formatRecallFacts([hit]);
    if (hit.factId !== undefined) {
      item.addEventListener('click', () => {
        const fact = state.facts.find((entry) => entry.id === hit.factId);
        state.selectedEpisodeId = fact?.sourceEpisodeId;
        activateMode('inspect');
        renderDossier();
      });
    }
    list.append(item);
  }
}

function renderProvenance(items: readonly ProvenanceItem[]): void {
  const list = byId<HTMLUListElement>('provenance-list');
  list.replaceChildren();
  if (items.length === 0) {
    const item = document.createElement('li');
    item.className = 'empty-state';
    item.textContent = 'No source notes for this recall.';
    list.append(item);
    return;
  }
  for (const entry of items) {
    const item = document.createElement('li');
    const source = [...state.episodes, ...state.timeline].find(
      (episode) => episode.id === entry.episodeId,
    );
    item.textContent = formatProvenanceLabel(source?.content);
    item.title = entry.episodeId;
    item.addEventListener('click', () => {
      state.selectedEpisodeId = entry.episodeId;
      activateMode('inspect');
      renderDossier();
    });
    list.append(item);
  }
}

function renderAll(): void {
  renderOverview();
  renderSpaceSelect();
  renderEpisodeList(MEMORY_LIST_ID, state.episodes, EMPTY_CAPTURE_TITLE, EMPTY_CAPTURE_STREAM);
  renderEpisodeList(TIMELINE_LIST_ID, state.timeline, EMPTY_TIMELINE_TITLE, EMPTY_TIMELINE);
  renderGraph();
  renderDossier();
}

async function loadPrincipal(): Promise<void> {
  const principal = await safeCall(() => apiGet<Principal>('/api/v1/me'), {
    onError: (message) => setGlobalError(message),
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
      setStatus('timeline-status', message);
    },
  });
  if (result) {
    state.timeline = result.items;
    setStatus('timeline-status', '');
  }
}

function asOfQuery(): string {
  const value = byId<HTMLInputElement>('as-of-input').value;
  if (value.length === 0) {
    return '';
  }
  return `?asOf=${encodeURIComponent(`${value}T23:59:59.000Z`)}`;
}

async function loadFactsAndEntities(): Promise<void> {
  const factsResult = await safeCall(
    () => apiGet<{ items: Fact[] }>(`${spacePath('/facts')}${asOfQuery()}`),
    { onError: (message) => setStatus('graph-status', message) },
  );
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

function isNotFound(error: unknown): boolean {
  return error instanceof FetchError && error.status === 404;
}

async function loadMemories(): Promise<void> {
  try {
    const result = await apiGet<{ items: Episode[] }>(spacePath('/memories'));
    state.episodes = result.items;
    setStatus(MEMORIES_STATUS_ID, '');
  } catch (error) {
    if (!isNotFound(error)) {
      setStatus(MEMORIES_STATUS_ID, formatError(error, 'Failed to load memories'));
      return;
    }
    await loadTimeline();
    state.episodes = state.timeline;
    await loadMemoryListFallback();
    if (state.episodes.length > 0) {
      setStatus(MEMORIES_STATUS_ID, '');
    }
  }
}

async function loadSpaceProjections(): Promise<void> {
  setStatus(OVERVIEW_STATUS_ID, LOADING_MEMORIES_STATUS);
  try {
    await loadMemories();
    await Promise.all([loadTimeline(), loadFactsAndEntities()]);
    renderAll();
  } finally {
    setStatus(OVERVIEW_STATUS_ID, '');
  }
}

async function selectSpace(spaceId: string): Promise<void> {
  clearGlobalError();
  state.selectedSpaceId = spaceId;
  state.selectedEpisodeId = undefined;
  setStatus(SPACES_STATUS_ID, '');
  await loadSpaceProjections();
}

async function bootstrap(): Promise<void> {
  clearGlobalError();
  await Promise.all([loadPrincipal(), loadWorkspaces(), loadSpaces()]);
  renderSpaceSelect();
  renderOverviewIdentity();
  setStatus(OVERVIEW_STATUS_ID, LOADING_MEMORIES_STATUS);
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
  setStatus(REMEMBER_STATUS_ID, formatSavedStatus());
  byId<HTMLParagraphElement>(REMEMBER_STATUS_ID).title = result.episodeId;
  input.value = '';
  state.selectedEpisodeId = result.episodeId;
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
  output.textContent = memories.length > 0 ? memories : 'No memories found.';
  renderRecallMemories(result);
  renderRecallReceipts(result);
  renderProvenance(result.provenanceSummary ?? []);
}

function renderRecallMemories(result: RecallResult): void {
  const list = byId<HTMLUListElement>('recall-memories');
  list.replaceChildren();
  if (result.memories.length === 0) {
    appendEmptyState(
      list,
      'Ask something',
      'Try a question about a person, place, or recent note.',
    );
    return;
  }
  for (const hit of result.memories) {
    const item = document.createElement('li');
    item.title = hit.episodeId;
    const content = document.createElement('p');
    content.textContent = hit.content;
    item.append(content);
    list.append(item);
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
  setStatus(INGESTION_STATUS_ID, formatIngestStatus(result.status, result.segments));
  byId<HTMLParagraphElement>(INGESTION_STATUS_ID).title = runId;
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

async function submitIngestion(payload: { markdown: string } | { url: string }): Promise<void> {
  setStatus(INGESTION_STATUS_ID, 'Submitting…');
  const result = await safeCall(() => apiPost<IngestionResult>(spacePath('/ingestions'), payload), {
    onError: (message) => setStatus(INGESTION_STATUS_ID, message),
  });
  if (!result) {
    return;
  }
  setStatus(INGESTION_STATUS_ID, formatIngestStatus(result.status, result.segments));
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
  byId<HTMLFormElement>(SPACES_CREATE_FORM_ID).hidden = true;
  byId<HTMLButtonElement>(NEW_SPACE_TOGGLE_ID).setAttribute('aria-expanded', 'false');
  setStatus(SPACES_STATUS_ID, `Created ${result.name}`);
  await loadSpaces();
  await selectSpace(result.id);
}

async function consolidate(): Promise<void> {
  setStatus(INSPECT_STATUS_ID, 'Extracting facts…');
  const result = await safeCall(
    () => apiPost<{ factCount: number }>(spacePath('/consolidate'), {}),
    { onError: (message) => setStatus(INSPECT_STATUS_ID, message) },
  );
  if (!result) {
    return;
  }
  setStatus(INSPECT_STATUS_ID, `Extracted ${String(result.factCount)} facts`);
  await loadSpaceProjections();
}

async function forgetSelected(): Promise<void> {
  const episodeId = state.selectedEpisodeId;
  if (episodeId === undefined) {
    setStatus(INSPECT_STATUS_ID, 'Select an episode first.');
    return;
  }
  setStatus(INSPECT_STATUS_ID, 'Hiding…');
  const result = await safeCall(
    () =>
      apiDelete<{ status: string }>(
        `${spacePath('/memories')}/${encodeURIComponent(episodeId)}?mode=hide`,
      ),
    { onError: (message) => setStatus(INSPECT_STATUS_ID, message) },
  );
  if (!result) {
    return;
  }
  setStatus(INSPECT_STATUS_ID, 'Episode hidden');
  state.selectedEpisodeId = undefined;
  await loadSpaceProjections();
}

function bindEvents(): void {
  bindWorkbenchTabs((mode) => {
    if (mode === 'inspect') {
      requestAnimationFrame(() => {
        paintKnowledgeMap();
      });
    }
  });
  byId<HTMLButtonElement>('graph-zoom-in').addEventListener('click', () => {
    ensureGraphView().zoomBy(1.18);
  });
  byId<HTMLButtonElement>('graph-zoom-out').addEventListener('click', () => {
    ensureGraphView().zoomBy(0.84);
  });
  byId<HTMLButtonElement>('graph-fit').addEventListener('click', () => {
    ensureGraphView().fit();
  });
  byId<HTMLButtonElement>('remember-button').addEventListener('click', () => {
    void remember();
  });
  byId<HTMLButtonElement>('recall-button').addEventListener('click', () => {
    void recall();
  });
  byId<HTMLButtonElement>('ingest-button').addEventListener('click', () => {
    void submitIngestion({ markdown: byId<HTMLTextAreaElement>('ingest-markdown').value });
  });
  byId<HTMLButtonElement>('ingest-url-button').addEventListener('click', () => {
    void submitIngestion({ url: byId<HTMLInputElement>('ingest-url').value });
  });
  byId<HTMLFormElement>(SPACES_CREATE_FORM_ID).addEventListener('submit', (event) => {
    void createSpace(event);
  });
  byId<HTMLSelectElement>('space-select').addEventListener('change', (event) => {
    const select = event.currentTarget;
    if (select instanceof HTMLSelectElement) {
      void selectSpace(select.value);
    }
  });
  byId<HTMLButtonElement>(NEW_SPACE_TOGGLE_ID).addEventListener('click', () => {
    const form = byId<HTMLFormElement>(SPACES_CREATE_FORM_ID);
    const toggle = byId<HTMLButtonElement>(NEW_SPACE_TOGGLE_ID);
    const open = form.hidden;
    form.hidden = !open;
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  byId<HTMLInputElement>('recall-input').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      void recall();
    }
  });
  byId<HTMLButtonElement>('consolidate-button').addEventListener('click', () => {
    void consolidate();
  });
  byId<HTMLButtonElement>('forget-button').addEventListener('click', () => {
    void forgetSelected();
  });
  byId<HTMLInputElement>('as-of-input').addEventListener('change', () => {
    void loadFactsAndEntities().then(() => {
      renderGraph();
      renderDossier();
      renderOverview();
    });
  });
}

void bootstrap().catch((error: unknown) => {
  setGlobalError(formatError(error, 'Failed to initialize the UI'));
});

bindEvents();
