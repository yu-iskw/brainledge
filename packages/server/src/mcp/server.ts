import { LOCAL_SPACE_ID, localContext, type Application } from '@brainledge/core';
import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';

import { mcpMemoryRecall, parseMcpProfiles, type McpProfile } from './profiles.js';

function createBrainledgeMcpServer(
  application: Application,
  profiles: readonly McpProfile[],
): McpServer {
  const allowed = new Set(profiles);
  const server = new McpServer(
    { name: 'brainledge', version: '0.1.0' },
    { capabilities: { tools: {} } },
  );

  if (allowed.has('memory-read')) {
    server.registerTool(
      'memory.recall',
      {
        description: 'Recall episodes from the local knowledge space',
        inputSchema: z.object({ query: z.string() }),
      },
      async ({ query }) => {
        const result = await application.memory.recall(localContext(), {
          spaceId: LOCAL_SPACE_ID,
          query,
        });
        const payload = mcpMemoryRecall(result.memories.map((hit) => hit.content).join('\n'));
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(payload) }],
        };
      },
    );
  }

  if (allowed.has('memory-write')) {
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
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result) }],
        };
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
  recall(query: string): Promise<unknown>;
  remember(content: string): Promise<unknown>;
} {
  const allowed = new Set(profiles);
  return {
    async recall(query) {
      if (!allowed.has('memory-read')) {
        throw new Error('memory-read profile not enabled');
      }
      const result = await application.memory.recall(localContext(), {
        spaceId: LOCAL_SPACE_ID,
        query,
      });
      return mcpMemoryRecall(result.memories.map((hit) => hit.content).join('\n'));
    },
    async remember(content) {
      if (!allowed.has('memory-write')) {
        throw new Error('memory-write profile not enabled');
      }
      return application.memory.remember(localContext(), {
        spaceId: LOCAL_SPACE_ID,
        content,
      });
    },
  };
}

export { parseMcpProfiles };
