import { mcpV2HeadersFromBody, withMcpV2Envelope } from './protocol.js';
import { createBrainledgeMcpHandler } from './server.js';

import type { McpProfile } from './profiles.js';
import type { Application } from '@brainledge/core';

export async function handleMcpJsonRpc(
  application: Application,
  profiles: readonly McpProfile[],
  raw: string,
): Promise<string> {
  const handler = createBrainledgeMcpHandler(application, profiles);
  try {
    const response = await handler.fetch(
      new Request('http://127.0.0.1/mcp', {
        method: 'POST',
        headers: mcpV2HeadersFromBody(raw),
        body: withMcpV2Envelope(raw),
      }),
    );
    return response.text();
  } finally {
    await handler.close();
  }
}
