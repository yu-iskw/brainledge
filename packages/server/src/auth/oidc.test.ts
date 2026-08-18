import { describe, expect, it } from 'vitest';

import { validateOidcClaims, mapOidcSubjectToPrincipal, verifyJwtHeader } from './oidc.js';

describe('oidc claims', () => {
  it('accepts a fresh RS256 token shape', () => {
    const result = validateOidcClaims({
      issuer: 'https://idp.example',
      audience: 'brainledge',
      expiresAt: 2,
      now: 1,
      algorithm: 'RS256',
    });
    expect(result.ok).toBe(true);
  });

  it('rejects expired and unknown algorithms', () => {
    expect(
      validateOidcClaims({
        issuer: 'https://idp.example',
        audience: 'brainledge',
        expiresAt: 1,
        now: 2,
        algorithm: 'RS256',
      }).ok,
    ).toBe(false);
    expect(
      validateOidcClaims({
        issuer: 'https://idp.example',
        audience: 'brainledge',
        expiresAt: 2,
        now: 1,
        algorithm: 'none',
      }).ok,
    ).toBe(false);
  });

  it('maps OIDC subject to a sanitized principal id', () => {
    const mapped = mapOidcSubjectToPrincipal('user@example.com');
    expect(mapped).toEqual({
      id: 'principal_user_example_com',
      type: 'human',
      externalSubject: 'user@example.com',
    });
  });

  it('verifyJwtHeader allows RS256 and ES256 only', () => {
    expect(verifyJwtHeader('RS256').ok).toBe(true);
    expect(verifyJwtHeader('ES256').ok).toBe(true);
    expect(verifyJwtHeader('none').ok).toBe(false);
  });
});
