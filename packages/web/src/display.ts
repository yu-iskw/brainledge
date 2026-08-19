export function humanizeEntityId(id: string): string {
  const stripped = id.replace(/^ent_/u, '').replaceAll('_', ' ').trim();
  if (stripped.length === 0) {
    return id;
  }
  return stripped
    .split(/\s+/u)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function humanizePredicate(id: string): string {
  const spaced = id.replace(/([a-z])([A-Z])/gu, '$1 $2').replaceAll('_', ' ');
  return spaced.toLowerCase();
}

export function formatObservedAt(iso: string): string {
  const millis = Date.parse(iso);
  if (Number.isNaN(millis)) {
    return iso;
  }
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(millis);
}

export function formatWorkspaceName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return 'This workspace';
  }
  if (/^[A-Z0-9][A-Z0-9 _-]{0,31}$/u.test(trimmed)) {
    return trimmed.charAt(0) + trimmed.slice(1).toLowerCase().replaceAll('_', ' ');
  }
  return trimmed;
}

export function formatOperatorLabel(principalType: string | undefined): string {
  if (principalType === 'local' || principalType === undefined) {
    return 'This device';
  }
  return principalType;
}

export function formatSavedStatus(): string {
  return 'Saved';
}

export function formatIngestStatus(status: string, segments?: number): string {
  const extra =
    segments === undefined
      ? ''
      : ` · ${String(segments)} ${segments === 1 ? 'segment' : 'segments'}`;
  switch (status) {
    case 'queued': {
      return `Ingest queued${extra}`;
    }
    case 'running': {
      return `Ingest running${extra}`;
    }
    case 'succeeded':
    case 'completed': {
      return `Ingest succeeded${extra}`;
    }
    case 'failed':
    case 'error': {
      return `Ingest failed${extra}`;
    }
    case 'cancelled': {
      return `Ingest cancelled${extra}`;
    }
    default: {
      return `Ingest ${status}${extra}`;
    }
  }
}

export function formatFactSentence(input: {
  readonly subjectId?: string;
  readonly predicateId?: string;
  readonly objectText?: string;
  readonly summary: string;
}): string {
  if (input.subjectId !== undefined && input.predicateId !== undefined) {
    const object = input.objectText?.trim() ?? '';
    const head = `${humanizeEntityId(input.subjectId)} ${humanizePredicate(input.predicateId)}`;
    return object.length > 0 ? `${head} ${object}` : head;
  }
  const tokens = input.summary.trim().split(/\s+/u);
  if (tokens.length < 2 || !tokens[0].startsWith('ent_')) {
    const object = input.objectText?.trim() ?? '';
    if (object.length > 0 && !input.summary.includes(object)) {
      return `${input.summary} · ${object}`;
    }
    return input.summary;
  }
  const rest = tokens.slice(2).join(' ');
  return formatFactSentence({
    subjectId: tokens[0],
    predicateId: tokens[1],
    objectText: rest.length > 0 ? rest : input.objectText,
    summary: input.summary,
  });
}

export function formatProvenanceLabel(content: string | undefined): string {
  if (content === undefined || content.trim().length === 0) {
    return 'From a remembered note';
  }
  const snippet = content.trim().replaceAll('\n', ' ');
  if (snippet.length <= 72) {
    return `From: ${snippet}`;
  }
  return `From: ${snippet.slice(0, 69)}…`;
}

export function comparableFactText(text: string): string {
  return text
    .trim()
    .replace(/[.?!]+$/u, '')
    .toLowerCase();
}

export function spaceInitial(name: string): string {
  const trimmed = name.trim();
  return trimmed.length === 0 ? 'S' : trimmed.charAt(0).toUpperCase();
}

export function modeHeading(mode: 'capture' | 'recall' | 'inspect'): string {
  switch (mode) {
    case 'capture': {
      return 'Capture';
    }
    case 'recall': {
      return 'Recall';
    }
    case 'inspect': {
      return 'Inspect';
    }
    default: {
      const exhaustive: never = mode;
      return exhaustive;
    }
  }
}
