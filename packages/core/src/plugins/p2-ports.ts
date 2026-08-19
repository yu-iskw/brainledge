/** Optional P2 adapters. Standalone boots with these unconfigured. */

export interface PolicyEnginePort {
  evaluate(input: { principalId: string; action: string; resource: string }): Promise<boolean>;
}

export interface GraphProjectionPort {
  upsertFact(input: {
    factId: string;
    subject: string;
    predicate: string;
    object: string;
  }): Promise<void>;
  neighbors(nodeId: string): Promise<readonly string[]>;
}

export interface SparqlPort {
  query(sparql: string): Promise<readonly Record<string, string>[]>;
}

export interface TaskQueuePort {
  enqueue(jobType: string, payload: string): Promise<string>;
}

export interface WebhookPort {
  deliver(url: string, body: string): Promise<{ status: number }>;
}

export interface KmsPort {
  wrap(plaintext: Uint8Array): Promise<Uint8Array>;
  unwrap(ciphertext: Uint8Array): Promise<Uint8Array>;
}

interface LegalHoldPort {
  hold(spaceId: string): Promise<void>;
  isHeld(spaceId: string): Promise<boolean>;
}

interface ClassificationPort {
  mask(text: string, labels: readonly string[]): string;
}

interface DifferentialContextPort {
  filterForAgent<T>(items: readonly T[], agentMaySee: (item: T) => boolean): readonly T[];
}

interface FederationPort {
  share(spaceId: string, peerId: string): Promise<{ grantId: string }>;
}

interface ReplicationHookPort {
  onCommit(workspaceId: string, payload: string): Promise<void>;
}

interface QualityEvalPort {
  score(kind: string, actual: string, expected: string): number;
}

interface ExtractionArbitrationPort {
  pick(candidates: readonly string[]): string;
}

interface LifecyclePort {
  staleFactIds(
    nowIso: string,
    facts: readonly { id: string; assertedAt: string }[],
  ): readonly string[];
}

interface CompliancePack {
  readonly id: string;
  readonly controls: readonly { readonly id: string; readonly title: string }[];
}

interface OwlClass {
  readonly id: string;
  readonly parents: readonly string[];
}

interface ReteEngine {
  ingest(fact: string): readonly string[];
}

interface A2AMessage {
  readonly from: string;
  readonly to: string;
  readonly type: string;
  readonly body: string;
}

interface McpAppDescriptor {
  readonly id: string;
  readonly title: string;
  readonly uri: string;
}

export function createAllowAllPolicyEngine(): PolicyEnginePort {
  return {
    evaluate() {
      return Promise.resolve(true);
    },
  };
}

export function createCedarCompatiblePolicyEngine(
  tuples: readonly { user: string; relation: string; object: string }[],
): PolicyEnginePort {
  return {
    evaluate({ principalId, action, resource }) {
      const allowed = tuples.some(
        (tuple) =>
          tuple.user === principalId && tuple.relation === action && tuple.object === resource,
      );
      return Promise.resolve(allowed);
    },
  };
}

export function postgresRlsSql(): string {
  return "ALTER TABLE episodes ENABLE ROW LEVEL SECURITY; CREATE POLICY workspace_isolation ON episodes USING (workspace_id = current_setting('app.workspace_id'));";
}

export function createInMemoryGraphProjection(): GraphProjectionPort {
  const edges = new Map<string, string[]>();
  return {
    upsertFact({ subject, object }) {
      const current = edges.get(subject) ?? [];
      current.push(object);
      edges.set(subject, current);
      return Promise.resolve();
    },
    neighbors(nodeId) {
      return Promise.resolve(edges.get(nodeId) ?? []);
    },
  };
}

export function createInMemorySparql(
  triples: { s: string; p: string; o: string }[] = [],
): SparqlPort {
  return {
    query(sparql) {
      const parsed = parseSelectObjectQuery(sparql);
      if (parsed === undefined) {
        return Promise.resolve([]);
      }
      return Promise.resolve(
        triples
          .filter((triple) => triple.s === parsed.subject && triple.p === parsed.predicate)
          .map((triple) => ({ o: triple.o })),
      );
    },
  };
}

function parseSelectObjectQuery(
  sparql: string,
): { subject: string; predicate: string } | undefined {
  const prefix = 'SELECT ?o WHERE { <';
  if (!sparql.startsWith(prefix)) {
    return undefined;
  }
  const afterPrefix = sparql.slice(prefix.length);
  const subjectEnd = afterPrefix.indexOf('>');
  if (subjectEnd <= 0) {
    return undefined;
  }
  const subject = afterPrefix.slice(0, subjectEnd);
  const afterSubject = afterPrefix.slice(subjectEnd + 1).trimStart();
  if (!afterSubject.startsWith('<')) {
    return undefined;
  }
  const afterPredOpen = afterSubject.slice(1);
  const predicateEnd = afterPredOpen.indexOf('>');
  if (predicateEnd <= 0) {
    return undefined;
  }
  const predicate = afterPredOpen.slice(0, predicateEnd);
  const tail = afterPredOpen.slice(predicateEnd + 1).trim();
  if (!tail.startsWith('?o')) {
    return undefined;
  }
  return { subject, predicate };
}

export function createInMemoryTaskQueue(
  kind: 'memory' | 'cloud-tasks' | 'pubsub' | 'sqs',
): TaskQueuePort {
  const jobs: string[] = [];
  return {
    enqueue(jobType, payload) {
      const id = `${kind}:${jobType}:${jobs.length}`;
      jobs.push(payload);
      return Promise.resolve(id);
    },
  };
}

export function createSignedWebhookPort(
  secret: string,
  fetchImpl: typeof fetch = fetch,
): WebhookPort {
  return {
    async deliver(url, body) {
      const response = await fetchImpl(url, {
        method: 'POST',
        headers: { 'x-brainledge-signature': secret, 'content-type': 'application/json' },
        body,
      });
      return { status: response.status };
    },
  };
}

export function createLocalKms(): KmsPort {
  return {
    wrap(plaintext) {
      return Promise.resolve(plaintext);
    },
    unwrap(ciphertext) {
      return Promise.resolve(ciphertext);
    },
  };
}

export function createLegalHold(): LegalHoldPort {
  const held = new Set<string>();
  return {
    hold(spaceId) {
      held.add(spaceId);
      return Promise.resolve();
    },
    isHeld(spaceId) {
      return Promise.resolve(held.has(spaceId));
    },
  };
}

export function createClassificationMask(): ClassificationPort {
  return {
    mask(text, labels) {
      if (labels.includes('secret')) {
        return '[REDACTED]';
      }
      return text;
    },
  };
}

export function createDifferentialContext(): DifferentialContextPort {
  return {
    filterForAgent(items, agentMaySee) {
      return items.filter((item) => agentMaySee(item));
    },
  };
}

export function createFederation(): FederationPort {
  return {
    share(spaceId, peerId) {
      return Promise.resolve({ grantId: `fed_${spaceId}_${peerId}` });
    },
  };
}

export function createReplicationHook(): ReplicationHookPort {
  return {
    onCommit() {
      return Promise.resolve();
    },
  };
}

export function createQualityEval(): QualityEvalPort {
  return {
    score(_kind, actual, expected) {
      return actual === expected ? 1 : 0;
    },
  };
}

export function createExtractionArbitration(): ExtractionArbitrationPort {
  return {
    pick(candidates) {
      return candidates[0] ?? '';
    },
  };
}

export function createLifecycle(): LifecyclePort {
  return {
    staleFactIds(nowIso, facts) {
      return facts.filter((fact) => fact.assertedAt < nowIso).map((fact) => fact.id);
    },
  };
}

export function soc2Pack(): CompliancePack {
  return {
    id: 'soc2',
    controls: [
      { id: 'CC6.1', title: 'Logical access' },
      { id: 'CC7.2', title: 'System monitoring' },
    ],
  };
}

export function owlSubclassOf(
  child: OwlClass,
  ancestorId: string,
  classes: readonly OwlClass[],
): boolean {
  if (child.id === ancestorId) {
    return true;
  }
  return child.parents.some((parentId) => {
    const parent = classes.find((item) => item.id === parentId);
    return parent !== undefined && owlSubclassOf(parent, ancestorId, classes);
  });
}

export function createReteEngine(
  rules: readonly { ifContains: string; emit: string }[],
): ReteEngine {
  const memory = new Set<string>();
  return {
    ingest(fact) {
      memory.add(fact);
      const emitted: string[] = [];
      for (const rule of rules) {
        if ([...memory].some((item) => item.includes(rule.ifContains))) {
          emitted.push(rule.emit);
        }
      }
      return emitted;
    },
  };
}

export function encodeA2A(message: A2AMessage): string {
  return JSON.stringify({ protocol: 'a2a/1', ...message });
}

export function mcpApps(): readonly McpAppDescriptor[] {
  return [
    { id: 'graph', title: 'Graph explorer', uri: 'mcp://brainledge/apps/graph' },
    { id: 'timeline', title: 'Timeline', uri: 'mcp://brainledge/apps/timeline' },
    { id: 'provenance', title: 'Provenance', uri: 'mcp://brainledge/apps/provenance' },
    { id: 'decision', title: 'Decisions', uri: 'mcp://brainledge/apps/decision' },
  ];
}
