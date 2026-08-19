import { LOCAL_SPACE_ID, localContext, type Application } from '@brainledge/core';
import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';

import {
  KNOWLEDGE_ADMIN,
  MEMORY_READ,
  MEMORY_WRITE,
  mcpKnowledgeConsolidate,
  mcpMemoryForget,
  mcpMemoryRecall,
  parseMcpProfiles,
  type McpProfile,
} from './profiles.js';

const FORGET_MODES = ['hide', 'delete', 'retract', 'purge'] as const;

function jsonToolResult(payload: unknown): { content: [{ type: 'text'; text: string }] } {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(payload) }],
  };
}

function createBrainledgeMcpServer(
  application: Application,
  profiles: readonly McpProfile[],
): McpServer {
  const allowed = new Set(profiles);
  const server = new McpServer(
    { name: 'brainledge', version: '0.1.0' },
    { capabilities: { tools: {} } },
  );

  if (allowed.has(MEMORY_READ)) {
    server.registerTool(
      'memory.recall',
      {
        description: 'Recall facts and episodes from the local knowledge space',
        inputSchema: z.object({
          query: z.string(),
          asOf: z.string().optional(),
        }),
      },
      async ({ query, asOf }) => {
        const result = await application.memory.recall(localContext(), {
          spaceId: LOCAL_SPACE_ID,
          query,
          asOf,
        });
        return jsonToolResult(mcpMemoryRecall(result));
      },
    );
  }

  if (allowed.has(MEMORY_WRITE)) {
    server.registerTool(
      'memory.remember',
      {
        description: 'Remember an episode in the local knowledge space',
        inputSchema: z.object({ content: z.string().min(1) }),
      },
      async ({ content }) => {
        const result = await application.memory.remember(localContext(), {
          spaceId: LOCAL_SPACE_ID,
          content,
        });
        return jsonToolResult(result);
      },
    );
    server.registerTool(
      'memory.forget',
      {
        description: 'Hide, retract, or purge a remembered episode',
        inputSchema: z.object({
          memoryId: z.string().min(1),
          mode: z.enum(FORGET_MODES).default('hide'),
        }),
      },
      async ({ memoryId, mode }) => {
        await application.memory.forget(localContext(), {
          spaceId: LOCAL_SPACE_ID,
          memoryId,
          mode,
        });
        return jsonToolResult(mcpMemoryForget({ memoryId, mode }));
      },
    );
  }

  if (allowed.has(KNOWLEDGE_ADMIN)) {
    server.registerTool(
      'knowledge.consolidate',
      {
        description: 'Preview or accept extracted facts from remembered episodes',
        inputSchema: z.object({
          dryRun: z.boolean().optional().default(false),
        }),
      },
      async ({ dryRun }) => {
        const result = await application.memory.consolidate(localContext(), {
          spaceId: LOCAL_SPACE_ID,
          dryRun,
        });
        return jsonToolResult(
          mcpKnowledgeConsolidate({
            dryRun,
            factCount: result.factCount,
            proposed: result.proposed,
          }),
        );
      },
    );
  }

  return server;
}

export function createBrainledgeMcpHandler(
  application: Application,
  profiles: readonly McpProfile[] = parseMcpProfiles(process.env.BRAINLEDGE_MCP_PROFILES),
) {
  return createMcpHandler(() => createBrainledgeMcpServer(application, profiles), {
    legacy: 'reject',
  });
}

export function createStdioMcpFacade(
  application: Application,
  profiles: readonly McpProfile[],
): {
  recall(query: string, asOf?: string): Promise<unknown>;
  remember(content: string): Promise<unknown>;
  forget(memoryId: string, mode?: (typeof FORGET_MODES)[number]): Promise<unknown>;
  consolidate(dryRun?: boolean): Promise<unknown>;
} {
  const allowed = new Set(profiles);
  return {
    async recall(query, asOf) {
      if (!allowed.has(MEMORY_READ)) {
        throw new Error(`${MEMORY_READ} profile not enabled`);
      }
      const result = await application.memory.recall(localContext(), {
        spaceId: LOCAL_SPACE_ID,
        query,
        asOf,
      });
      return mcpMemoryRecall(result);
    },
    async remember(content) {
      if (!allowed.has(MEMORY_WRITE)) {
        throw new Error(`${MEMORY_WRITE} profile not enabled`);
      }
      return application.memory.remember(localContext(), {
        spaceId: LOCAL_SPACE_ID,
        content,
      });
    },
    async forget(memoryId, mode = 'hide') {
      if (!allowed.has(MEMORY_WRITE)) {
        throw new Error(`${MEMORY_WRITE} profile not enabled`);
      }
      await application.memory.forget(localContext(), {
        spaceId: LOCAL_SPACE_ID,
        memoryId,
        mode,
      });
      return mcpMemoryForget({ memoryId, mode });
    },
    async consolidate(dryRun = false) {
      if (!allowed.has(KNOWLEDGE_ADMIN)) {
        throw new Error(`${KNOWLEDGE_ADMIN} profile not enabled`);
      }
      const result = await application.memory.consolidate(localContext(), {
        spaceId: LOCAL_SPACE_ID,
        dryRun,
      });
      return mcpKnowledgeConsolidate({
        dryRun,
        factCount: result.factCount,
        proposed: result.proposed,
      });
    },
  };
}

export { parseMcpProfiles };
