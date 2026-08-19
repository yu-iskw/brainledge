import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

const BANNED = ['hono', 'pg', 'react', 'better-sqlite3', '@anthropic-ai/sdk', 'openai'];

function walkTsFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkTsFiles(full));
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
      files.push(full);
    }
  }
  return files;
}

describe('architecture guards', () => {
  it('core package.json does not depend on adapters', () => {
    const pkg = JSON.parse(readFileSync(path.join(packageRoot, 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const merged = { ...pkg.dependencies, ...pkg.devDependencies };
    for (const name of BANNED) {
      expect(merged[name]).toBeUndefined();
    }
  });

  it('source does not import adapter frameworks', () => {
    const src = path.join(packageRoot, 'src');
    for (const file of walkTsFiles(src)) {
      const text = readFileSync(file, 'utf8');
      expect(text.includes("from 'hono'")).toBe(false);
      expect(text.includes("from 'node:sqlite'")).toBe(false);
      expect(text.includes("from 'pg'")).toBe(false);
    }
  });
});
