import { describe, expect, it } from 'vitest';

import {
  decisionBody,
  errorEnvelope,
  forgetQuery,
  ingestBody,
  recallBody,
  rememberBody,
  spaceCreateBody,
} from './schemas.js';

describe('http schemas', () => {
  it('parses rememberBody success and failure cases', () => {
    expect(rememberBody.safeParse({ content: 'Alice lives in Tokyo' })).toMatchObject({
      success: true,
      data: { content: 'Alice lives in Tokyo' },
    });
    expect(rememberBody.safeParse({ content: 'note', kind: 'note' })).toMatchObject({
      success: true,
      data: { content: 'note', kind: 'note' },
    });
    expect(rememberBody.safeParse({}).success).toBe(false);
    expect(rememberBody.safeParse({ content: '' }).success).toBe(false);
    expect(rememberBody.safeParse({ content: 'x', kind: 'memo' }).success).toBe(false);
  });

  it('parses recallBody success and failure cases', () => {
    expect(recallBody.safeParse({ query: 'Where does Alice live?' })).toMatchObject({
      success: true,
      data: { query: 'Where does Alice live?' },
    });
    expect(recallBody.safeParse({ query: 'Alice', limit: 10 })).toMatchObject({
      success: true,
      data: { query: 'Alice', limit: 10 },
    });
    expect(recallBody.safeParse({ query: '' }).success).toBe(true);
    expect(recallBody.safeParse({}).success).toBe(false);
    expect(recallBody.safeParse({ query: 'Alice', limit: 0 }).success).toBe(false);
    expect(recallBody.safeParse({ query: 'Alice', limit: 101 }).success).toBe(false);
    expect(recallBody.safeParse({ query: 'Alice', limit: 1.5 }).success).toBe(false);
  });

  it('parses ingestBody success and failure cases', () => {
    expect(ingestBody.safeParse({ markdown: '# Notes' })).toMatchObject({
      success: true,
      data: { markdown: '# Notes' },
    });
    expect(ingestBody.safeParse({ url: 'https://example.com' })).toMatchObject({
      success: true,
      data: { url: 'https://example.com' },
    });
    expect(
      ingestBody.safeParse({
        markdown: '# Notes',
        url: 'https://example.com',
        idempotencyKey: 'k1',
      }),
    ).toMatchObject({
      success: true,
      data: { markdown: '# Notes', url: 'https://example.com', idempotencyKey: 'k1' },
    });
    expect(ingestBody.safeParse({}).success).toBe(false);
    expect(ingestBody.safeParse({ markdown: '' }).success).toBe(false);
    expect(ingestBody.safeParse({ url: '' }).success).toBe(false);
  });

  it('parses forgetQuery success and failure cases', () => {
    expect(forgetQuery.safeParse({})).toMatchObject({ success: true, data: {} });
    expect(forgetQuery.safeParse({ mode: 'hide' })).toMatchObject({
      success: true,
      data: { mode: 'hide' },
    });
    expect(forgetQuery.safeParse({ mode: 'delete' }).success).toBe(true);
    expect(forgetQuery.safeParse({ mode: 'retract' }).success).toBe(true);
    expect(forgetQuery.safeParse({ mode: 'purge' }).success).toBe(true);
    expect(forgetQuery.safeParse({ mode: 'wipe' }).success).toBe(false);
  });

  it('parses spaceCreateBody success and failure cases', () => {
    expect(spaceCreateBody.safeParse({ name: 'team' })).toMatchObject({
      success: true,
      data: { name: 'team' },
    });
    expect(spaceCreateBody.safeParse({ name: 'team', visibility: 'workspace' })).toMatchObject({
      success: true,
      data: { name: 'team', visibility: 'workspace' },
    });
    expect(spaceCreateBody.safeParse({}).success).toBe(false);
    expect(spaceCreateBody.safeParse({ name: '' }).success).toBe(false);
    expect(spaceCreateBody.safeParse({ name: 'team', visibility: 'public' }).success).toBe(false);
  });

  it('parses decisionBody success and failure cases', () => {
    expect(decisionBody.safeParse({ action: 'approve' })).toMatchObject({
      success: true,
      data: { action: 'approve' },
    });
    expect(
      decisionBody.safeParse({ action: 'approve', rationale: 'matches policy' }),
    ).toMatchObject({
      success: true,
      data: { action: 'approve', rationale: 'matches policy' },
    });
    expect(decisionBody.safeParse({}).success).toBe(false);
    expect(decisionBody.safeParse({ action: '' }).success).toBe(false);
  });

  it('parses errorEnvelope success and failure cases', () => {
    expect(
      errorEnvelope.safeParse({
        error: { code: 'INTERNAL', message: 'Internal error', requestId: 'req_1' },
      }),
    ).toMatchObject({
      success: true,
      data: {
        error: { code: 'INTERNAL', message: 'Internal error', requestId: 'req_1' },
      },
    });
    expect(errorEnvelope.safeParse({}).success).toBe(false);
    expect(
      errorEnvelope.safeParse({ error: { code: 'INTERNAL', message: 'Internal error' } }).success,
    ).toBe(false);
  });
});
