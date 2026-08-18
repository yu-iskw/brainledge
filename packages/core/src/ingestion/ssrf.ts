const BLOCKED_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0', '[::1]']);

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return false;
  }
  const [a, b] = parts as [number, number, number, number];
  return a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
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
  const host = parsed.hostname.toLowerCase();
  if (
    BLOCKED_HOSTS.has(host) ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    isPrivateIpv4(host)
  ) {
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
