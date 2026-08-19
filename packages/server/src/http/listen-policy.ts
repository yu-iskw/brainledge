import { isIP } from 'node:net';

interface ListenPolicy {
  readonly host: string;
  readonly port: number;
  readonly unsafeBind: boolean;
  readonly authenticationConfigured: boolean;
}

export function assertListenPolicy(policy: ListenPolicy): void {
  const loopback =
    policy.host === '127.0.0.1' || policy.host === '::1' || policy.host === 'localhost';
  if (loopback) {
    return;
  }
  if (!policy.unsafeBind) {
    throw new Error(
      `Refusing to bind ${policy.host}:${policy.port} without BRAINLEDGE_UNSAFE_BIND=1.`,
    );
  }
  if (!policy.authenticationConfigured) {
    throw new Error(
      `Refusing to bind ${policy.host}:${policy.port} without authentication. Set BRAINLEDGE_API_TOKEN.`,
    );
  }
  if (isIP(policy.host) === 0) {
    throw new Error(`Invalid bind host: ${policy.host}`);
  }
}
