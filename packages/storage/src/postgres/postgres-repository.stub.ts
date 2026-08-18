export class PostgresNotConfiguredError extends Error {
  constructor() {
    super('PostgreSQL adapter is not configured. Set DATABASE_URL for enterprise profile.');
    this.name = 'PostgresNotConfiguredError';
  }
}

export function createPostgresRepositoryStub(): {
  readonly kind: 'postgres-stub';
  connect(): Promise<never>;
} {
  return {
    kind: 'postgres-stub',
    connect() {
      return Promise.reject(new PostgresNotConfiguredError());
    },
  };
}
