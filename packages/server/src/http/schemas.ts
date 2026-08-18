import { z } from 'zod';

export const rememberBody = z.object({
  content: z.string().min(1),
  kind: z
    .enum(['conversation', 'note', 'document', 'event', 'tool-result', 'observation'])
    .optional(),
});

export const recallBody = z.object({
  query: z.string(),
  limit: z.number().int().positive().max(100).optional(),
  asOf: z.string().optional(),
});

export const ingestBody = z
  .object({
    markdown: z.string().min(1).optional(),
    url: z.string().min(1).optional(),
    idempotencyKey: z.string().optional(),
  })
  .refine((data) => data.markdown !== undefined || data.url !== undefined, {
    message: 'markdown or url required',
  });

export const forgetQuery = z.object({
  mode: z.enum(['hide', 'delete', 'retract', 'purge']).optional(),
});

export const spaceCreateBody = z.object({
  name: z.string().min(1),
  visibility: z.enum(['private', 'workspace', 'organization']).optional(),
});

export const spaceUpdateBody = z.object({
  name: z.string().min(1).optional(),
  visibility: z.enum(['private', 'workspace', 'organization']).optional(),
});

export const decisionBody = z.object({
  action: z.string().min(1),
  rationale: z.string().optional(),
});

export const errorEnvelope = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    requestId: z.string(),
  }),
});
