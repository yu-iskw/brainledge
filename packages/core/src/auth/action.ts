export type Action =
  | 'memory.remember'
  | 'memory.recall'
  | 'memory.forget'
  | 'space.read'
  | 'space.write'
  | 'space.admin'
  | 'knowledge.read'
  | 'knowledge.write'
  | 'knowledge.admin'
  | 'decision.write'
  | 'ingestion.write';

export type GrantLevel = 'reader' | 'editor' | 'admin';
