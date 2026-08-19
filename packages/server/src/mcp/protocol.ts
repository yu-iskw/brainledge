import {
  CLIENT_CAPABILITIES_META_KEY,
  CLIENT_INFO_META_KEY,
  PROTOCOL_VERSION_META_KEY,
} from '@modelcontextprotocol/server';

export const MCP_PROTOCOL_VERSION = '2026-07-28';
const MCP_PROTOCOL_VERSION_HEADER = 'mcp-protocol-version';
const MCP_METHOD_HEADER = 'mcp-method';
const MCP_NAME_HEADER = 'mcp-name';

const DEFAULT_CLIENT_INFO = { name: 'brainledge', version: '0.1.0' };
const DEFAULT_CLIENT_CAPABILITIES = { tools: {} };

interface JsonRpcEnvelope {
  jsonrpc?: string;
  id?: number | string;
  method?: string;
  params?: {
    name?: string;
    arguments?: Record<string, unknown>;
    _meta?: Record<string, unknown>;
  };
}

function parseJsonRpcEnvelope(raw: string): JsonRpcEnvelope | undefined {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object') {
      return undefined;
    }
    return parsed;
  } catch {
    return undefined;
  }
}

export function withMcpV2Envelope(raw: string): string {
  const envelope = parseJsonRpcEnvelope(raw);
  if (envelope === undefined) {
    return raw;
  }
  const params = envelope.params ?? {};
  const meta = params._meta ?? {};
  return JSON.stringify({
    ...envelope,
    jsonrpc: envelope.jsonrpc ?? '2.0',
    id: envelope.id ?? 1,
    params: {
      ...params,
      _meta: {
        [PROTOCOL_VERSION_META_KEY]: MCP_PROTOCOL_VERSION,
        [CLIENT_INFO_META_KEY]: DEFAULT_CLIENT_INFO,
        [CLIENT_CAPABILITIES_META_KEY]: DEFAULT_CLIENT_CAPABILITIES,
        ...meta,
      },
    },
  });
}

export function mcpV2HeadersFromBody(raw: string, incoming?: Headers): Headers {
  const headers = new Headers(incoming);
  if (!headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }
  if (!headers.has(MCP_PROTOCOL_VERSION_HEADER)) {
    headers.set(MCP_PROTOCOL_VERSION_HEADER, MCP_PROTOCOL_VERSION);
  }
  const envelope = parseJsonRpcEnvelope(raw);
  if (envelope?.method !== undefined && !headers.has(MCP_METHOD_HEADER)) {
    headers.set(MCP_METHOD_HEADER, envelope.method);
  }
  if (envelope?.params?.name !== undefined && !headers.has(MCP_NAME_HEADER)) {
    headers.set(MCP_NAME_HEADER, envelope.params.name);
  }
  return headers;
}

export async function toMcpV2Request(request: Request): Promise<Request> {
  if (request.method !== 'POST') {
    return request;
  }
  const raw = await request.text();
  const headers = mcpV2HeadersFromBody(raw, request.headers);
  return new Request(request.url, {
    method: request.method,
    headers,
    body: withMcpV2Envelope(raw),
  });
}
