export type ProvenanceRelation =
  'derived-from' | 'generated-by' | 'attributed-to' | 'supports' | 'contradicts' | 'used-by';

export interface ProvenanceRef {
  readonly type: 'episode' | 'evidence' | 'fact' | 'inference' | 'context' | 'decision';
  readonly id: string;
}

export interface ProvenanceEdge {
  readonly from: ProvenanceRef;
  readonly relation: ProvenanceRelation;
  readonly to: ProvenanceRef;
}
