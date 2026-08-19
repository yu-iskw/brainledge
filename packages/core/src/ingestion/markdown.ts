export const MAX_INGEST_BYTES = 1_000_000;

export function parseMarkdownDocument(raw: string): {
  readonly title: string;
  readonly segments: readonly string[];
} {
  if (Buffer.byteLength(raw, 'utf8') > MAX_INGEST_BYTES) {
    throw new Error('INGEST_TOO_LARGE');
  }
  const normalized = raw.replaceAll('\r\n', '\n').trim();
  const lines = normalized.split('\n');
  const heading = lines.find((line) => line.startsWith('# '));
  const title = heading === undefined ? 'untitled' : heading.slice(2).trim();
  const segments = normalized
    .split(/\n{2,}/u)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  const body = segments.filter((part) => !isHeadingOnlySegment(part));
  return { title, segments: body.length === 0 ? segments : body };
}

function isHeadingOnlySegment(part: string): boolean {
  return /^#{1,6}\s+\S[^\n]*$/u.test(part);
}
