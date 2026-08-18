export type PluginCapability =
  | 'source-connector'
  | 'parser'
  | 'extractor'
  | 'embedding-provider'
  | 'generation-provider'
  | 'storage-adapter'
  | 'reranker'
  | 'rule-engine'
  | 'ontology-loader'
  | 'exporter'
  | 'job-queue';

export interface PluginManifest {
  readonly id: string;
  readonly version: string;
  readonly apiVersion: string;
  readonly capabilities: readonly PluginCapability[];
}
