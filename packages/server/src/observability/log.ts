interface RequestLogFields {
  readonly requestId: string;
  readonly principalId: string;
  readonly workspaceId: string;
  readonly knowledgeSpaceId: string;
  readonly jobId?: string;
  readonly ingestionRunId?: string;
  readonly traceId?: string;
}

export function formatRequestLog(fields: RequestLogFields): string {
  const payload: Record<string, string> = {
    request_id: fields.requestId,
    principal_id: fields.principalId,
    workspace_id: fields.workspaceId,
    knowledge_space_id: fields.knowledgeSpaceId,
  };
  if (fields.jobId !== undefined) {
    payload.job_id = fields.jobId;
  }
  if (fields.ingestionRunId !== undefined) {
    payload.ingestion_run_id = fields.ingestionRunId;
  }
  if (fields.traceId !== undefined) {
    payload.trace_id = fields.traceId;
  }
  return JSON.stringify(payload);
}
