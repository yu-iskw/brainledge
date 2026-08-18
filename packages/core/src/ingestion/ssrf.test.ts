import { describe, expect, it } from 'vitest';

import { parseMarkdownDocument } from './markdown.js';
import { assertSafeIngestionUrl, assertSafeRelativePath } from './ssrf.js';

describe('ingestion safety', () => {
  it('rejects loopback URLs and path traversal', () => {
    expect(() => assertSafeIngestionUrl('http://127.0.0.1/secret')).toThrow(/SSRF/u);
    expect(() => assertSafeRelativePath('../etc/passwd')).toThrow(/TRAVERSAL/u);
    expect(() => assertSafeIngestionUrl('https://example.com/doc.md')).not.toThrow();
    expect(() => assertSafeIngestionUrl('not a url')).toThrow(/INVALID/u);
    expect(() => assertSafeIngestionUrl('ftp://example.com/a')).toThrow(/PROTOCOL/u);
    expect(() => assertSafeIngestionUrl('http://10.0.0.1/x')).toThrow(/SSRF/u);
    expect(() => assertSafeIngestionUrl('http://files.local/x')).toThrow(/SSRF/u);
    expect(() => assertSafeIngestionUrl('http://169.254.169.254/latest/meta-data')).toThrow(
      /SSRF/u,
    );
    expect(() => assertSafeIngestionUrl('http://[::ffff:127.0.0.1]/secret')).toThrow(/SSRF/u);
  });

  it('segments markdown', () => {
    const parsed = parseMarkdownDocument('# Title\n\nHello\n\nWorld');
    expect(parsed.title).toBe('Title');
    expect(parsed.segments).toEqual(['Hello', 'World']);
  });

  it('keeps a heading-only document as a single segment', () => {
    const parsed = parseMarkdownDocument('# Title only');
    expect(parsed.title).toBe('Title only');
    expect(parsed.segments).toEqual(['# Title only']);
  });
});
