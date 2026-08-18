import { assertListenPolicy } from './http/listen-policy.js';

export function defaultListenHost(): string {
  return process.env.BRAINLEDGE_HOST ?? '127.0.0.1';
}

export function defaultListenPort(): number {
  return Number(process.env.BRAINLEDGE_PORT ?? '8787');
}

export function prepareListen(): void {
  assertListenPolicy({
    host: defaultListenHost(),
    port: defaultListenPort(),
    allowNonLoopbackWithoutAuth: process.env.BRAINLEDGE_UNSAFE_BIND === '1',
  });
}
