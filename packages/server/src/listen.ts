import { assertListenPolicy } from './http/listen-policy.js';

export function defaultListenHost(): string {
  return process.env.BRAINLEDGE_HOST ?? '127.0.0.1';
}

export function defaultListenPort(): number {
  return Number(process.env.BRAINLEDGE_PORT ?? '8787');
}

export function prepareListen(): void {
  const apiToken = process.env.BRAINLEDGE_API_TOKEN;
  assertListenPolicy({
    host: defaultListenHost(),
    port: defaultListenPort(),
    unsafeBind: process.env.BRAINLEDGE_UNSAFE_BIND === '1',
    authenticationConfigured:
      (apiToken !== undefined && apiToken.length > 0) ||
      (process.env.OIDC_ISSUER !== undefined && process.env.OIDC_ISSUER.length > 0),
  });
}
