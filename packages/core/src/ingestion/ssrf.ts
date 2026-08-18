import dns from 'node:dns/promises';

const BLOCKED_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0', '[::1]']);

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return false;
  }
  const [a, b] = parts as [number, number, number, number];
  return (
    a === 10 ||
    a === 127 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254)
  );
}

function normalizeHostname(hostname: string): string {
  const lower = hostname.toLowerCase();
  return lower.startsWith('[') && lower.endsWith(']') ? lower.slice(1, -1) : lower;
}

function ipv4MappedToDotted(host: string): string | undefined {
  const dotted = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/u.exec(host);
  if (dotted?.[1] !== undefined) {
    return dotted[1];
  }
  const hex = /^::ffff:([0-9a-f]+):([0-9a-f]+)$/u.exec(host);
  if (hex === null) {
    return undefined;
  }
  const high = Number.parseInt(hex[1], 16);
  const low = Number.parseInt(hex[2], 16);
  if (Number.isNaN(high) || Number.isNaN(low)) {
    return undefined;
  }
  return `${String((high >> 8) & 255)}.${String(high & 255)}.${String((low >> 8) & 255)}.${String(low & 255)}`;
}

function isBlockedHost(rawHostname: string): boolean {
  const hostname = normalizeHostname(rawHostname);
  if (
    BLOCKED_HOSTS.has(hostname) ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    return true;
  }
  const mapped = ipv4MappedToDotted(hostname);
  if (mapped !== undefined) {
    return isPrivateIpv4(mapped);
  }
  if (hostname.includes(':')) {
    return (
      hostname === '::' ||
      hostname === '::1' ||
      hostname.startsWith('fe80:') ||
      hostname.startsWith('fc') ||
      hostname.startsWith('fd')
    );
  }
  return isPrivateIpv4(hostname);
}

export interface IngestResolvedAddress {
  readonly address: string;
  readonly family: number;
}

export type IngestLookup = (hostname: string) => Promise<readonly IngestResolvedAddress[]>;

export function assertSafeResolvedAddresses(addresses: readonly string[]): void {
  if (addresses.length === 0) {
    throw new Error('INGEST_URL_SSRF');
  }
  for (const address of addresses) {
    if (isBlockedHost(address)) {
      throw new Error('INGEST_URL_SSRF');
    }
  }
}

export async function resolveSafeIngestAddresses(
  hostname: string,
  lookup: IngestLookup = defaultIngestLookup,
): Promise<readonly IngestResolvedAddress[]> {
  const records = await lookup(hostname);
  assertSafeResolvedAddresses(records.map((record) => record.address));
  return records;
}

async function defaultIngestLookup(hostname: string): Promise<readonly IngestResolvedAddress[]> {
  return dns.lookup(hostname, { all: true });
}

export function assertSafeIngestionUrl(raw: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error('INGEST_URL_INVALID');
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('INGEST_URL_PROTOCOL');
  }
  if (isBlockedHost(parsed.hostname.toLowerCase())) {
    throw new Error('INGEST_URL_SSRF');
  }
  return parsed;
}

export function assertSafeRelativePath(relative: string): void {
  if (relative.includes('..') || pathIsAbsolute(relative)) {
    throw new Error('INGEST_PATH_TRAVERSAL');
  }
}

function pathIsAbsolute(relative: string): boolean {
  return relative.startsWith('/') || /^[A-Za-z]:[\\/]/u.test(relative);
}
