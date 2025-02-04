export interface Plugin<TConfig extends Record<string, unknown> = Record<string, string>> {
  name: string;
  version: string;
  initialize: (config: TConfig) => Promise<void>;
  shutdown?: () => Promise<void>;
}

export interface ActionArgs<TInput = unknown, TConfig = unknown> {
  input: TInput;
  config?: TConfig;
}

export interface DistributorPlugin<TInput = unknown, TConfig extends Record<string, unknown> = Record<string, unknown>> extends Plugin<TConfig> {
  distribute: (args: ActionArgs<TInput, TConfig>) => Promise<void>;
}

export interface TransformerPlugin<TInput = unknown, TOutput = unknown, TConfig extends Record<string, unknown> = Record<string, unknown>> extends Plugin<TConfig> {
  transform: (args: ActionArgs<TInput, TConfig>) => Promise<TOutput>;
}

export interface RssItem {
  title?: string;
  content: string;
  link?: string;
  publishedAt: string;
  guid: string;
}

export interface DBOperations {
  saveRssItem: (feedId: string, item: RssItem) => Promise<void>;
  deleteOldRssItems: (feedId: string, maxItems: number) => Promise<void>;
  getRssItems: (feedId: string, limit: number) => Promise<RssItem[]>;
}
