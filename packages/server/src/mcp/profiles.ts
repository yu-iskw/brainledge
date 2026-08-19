import { formatFactSentence } from '@brainledge/core';

import type { ProposedFact, RecallResult } from '@brainledge/core';

export type McpProfile =
  | 'memory-read'
  | 'knowledge-read'
  | 'provenance-read'
  | 'ontology-read'
  | 'memory-write'
  | 'knowledge-admin'
  | 'decision-write';

export const MEMORY_READ: McpProfile = 'memory-read';
export const MEMORY_WRITE: McpProfile = 'memory-write';
const KNOWLEDGE_READ: McpProfile = 'knowledge-read';
export const KNOWLEDGE_ADMIN: McpProfile = 'knowledge-admin';

const ALL_MCP_PROFILES: readonly McpProfile[] = [
  MEMORY_READ,
  KNOWLEDGE_READ,
  'provenance-read',
  'ontology-read',
  MEMORY_WRITE,
  KNOWLEDGE_ADMIN,
  'decision-write',
];

const KNOWN_MCP_PROFILES = new Set<string>(ALL_MCP_PROFILES);

const IMPLEMENTED_MCP_PROFILES = new Set<McpProfile>([MEMORY_READ, MEMORY_WRITE, KNOWLEDGE_ADMIN]);

const DEFAULT_MCP_PROFILES: readonly McpProfile[] = [MEMORY_READ, MEMORY_WRITE, KNOWLEDGE_ADMIN];

export function parseMcpProfiles(raw: string | undefined): readonly McpProfile[] {
  if (raw === undefined || raw.trim() === '') {
    return DEFAULT_MCP_PROFILES;
  }
  const parsed = raw
    .split(',')
    .map((item) => item.trim())
    .filter((item): item is McpProfile => KNOWN_MCP_PROFILES.has(item));
  const implemented = parsed.filter((profile) => IMPLEMENTED_MCP_PROFILES.has(profile));
  if (implemented.length === 0) {
    throw new Error(
      `BRAINLEDGE_MCP_PROFILES=${raw} enables no implemented tools. Use ${MEMORY_READ}, ${MEMORY_WRITE}, and/or ${KNOWLEDGE_ADMIN}.`,
    );
  }
  return parsed;
}

interface McpToolResult<TTrusted extends { readonly tool: string }, TUntrusted> {
  readonly trusted: TTrusted;
  readonly untrusted: TUntrusted;
}

export function mcpMemoryRecall(result: RecallResult): McpToolResult<
  {
    readonly tool: 'memory.recall';
    readonly answer: string;
    readonly facts: RecallResult['facts'];
    readonly receipts: readonly string[];
  },
  { readonly content: string }
> {
  const receipts = result.facts.map((hit) =>
    formatFactSentence({
      subjectId: hit.subjectId,
      predicateId: hit.predicateId,
      objectText: hit.objectText,
      summary: hit.summary,
    }),
  );
  const notes = result.memories.map((hit) => hit.content).join('\n');
  const answer =
    receipts.length > 0 ? receipts.join('\n') : notes.length > 0 ? notes : 'No memories found.';
  return {
    trusted: {
      tool: 'memory.recall',
      answer,
      facts: result.facts,
      receipts,
    },
    untrusted: { content: notes },
  };
}

export function mcpMemoryForget(input: {
  readonly memoryId: string;
  readonly mode: string;
}): McpToolResult<
  {
    readonly tool: 'memory.forget';
    readonly memoryId: string;
    readonly mode: string;
    readonly status: 'ok';
  },
  Record<string, never>
> {
  return {
    trusted: {
      tool: 'memory.forget',
      memoryId: input.memoryId,
      mode: input.mode,
      status: 'ok',
    },
    untrusted: {},
  };
}

export function mcpKnowledgeConsolidate(input: {
  readonly dryRun: boolean;
  readonly factCount: number;
  readonly proposed?: readonly ProposedFact[];
}): McpToolResult<
  {
    readonly tool: 'knowledge.consolidate';
    readonly status: 'preview' | 'completed';
    readonly factCount: number;
    readonly proposed?: readonly ProposedFact[];
  },
  Record<string, never>
> {
  return {
    trusted: {
      tool: 'knowledge.consolidate',
      status: input.dryRun ? 'preview' : 'completed',
      factCount: input.factCount,
      ...(input.proposed === undefined ? {} : { proposed: input.proposed }),
    },
    untrusted: {},
  };
}
