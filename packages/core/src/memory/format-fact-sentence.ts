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
