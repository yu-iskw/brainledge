function throwIfTooLarge(size: number, maxBytes: number): void {
  if (size > maxBytes) {
    throw new Error('INGEST_TOO_LARGE');
  }
}

function chunkBytes(value: unknown): Uint8Array | undefined {
  return value instanceof Uint8Array ? value : undefined;
}

function streamChunk(result: unknown): Uint8Array | 'done' | 'skip' {
  if (typeof result !== 'object' || result === null || !('done' in result)) {
    return 'done';
  }
  if (result.done === true) {
    return 'done';
  }
  const value = 'value' in result ? chunkBytes(result.value) : undefined;
  return value ?? 'skip';
}

async function readStreamCapped(
  body: ReadableStream<Uint8Array>,
  maxBytes: number,
): Promise<string> {
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const chunk = streamChunk(await reader.read());
    if (chunk === 'done') {
      break;
    }
    if (chunk === 'skip') {
      continue;
    }
    total += chunk.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throwIfTooLarge(total, maxBytes);
    }
    chunks.push(chunk);
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const piece of chunks) {
    merged.set(piece, offset);
    offset += piece.byteLength;
  }
  return new TextDecoder().decode(merged);
}

export async function readTextCapped(response: Response, maxBytes: number): Promise<string> {
  const declared = response.headers.get('content-length');
  if (declared !== null) {
    const length = Number(declared);
    if (Number.isFinite(length)) {
      throwIfTooLarge(length, maxBytes);
    }
  }
  const body = response.body;
  if (body === null) {
    const text = await response.text();
    throwIfTooLarge(Buffer.byteLength(text, 'utf8'), maxBytes);
    return text;
  }
  return readStreamCapped(body, maxBytes);
}
