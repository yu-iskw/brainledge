/**
 * PostgreSQL adapter (enterprise). Methods throw until DATABASE_URL is configured.
 * Contract tests use the in-memory/sqlite factories; this module keeps the port compiled.
 */

// Ambient `pg` types for the optional dependency. Keep the reference so tsc
// resolves `import('pg')` without installing @types/pg.
// eslint-disable-next-line @typescript-eslint/triple-slash-reference -- shim
/// <reference path="./pg-shim.d.ts" />

export function isPostgresConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return typeof env.DATABASE_URL === 'string' && env.DATABASE_URL.length > 0;
}

export function postgresListenSql(): string {
  return 'LISTEN brainledge_jobs';
}

export function postgresClaimJobSql(): string {
  return `
    UPDATE jobs
    SET status = 'running', attempts = attempts + 1
    WHERE id = (
      SELECT id FROM jobs WHERE status = 'queued' ORDER BY created_at
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    RETURNING *;
  `;
}

export function postgresLexicalSql(column = 'content'): string {
  return `to_tsvector('english', ${column}) @@ plainto_tsquery('english', $1)`;
}

export async function tryCreatePgPool(
  env: NodeJS.ProcessEnv = process.env,
): Promise<
  | { query: (sql: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }> }
  | undefined
> {
  if (!isPostgresConfigured(env)) {
    return undefined;
  }
  try {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: env.DATABASE_URL });
    return {
      query(sql: string, params?: unknown[]) {
        return pool.query(sql, params).then((result: { rows: Record<string, unknown>[] }) => ({
          rows: result.rows,
        }));
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`PostgreSQL configured but unavailable: ${message}`);
  }
}
