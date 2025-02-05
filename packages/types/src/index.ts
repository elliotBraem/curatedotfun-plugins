// Base plugin types
export interface BotPlugin<
  TConfig extends Record<string, unknown> = Record<string, unknown>,
> {
  name: string;
  version: string;
  initialize: (config: TConfig) => Promise<void>;
  shutdown?: () => Promise<void>;
}

// Plugin type discriminator
export type PluginType = "transform" | "distributor";

// Plugin action type (used by all plugins)
export interface ActionArgs<TInput = unknown, TConfig = unknown> {
  input: TInput;
  config?: TConfig;
}

// Plugin configuration
export interface PluginConfig<
  T extends PluginType,
  TConfig extends Record<string, unknown> = Record<string, unknown>,
> {
  url: string;
  type: T;
  config: TConfig;
}

// Plugin type mapping
export type PluginTypeMap<
  TInput = unknown,
  TOutput = unknown,
  TConfig extends Record<string, unknown> = Record<string, unknown>,
> = {
  transform: TransformerPlugin<TInput, TOutput, TConfig>;
  distributor: DistributorPlugin<TInput, TConfig>;
};

// Specific plugin types
export interface DistributorPlugin<
  TInput = unknown,
  TConfig extends Record<string, unknown> = Record<string, unknown>,
> extends BotPlugin<TConfig> {
  distribute: (args: ActionArgs<TInput, TConfig>) => Promise<void>;
}

export interface TransformerPlugin<
  TInput = unknown, // input type
  TOutput = unknown, // return type
  TConfig extends Record<string, unknown> = Record<string, unknown>,
> extends BotPlugin<TConfig> {
  transform: (args: ActionArgs<TInput, TConfig>) => Promise<TOutput>;
}

// Plugin loader types (helper for caching a plugin instance)
export interface PluginCache<T extends PluginType, TPlugin extends BotPlugin> {
  instance: TPlugin & {
    __config: PluginConfig<T, TPlugin extends BotPlugin<infer C> ? C : never>;
  };
  lastLoaded: Date;
}

// RSS types
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
