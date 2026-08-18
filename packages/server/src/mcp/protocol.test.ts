import {
  CLIENT_CAPABILITIES_META_KEY,
  CLIENT_INFO_META_KEY,
  PROTOCOL_VERSION_META_KEY,
} from '@modelcontextprotocol/server';
import { describe, expect, it } from 'vitest';

import {
  MCP_PROTOCOL_VERSION,
  mcpV2HeadersFromBody,
  toMcpV2Request,
  withMcpV2Envelope,
} from './protocol.js';

interface JsonRpcEnvelope {
  jsonrpc?: string;
  id?: number | string;
  method?: string;
  params?: {
    name?: string;
    _meta?: Record<string, unknown>;
  };
}

function parseEnvelope(raw: string): JsonRpcEnvelope {
  return JSON.parse(raw) as JsonRpcEnvelope;
}

describe('mcp protocol', () => {
  it('leaves invalid JSON unchanged and injects jsonrpc on valid envelopes', () => {
    expect(withMcpV2Envelope('not-json')).toBe('not-json');
    expect(withMcpV2Envelope('{')).toBe('{');
    const injected = parseEnvelope(
      withMcpV2Envelope(
        JSON.stringify({ method: 'tools/call', params: { name: 'memory.recall' } }),
      ),
    );
    expect(injected.jsonrpc).toBe('2.0');
    expect(injected.id).toBe(1);
    expect(injected.method).toBe('tools/call');
    expect(injected.params?.name).toBe('memory.recall');
    expect(injected.params?._meta?.[PROTOCOL_VERSION_META_KEY]).toBe(MCP_PROTOCOL_VERSION);
    expect(injected.params?._meta?.[CLIENT_INFO_META_KEY]).toEqual({
      name: 'brainledge',
      version: '0.1.0',
    });
    expect(injected.params?._meta?.[CLIENT_CAPABILITIES_META_KEY]).toEqual({ tools: {} });
    const preserved = parseEnvelope(
      withMcpV2Envelope(JSON.stringify({ jsonrpc: '2.0', id: 7, method: 'ping' })),
    );
    expect(preserved.jsonrpc).toBe('2.0');
    expect(preserved.id).toBe(7);
  });

  it('derives mcp v2 headers from the body without overwriting incoming values', () => {
    const derived = mcpV2HeadersFromBody(
      JSON.stringify({ method: 'tools/call', params: { name: 'memory.recall' } }),
    );
    expect(derived.get('content-type')).toBe('application/json');
    expect(derived.get('mcp-protocol-version')).toBe(MCP_PROTOCOL_VERSION);
    expect(derived.get('mcp-method')).toBe('tools/call');
    expect(derived.get('mcp-name')).toBe('memory.recall');
    const incoming = new Headers({
      'content-type': 'application/json; charset=utf-8',
      'mcp-protocol-version': 'keep-version',
      'mcp-method': 'keep-method',
      'mcp-name': 'keep-name',
    });
    const merged = mcpV2HeadersFromBody(
      JSON.stringify({ method: 'tools/call', params: { name: 'memory.recall' } }),
      incoming,
    );
    expect(merged.get('content-type')).toBe('application/json; charset=utf-8');
    expect(merged.get('mcp-protocol-version')).toBe('keep-version');
    expect(merged.get('mcp-method')).toBe('keep-method');
    expect(merged.get('mcp-name')).toBe('keep-name');
  });

  it('leaves GET requests unchanged and rewrites POST envelopes', async () => {
    const getRequest = new Request('http://127.0.0.1/mcp', { method: 'GET' });
    expect(await toMcpV2Request(getRequest)).toBe(getRequest);
    const postBody = JSON.stringify({ method: 'tools/call', params: { name: 'memory.recall' } });
    const postRequest = new Request('http://127.0.0.1/mcp', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: postBody,
    });
    const rewritten = await toMcpV2Request(postRequest);
    expect(rewritten).not.toBe(postRequest);
    expect(rewritten.url).toBe(postRequest.url);
    expect(rewritten.method).toBe('POST');
    expect(rewritten.headers.get('mcp-method')).toBe('tools/call');
    expect(rewritten.headers.get('mcp-name')).toBe('memory.recall');
    const envelope = parseEnvelope(await rewritten.text());
    expect(envelope.jsonrpc).toBe('2.0');
    expect(envelope.id).toBe(1);
  });
});
