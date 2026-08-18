export type McpProfile =
  | 'memory-read'
  | 'knowledge-read'
  | 'provenance-read'
  | 'ontology-read'
  | 'memory-write'
  | 'knowledge-admin'
  | 'decision-write';

const MEMORY_READ = 'memory-read';
const MEMORY_WRITE = 'memory-write';
const KNOWLEDGE_READ = 'knowledge-read';

const ALL_MCP_PROFILES: readonly McpProfile[] = [
  MEMORY_READ,
  KNOWLEDGE_READ,
  'provenance-read',
  'ontology-read',
  MEMORY_WRITE,
  'knowledge-admin',
  'decision-write',
];

const KNOWN_MCP_PROFILES = new Set<string>(ALL_MCP_PROFILES);

const DEFAULT_MCP_PROFILES: readonly McpProfile[] = [MEMORY_READ, MEMORY_WRITE];

export function parseMcpProfiles(raw: string | undefined): readonly McpProfile[] {
  if (raw === undefined || raw.trim() === '') {
    return DEFAULT_MCP_PROFILES;
  }
  const parsed = raw
    .split(',')
    .map((item) => item.trim())
    .filter((item): item is McpProfile => KNOWN_MCP_PROFILES.has(item));
  const implemented = parsed.filter(
    (profile) => profile === MEMORY_READ || profile === MEMORY_WRITE,
  );
  if (implemented.length === 0) {
    throw new Error(
      `BRAINLEDGE_MCP_PROFILES=${raw} enables no implemented tools. Use ${MEMORY_READ} and/or ${MEMORY_WRITE}.`,
    );
  }
  return parsed;
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
