import { describe, expect, it } from 'vitest';

import { formatRequestLog } from './log.js';

describe('formatRequestLog', () => {
  it('returns snake_case JSON with optional fields', () => {
    const minimal = JSON.parse(
      formatRequestLog({
        requestId: 'req_1',
        principalId: 'principal_local',
        workspaceId: 'ws_local',
        knowledgeSpaceId: 'ks_default',
      }),
    ) as Record<string, string>;
    expect(minimal).toEqual({
      request_id: 'req_1',
      principal_id: 'principal_local',
      workspace_id: 'ws_local',
      knowledge_space_id: 'ks_default',
    });

    const full = JSON.parse(
      formatRequestLog({
        requestId: 'req_2',
        principalId: 'principal_local',
        workspaceId: 'ws_local',
        knowledgeSpaceId: 'ks_default',
        jobId: 'job_1',
        ingestionRunId: 'run_1',
        traceId: 'trace_1',
      }),
    ) as Record<string, string>;
    expect(full.job_id).toBe('job_1');
    expect(full.ingestion_run_id).toBe('run_1');
    expect(full.trace_id).toBe('trace_1');
  });
});
