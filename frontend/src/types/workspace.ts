interface SourceData {
  name: string;
  from: string;
  format: 'json' | 'yaml' | 'node-list';
}
interface RemoteSource extends SourceData {
  source: 'URI';
  encoding?: 'base64';
  refresh?: number;
  retry?: number;
  retryInterval?: number;
  retryBackoff?: number;
}
interface LocalSource extends SourceData {
  source: 'local';
  encoding?: never;
  refresh?: never;
  retry?: never;
  retryInterval?: never;
  retryBackoff?: never;
}
export type Source = LocalSource | RemoteSource;
export interface Template {
  name: string;
  target: 'clash';
  path: string;
}
export interface Config {
  templates: Template[];
  upstreams: Source[];
  rules?: Source[];
}
export interface ResourceStatus {
  index: number;
  ready: boolean;
  contentLength: number;
  failureCount: number;
  lastError?: string;
  lastSuccessAt?: string;
  restoredFromCache?: boolean;
}
export interface FileData {
  path: string;
  content: string;
  exists: boolean;
}
export interface AdminState {
  configPath: string;
  config: Config;
  resources: ResourceStatus[];
  ruleResources: ResourceStatus[];
  templates: (FileData & Template)[];
  localFiles: FileData[];
}
export interface FileMeta {
  path: string;
  label: string;
  category: string;
}
export type View = 'upstreams' | 'rules' | 'templates' | 'files';

export type DialogData = {
  kind: 'templates' | 'upstreams' | 'rules';
  index: number | null;
  value: Source | Template;
};
