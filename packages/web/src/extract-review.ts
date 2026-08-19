import { apiPost } from './api.js';
import { formatFactSentence } from './display.js';
import { byId } from './dom.js';

import type { ProposedFact } from './types.js';

const ACCEPT_ALL_ID = 'extract-accept-all';
const SKIP_ALL_ID = 'extract-skip';
const CONSOLIDATE_BUTTON_ID = 'consolidate-button';
const PROPOSED_LIST_ID = 'extract-proposed';
const ROW_ACTION_SELECTOR = '.extract-accept-one, .extract-skip-one';

interface ConsolidateResponse {
  readonly factCount: number;
  readonly proposed?: readonly ProposedFact[];
  readonly status?: string;
}

interface ExtractReviewDeps {
  readonly inspectStatusId: string;
  readonly noNewFacts: string;
  spacePath: (path: string) => string;
  setStatus: (id: string, text: string) => void;
  loadSpaceProjections: () => Promise<void>;
  safeCall: <T>(
    action: () => Promise<T>,
    options?: { onError?: (message: string) => void },
  ) => Promise<T | undefined>;
}

export function proposedFactKey(fact: ProposedFact): string {
  return `${fact.subjectId}|${fact.predicateId}|${fact.objectText}|${fact.sourceEpisodeId}`;
}

export function bindExtractReview(deps: ExtractReviewDeps): {
  previewExtract: () => Promise<void>;
  acceptExtract: () => Promise<void>;
  skipExtract: () => void;
} {
  let pendingProposed: ProposedFact[] = [];
  let extractBusy = false;

  const setExtractBusy = (busy: boolean): void => {
    extractBusy = busy;
    byId<HTMLButtonElement>(ACCEPT_ALL_ID).disabled = busy;
    byId<HTMLButtonElement>(SKIP_ALL_ID).disabled = busy;
    byId<HTMLButtonElement>(CONSOLIDATE_BUTTON_ID).disabled = busy;
    for (const button of document.querySelectorAll<HTMLButtonElement>(ROW_ACTION_SELECTOR)) {
      button.disabled = busy;
    }
  };

  const renderProposedFacts = (proposed: readonly ProposedFact[]): void => {
    pendingProposed = [...proposed];
    const list = byId<HTMLUListElement>(PROPOSED_LIST_ID);
    const accept = byId<HTMLButtonElement>(ACCEPT_ALL_ID);
    const skip = byId<HTMLButtonElement>(SKIP_ALL_ID);
    list.replaceChildren();
    const hasProposed = pendingProposed.length > 0;
    accept.hidden = !hasProposed;
    skip.hidden = !hasProposed;
    if (!hasProposed) {
      const item = document.createElement('li');
      item.className = 'meta';
      item.textContent = deps.noNewFacts;
      list.append(item);
      return;
    }
    for (const fact of pendingProposed) {
      list.append(proposedFactRow(fact, acceptProposed, skipProposed));
    }
  };

  const persistAccepted = async (
    accepted: readonly ProposedFact[],
  ): Promise<number | undefined> => {
    const result = await deps.safeCall(
      () => apiPost<ConsolidateResponse>(deps.spacePath('/consolidate'), { accept: accepted }),
      { onError: (message) => deps.setStatus(deps.inspectStatusId, message) },
    );
    if (!result) {
      return undefined;
    }
    await deps.loadSpaceProjections();
    return result.factCount;
  };

  const previewExtract = async (): Promise<void> => {
    if (extractBusy) {
      return;
    }
    setExtractBusy(true);
    deps.setStatus(deps.inspectStatusId, 'Extracting facts…');
    try {
      const result = await deps.safeCall(
        () => apiPost<ConsolidateResponse>(`${deps.spacePath('/consolidate')}?dryRun=1`, {}),
        { onError: (message) => deps.setStatus(deps.inspectStatusId, message) },
      );
      if (!result) {
        return;
      }
      const proposed = result.proposed ?? [];
      renderProposedFacts(proposed);
      if (proposed.length === 0) {
        deps.setStatus(deps.inspectStatusId, deps.noNewFacts);
        return;
      }
      deps.setStatus(deps.inspectStatusId, `Review ${String(proposed.length)} proposed facts`);
    } finally {
      setExtractBusy(false);
    }
  };

  const acceptExtract = async (): Promise<void> => {
    if (extractBusy) {
      return;
    }
    setExtractBusy(true);
    deps.setStatus(deps.inspectStatusId, 'Accepting facts…');
    const accepted = [...pendingProposed];
    try {
      const factCount = await persistAccepted(accepted);
      if (factCount === undefined) {
        return;
      }
      renderProposedFacts([]);
      deps.setStatus(
        deps.inspectStatusId,
        factCount === 0 ? deps.noNewFacts : `Extracted ${String(factCount)} facts`,
      );
    } finally {
      setExtractBusy(false);
    }
  };

  const acceptProposed = async (fact: ProposedFact): Promise<void> => {
    if (extractBusy) {
      return;
    }
    setExtractBusy(true);
    deps.setStatus(deps.inspectStatusId, 'Accepting fact…');
    try {
      const factCount = await persistAccepted([fact]);
      if (factCount === undefined) {
        return;
      }
      const remaining = pendingProposed.filter(
        (item) => proposedFactKey(item) !== proposedFactKey(fact),
      );
      renderProposedFacts(remaining);
      deps.setStatus(
        deps.inspectStatusId,
        remaining.length === 0
          ? `Extracted ${String(factCount)} facts`
          : `Accepted · ${String(remaining.length)} remaining`,
      );
    } finally {
      setExtractBusy(false);
    }
  };

  const skipProposed = (fact: ProposedFact): void => {
    if (extractBusy) {
      return;
    }
    const remaining = pendingProposed.filter(
      (item) => proposedFactKey(item) !== proposedFactKey(fact),
    );
    renderProposedFacts(remaining);
    deps.setStatus(
      deps.inspectStatusId,
      remaining.length === 0
        ? 'Skipped extraction'
        : `Skipped · ${String(remaining.length)} remaining`,
    );
  };

  const skipExtract = (): void => {
    if (extractBusy) {
      return;
    }
    renderProposedFacts([]);
    deps.setStatus(deps.inspectStatusId, 'Skipped extraction');
  };

  return { previewExtract, acceptExtract, skipExtract };
}

function proposedFactRow(
  fact: ProposedFact,
  onAccept: (item: ProposedFact) => Promise<void>,
  onSkip: (item: ProposedFact) => void,
): HTMLLIElement {
  const item = document.createElement('li');
  item.className = 'extract-proposed-item';
  const sentence = formatFactSentence({
    subjectId: fact.subjectId,
    predicateId: fact.predicateId,
    objectText: fact.objectText,
    summary: `${fact.subjectId} ${fact.predicateId} ${fact.objectText}`,
  });
  const text = document.createElement('p');
  text.className = 'extract-fact-text';
  text.textContent = fact.closes === undefined ? sentence : `${sentence} · closes ${fact.closes}`;
  const actions = document.createElement('div');
  actions.className = 'row extract-fact-actions';
  const acceptOne = document.createElement('button');
  acceptOne.type = 'button';
  acceptOne.className = 'extract-accept-one';
  acceptOne.textContent = 'Accept';
  acceptOne.addEventListener('click', (event) => {
    event.stopPropagation();
    void onAccept(fact);
  });
  const skipOne = document.createElement('button');
  skipOne.type = 'button';
  skipOne.className = 'extract-skip-one secondary';
  skipOne.textContent = 'Skip';
  skipOne.addEventListener('click', (event) => {
    event.stopPropagation();
    onSkip(fact);
  });
  actions.append(acceptOne, skipOne);
  item.append(text, actions);
  return item;
}
