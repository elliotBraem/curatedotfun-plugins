export type PluginType = "transformer" | "distributor";

// Base plugin interface
export interface BotPlugin<
  TConfig extends Record<string, unknown> = Record<string, unknown>,
> {
  type: PluginType;
  initialize: (config?: TConfig) => Promise<void>;
  shutdown?: () => Promise<void>;
}

// Specific plugin interfaces
export interface TransformerPlugin<
  TInput = unknown,
  TOutput = unknown,
  TConfig extends Record<string, unknown> = Record<string, unknown>,
> extends BotPlugin<TConfig> {
  type: "transformer";
  transform: (args: ActionArgs<TInput, TConfig>) => Promise<TOutput>;
}

export interface DistributorPlugin<
  TInput = unknown,
  TConfig extends Record<string, unknown> = Record<string, unknown>,
> extends BotPlugin<TConfig> {
  type: "distributor";
  distribute: (args: ActionArgs<TInput, TConfig>) => Promise<void>;
}

// Plugin action type (used by all plugins)
export interface ActionArgs<TInput = unknown, TConfig = unknown> {
  input: TInput;
  config?: TConfig;
}

/**
 * Plugin configuration
 */
export interface PluginConfig<
  T extends PluginType,
  TConfig = Record<string, unknown>,
> {
  type: T;
  url: string;
  config?: TConfig;
}

/**
 * Plugin type mapping
 */
export type PluginTypeMap<
  TInput,
  TOutput,
  TConfig extends Record<string, unknown>,
> = {
  transformer: TransformerPlugin<TInput, TOutput, TConfig>;
  distributor: DistributorPlugin<TInput, TConfig>;
};

// (BELOW IS DEPRECIATED) - to be removed

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
