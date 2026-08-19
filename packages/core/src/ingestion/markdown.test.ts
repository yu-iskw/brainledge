import { describe, expect, it } from 'vitest';

import { parseMarkdownDocument } from './markdown.js';

describe('parseMarkdownDocument', () => {
  it('takes the title from the first # heading', () => {
    const parsed = parseMarkdownDocument('# Cafe note\n\nAlice lives in Tokyo.');
    expect(parsed.title).toBe('Cafe note');
    expect(parsed.segments).toEqual(['Alice lives in Tokyo.']);
  });

  it('uses untitled when no # heading is present', () => {
    const parsed = parseMarkdownDocument('Alice lives in Tokyo.');
    expect(parsed.title).toBe('untitled');
    expect(parsed.segments).toEqual(['Alice lives in Tokyo.']);
  });

  it('drops heading-only segments when body text remains', () => {
    const parsed = parseMarkdownDocument('# Cafe note\n\n## Hours\n\nOpen daily.');
    expect(parsed.title).toBe('Cafe note');
    expect(parsed.segments).toEqual(['Open daily.']);
  });

  it('keeps the heading when that is the whole document', () => {
    const parsed = parseMarkdownDocument('# Title only');
    expect(parsed.title).toBe('Title only');
    expect(parsed.segments).toEqual(['# Title only']);
  });

  it('rejects payloads whose utf8 byte length exceeds 1_000_000', () => {
    expect(() => parseMarkdownDocument('x'.repeat(1_000_001))).toThrow('INGEST_TOO_LARGE');
  });
});
