import { describe, expect, it } from 'vitest';

import { htmlToReadableText } from './html-to-text.js';

describe('htmlToReadableText', () => {
  it('returns markdown and plain text unchanged aside from trim', () => {
    expect(htmlToReadableText('  # Hello  ', 'text/markdown; charset=utf-8')).toBe('# Hello');
    expect(htmlToReadableText('<html>keep</html>', 'text/plain')).toBe('<html>keep</html>');
  });

  it('strips HTML into readable text and prefers the title heading', () => {
    const readable = htmlToReadableText(
      '<html><head><title>Example</title></head><body><p>Hello from the web</p></body></html>',
      'text/html',
    );
    expect(readable.startsWith('# Example')).toBe(true);
    expect(readable).toContain('Hello from the web');
    expect(readable).not.toContain('<html');
    expect(readable).not.toContain('<p>');
  });

  it('strips script and style, decodes entities, and treats many tags as HTML', () => {
    const readable = htmlToReadableText(
      '<div>A&nbsp;&amp;&lt;B&gt;&quot;</div><span></span><section><style>p{color:red}</style><script>alert(1)</script>Hi</section>',
    );
    expect(readable).toContain('A &<B>"');
    expect(readable).toContain('Hi');
    expect(readable).not.toContain('alert');
    expect(readable).not.toContain('color:red');
  });

  it('returns trimmed original text when the body is not HTML', () => {
    expect(htmlToReadableText('  just a note  ')).toBe('just a note');
  });
});
