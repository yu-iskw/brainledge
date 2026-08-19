import { describe, expect, it } from 'vitest';

import { AppError, isAppError } from './app-error.js';

describe('AppError', () => {
  it('defaults status to 400 and sets name, code, and message', () => {
    const error = new AppError('BAD_REQUEST', 'missing field');
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('AppError');
    expect(error.code).toBe('BAD_REQUEST');
    expect(error.message).toBe('missing field');
    expect(error.status).toBe(400);
  });

  it('honors an explicit status', () => {
    const error = new AppError('FORBIDDEN', 'nope', 403);
    expect(error.status).toBe(403);
    expect(error.code).toBe('FORBIDDEN');
  });
});

describe('isAppError', () => {
  it('returns true only for AppError instances', () => {
    expect(isAppError(new AppError('X', 'no'))).toBe(true);
    expect(isAppError(new Error('no'))).toBe(false);
    expect(isAppError({ code: 'X', status: 400, message: 'no' })).toBe(false);
    expect(isAppError(undefined)).toBe(false);
  });
});
