import type { ApiError } from './types.js';

export class FetchError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'FetchError';
    this.status = status;
    this.code = code;
  }
}

interface ErrorBody {
  readonly error?: ApiError;
  readonly message?: string;
}

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text.length === 0) {
    return {};
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { message: text };
  }
}

function errorMessage(body: unknown, fallback: string): string {
  if (body !== null && typeof body === 'object') {
    const record = body as ErrorBody;
    if (record.error?.message) {
      return record.error.message;
    }
    if (typeof record.message === 'string') {
      return record.message;
    }
  }
  return fallback;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, { ...init, credentials: 'same-origin' });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Network request failed';
    throw new FetchError(message, 0);
  }

  const body = await parseJson(response);
  if (!response.ok) {
    const record = body as ErrorBody;
    throw new FetchError(
      errorMessage(body, `Request failed (${response.status})`),
      response.status,
      record.error?.code,
    );
  }
  return body as T;
}

export function apiGet<T>(path: string): Promise<T> {
  return apiFetch<T>(path);
}

export function apiPost<T>(path: string, payload: unknown): Promise<T> {
  return apiFetch<T>(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function apiDelete<T>(path: string): Promise<T> {
  return apiFetch<T>(path, { method: 'DELETE' });
}
