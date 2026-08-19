import { describe, expect, it } from 'vitest';

import { FetchError } from './api.js';

describe('FetchError', () => {
  it('exposes name, status, code, and message', () => {
    const error = new FetchError('not found', 404, 'NOT_FOUND');
    expect(error.name).toBe('FetchError');
    expect(error.status).toBe(404);
    expect(error.code).toBe('NOT_FOUND');
    expect(error.message).toBe('not found');
  });
});
