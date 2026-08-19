import { describe, expect, it } from 'vitest';

import {
  isPostgresConfigured,
  postgresClaimJobSql,
  postgresLexicalSql,
  postgresListenSql,
  tryCreatePgPool,
} from './postgres-adapter.js';

describe('postgres adapter', () => {
  it('exposes SKIP LOCKED claim SQL and reports configuration', () => {
    expect(postgresClaimJobSql()).toMatch(/SKIP LOCKED/u);
    expect(postgresListenSql()).toMatch(/LISTEN/u);
    expect(isPostgresConfigured({ DATABASE_URL: 'postgres://x' })).toBe(true);
    expect(isPostgresConfigured({})).toBe(false);
  });

  it('exposes lexical FTS SQL helper', () => {
    expect(postgresLexicalSql()).toMatch(/to_tsvector/u);
    expect(postgresLexicalSql('content')).toMatch(/plainto_tsquery/u);
  });

  it('returns undefined pool when DATABASE_URL is unset', async () => {
    const pool = await tryCreatePgPool({});
    expect(pool).toBeUndefined();
  });

  it('does not swallow a configured DATABASE_URL', async () => {
    try {
      const pool = await tryCreatePgPool({ DATABASE_URL: 'postgres://invalid' });
      expect(pool).toBeDefined();
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toMatch(/PostgreSQL configured/u);
    }
  });
});
