const ALLOWED_JWT_ALGORITHMS = new Set(['RS256', 'ES256']);

export function verifyJwtHeader(alg: string): { readonly ok: boolean; readonly reason: string } {
  if (!ALLOWED_JWT_ALGORITHMS.has(alg)) {
    return { ok: false, reason: 'algorithm' };
  }
  return { ok: true, reason: 'ok' };
}

export function mapOidcSubjectToPrincipal(subject: string): {
  readonly id: string;
  readonly type: 'human';
  readonly externalSubject: string;
} {
  const sanitized = subject.replace(/[^a-zA-Z0-9_-]/gu, '_');
  return {
    id: `principal_${sanitized}`,
    type: 'human',
    externalSubject: subject,
  };
}

export function validateOidcClaims(input: {
  issuer: string;
  audience: string;
  expiresAt: number;
  now: number;
  algorithm: string;
  notBefore?: number;
}): { readonly ok: boolean; readonly reason: string } {
  const algCheck = verifyJwtHeader(input.algorithm);
  if (!algCheck.ok) {
    return { ok: false, reason: 'algorithm' };
  }
  if (input.issuer.length === 0 || input.audience.length === 0) {
    return { ok: false, reason: 'issuer-or-audience' };
  }
  if (input.expiresAt <= input.now) {
    return { ok: false, reason: 'expired' };
  }
  if (input.notBefore !== undefined && input.now < input.notBefore) {
    return { ok: false, reason: 'nbf' };
  }
  return { ok: true, reason: 'ok' };
}
