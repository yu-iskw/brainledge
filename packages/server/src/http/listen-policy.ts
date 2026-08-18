import { isIP } from 'node:net';

interface ListenPolicy {
  readonly host: string;
  readonly port: number;
  readonly allowNonLoopbackWithoutAuth: boolean;
}

export function assertListenPolicy(policy: ListenPolicy): void {
  const loopback =
    policy.host === '127.0.0.1' || policy.host === '::1' || policy.host === 'localhost';
  if (!loopback && !policy.allowNonLoopbackWithoutAuth) {
    throw new Error(
      `Refusing to bind ${policy.host}:${policy.port} without authentication. Use loopback or BRAINLEDGE_UNSAFE_BIND=1.`,
    );
  }
  if (policy.host !== 'localhost' && isIP(policy.host) === 0 && !loopback) {
    throw new Error(`Invalid bind host: ${policy.host}`);
  }
}
