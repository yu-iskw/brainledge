const HTML_TAG_THRESHOLD = 3;

type ReadableBodyKind = 'passthrough' | 'html';

function classifyBody(text: string, contentType: string): ReadableBodyKind {
  const type = contentType.toLowerCase();
  if (type.includes('markdown') || type.includes('text/plain')) {
    return 'passthrough';
  }
  return looksLikeHtml(text) ? 'html' : 'passthrough';
}

function countHtmlTags(text: string, max: number): number {
  const tag = /<[a-z][\w:-]*\b[^>]*>/giu;
  let count = 0;
  while (tag.exec(text) !== null) {
    count += 1;
    if (count >= max) {
      return count;
    }
  }
  return count;
}

function looksLikeHtml(text: string): boolean {
  const lower = text.toLowerCase();
  if (lower.includes('<html') || lower.includes('<!doctype') || lower.includes('<body')) {
    return true;
  }
  return countHtmlTags(text, HTML_TAG_THRESHOLD) >= HTML_TAG_THRESHOLD;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/giu, ' ')
    .replace(/&lt;/giu, '<')
    .replace(/&gt;/giu, '>')
    .replace(/&quot;/giu, '"')
    .replace(/&amp;/giu, '&');
}

function htmlDocumentToText(html: string): string {
  const titleMatch = /<title\b[^>]*>([\s\S]*?)<\/title>/iu.exec(html);
  const title = titleMatch?.[1] === undefined ? undefined : decodeEntities(titleMatch[1]).trim();
  const withoutChrome = html
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/giu, ' ')
    .replace(/<title\b[^>]*>[\s\S]*?<\/title>/giu, ' ');
  const collapsed = decodeEntities(withoutChrome.replace(/<[^>]+>/gu, ' '))
    .replace(/\s+/gu, ' ')
    .trim();
  if (title !== undefined && title.length > 0) {
    return `# ${title}\n\n${collapsed}`.trim();
  }
  return collapsed;
}

export function htmlToReadableText(html: string, contentType?: string): string {
  const kind = classifyBody(html, contentType ?? '');
  switch (kind) {
    case 'passthrough':
      return html.trim();
    case 'html':
      return htmlDocumentToText(html);
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}
