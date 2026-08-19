import { describe, expect, it } from 'vitest';

import {
  createPostgresRepositoryStub,
  PostgresNotConfiguredError,
} from './postgres-repository.stub.js';

describe('postgres repository stub', () => {
  it('exposes the stub kind and rejects connect', async () => {
    const stub = createPostgresRepositoryStub();
    expect(stub.kind).toBe('postgres-stub');
    await expect(stub.connect()).rejects.toBeInstanceOf(PostgresNotConfiguredError);
    await expect(stub.connect()).rejects.toThrow(/DATABASE_URL/u);
  });
});
