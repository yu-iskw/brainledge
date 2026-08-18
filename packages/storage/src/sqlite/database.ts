import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { SCHEMA_VERSION, SQLITE_SCHEMA } from './schema.js';

import type { UnitOfWork } from '@brainledge/core';

export function openSqliteDatabase(filePath: string): DatabaseSync {
  mkdirSync(path.dirname(filePath), { recursive: true });
  const database = new DatabaseSync(filePath);
  database.exec(SQLITE_SCHEMA);
  const row = database.prepare('SELECT version FROM schema_metadata LIMIT 1').get() as
    { version: number } | undefined;
  if (row === undefined) {
    database.prepare('INSERT INTO schema_metadata (version) VALUES (?)').run(SCHEMA_VERSION);
  }
  return database;
}

export function createSqliteUnitOfWork(database: DatabaseSync): UnitOfWork {
  return {
    async run<T>(work: () => Promise<T>): Promise<T> {
      database.exec('BEGIN IMMEDIATE');
      try {
        const result = await work();
        database.exec('COMMIT');
        return result;
      } catch (error) {
        database.exec('ROLLBACK');
        throw error;
      }
    },
  };
}
