import {
  assertSafeIngestionUrl,
  assertSafeResolvedAddresses,
  resolveSafeIngestAddresses,
  type IngestLookup,
  type IngestResolvedAddress,
} from '@brainledge/core';
import { Agent, fetch as undiciFetch } from 'undici';

const INGEST_TIMEOUT_MS = 30_000;

export async function fetchPinnedIngestUrl(url: string, lookup?: IngestLookup): Promise<Response> {
  const parsed = assertSafeIngestionUrl(url);
  const records = await resolveSafeIngestAddresses(parsed.hostname, lookup);
  assertSafeResolvedAddresses(records.map((record) => record.address));
  const dispatcher = new Agent({
    connect: {
      lookup(_hostname, _options, callback) {
        const pinned: IngestResolvedAddress[] = [...records];
        callback(null, pinned);
      },
    },
  });
  try {
    return await undiciFetch(parsed, {
      redirect: 'error',
      signal: AbortSignal.timeout(INGEST_TIMEOUT_MS),
      dispatcher,
    });
  } finally {
    await dispatcher.close();
  }
}
