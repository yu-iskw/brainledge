export type McpProfile =
  | 'memory-read'
  | 'knowledge-read'
  | 'provenance-read'
  | 'ontology-read'
  | 'memory-write'
  | 'knowledge-admin'
  | 'decision-write';

const ALL_MCP_PROFILES: readonly McpProfile[] = [
  'memory-read',
  'knowledge-read',
  'provenance-read',
  'ontology-read',
  'memory-write',
  'knowledge-admin',
  'decision-write',
];

const KNOWN_MCP_PROFILES = new Set<string>(ALL_MCP_PROFILES);

const DEFAULT_MCP_PROFILES: readonly McpProfile[] = ['memory-read', 'memory-write'];

export function parseMcpProfiles(raw: string | undefined): readonly McpProfile[] {
  if (raw === undefined || raw.trim() === '') {
    return DEFAULT_MCP_PROFILES;
  }
  const parsed = raw
    .split(',')
    .map((item) => item.trim())
    .filter((item): item is McpProfile => KNOWN_MCP_PROFILES.has(item));
  return parsed.length === 0 ? DEFAULT_MCP_PROFILES : parsed;
}

interface McpToolResult {
  readonly trusted: { readonly tool: string };
  readonly untrusted: { readonly content: string };
}

export function mcpMemoryRecall(content: string): McpToolResult {
  return {
    trusted: { tool: 'memory.recall' },
    untrusted: { content },
  };
}
