export interface Source {
  name: string;
  source: 'local' | 'URI';
  from: string;
  format: 'json' | 'yaml' | 'node-list';
  encoding?: 'base64';
  refresh?: number;
  retry?: number;
  retryInterval?: number;
  retryBackoff?: number;
  nodeTemplatePath?: string;
}
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
  nodeTemplates: FileData[];
  localFiles: FileData[];
}
export interface FileMeta {
  path: string;
  label: string;
  category: string;
  nodeIndex?: number;
}
export type View = 'upstreams' | 'rules' | 'templates' | 'files';

export type DialogData = {
  kind: 'templates' | 'upstreams' | 'rules';
  index: number | null;
  value: Source | Template;
};
