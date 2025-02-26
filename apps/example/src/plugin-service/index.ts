import { performReload } from "@module-federation/node/utils";
import { init, loadRemote } from "@module-federation/runtime";
import {
  BotPlugin,
  PluginConfig,
  PluginType,
  PluginTypeMap,
} from "@curatedotfun/types";
import { createHash } from "crypto";
import { getNormalizedRemoteName } from "../utils";

export class PluginError extends Error {
  constructor(
    message: string,
    public cause?: Error,
  ) {
    super(message);
    this.name = "PluginError";
  }
}

export class PluginLoadError extends PluginError {
  constructor(name: string, url: string, cause?: Error) {
    super(`Failed to load plugin ${name} from ${url}`, cause);
    this.name = "PluginLoadError";
  }
}

export class PluginInitError extends PluginError {
  constructor(name: string, cause?: Error) {
    super(`Failed to initialize plugin ${name}`, cause);
    this.name = "PluginInitError";
  }
}

export class PluginExecutionError extends PluginError {
  constructor(name: string, operation: string, cause?: Error) {
    super(`Plugin ${name} failed during ${operation}`, cause);
    this.name = "PluginExecutionError";
  }
}

/**
 * Creates a deterministic cache key for a plugin instance by combining and hashing
 * the plugin name and config. The key will be the same for identical combinations
 * of these values, allowing for proper instance caching.
 *
 * @param name - Plugin name/identifier
 * @param config - Plugin configuration object
 * @returns A deterministic cache key as a hex string
 */
export function createPluginInstanceKey(
  name: string,
  config: PluginConfig<PluginType, any>,
): string {
  // Sort object keys recursively to ensure deterministic ordering
  const sortedData = sortObjectKeys({
    name,
    config: config.config || {},
  });

  // Create hash of the sorted data
  const hash = createHash("sha256");
  hash.update(JSON.stringify(sortedData));

  // Return first 8 chars of hex digest for a reasonably short but unique key
  return hash.digest("hex").slice(0, 16);
}

/**
 * Recursively sorts all keys in an object to create a deterministic structure.
 * This ensures that the same data will always produce the same hash regardless
 * of the original key ordering.
 *
 * @param obj - Object to sort keys for
 * @returns A new object with sorted keys
 */
export function sortObjectKeys<T>(obj: T): T {
  if (typeof obj !== "object" || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys) as unknown as T;
  }

  // Check for non-serializable properties
  for (const value of Object.values(obj)) {
    if (typeof value === "function" || value instanceof RegExp) {
      throw new Error("Object contains non-serializable properties");
    }
  }

  return Object.keys(obj)
    .sort()
    .reduce<Record<string, unknown>>((sorted, key) => {
      sorted[key] = sortObjectKeys((obj as Record<string, unknown>)[key]);
      return sorted;
    }, {}) as T;
}

/**
 * Validates that a plugin configuration object has all required fields
 * and that they are of the correct type.
 *
 * @param config - Plugin configuration to validate
 * @throws Error if configuration is invalid
 */
export function validatePluginConfig(
  config: PluginConfig<PluginType, any>,
): void {
  if (!config) {
    throw new Error("Plugin configuration is required");
  }

  if (!config.type) {
    throw new Error("Plugin type is required");
  }

  if (!config.url) {
    throw new Error("Plugin URL is required");
  }

  try {
    new URL(config.url);
  } catch (error) {
    throw new Error("Plugin URL must be a valid URL");
  }

  // Config is optional but must be an object if present
  if (config.config && typeof config.config !== "object") {
    throw new Error("Plugin config must be an object");
  }
}

interface RemoteConfig {
  name: string;
  entry: string;
}

interface RemoteState {
  config: RemoteConfig;
  loadedAt?: Date;
  module?: any;
  status: "active" | "loading" | "failed";
  lastError?: Error;
}

interface InstanceState<T extends PluginType> {
  instance: PluginTypeMap<unknown, unknown, Record<string, unknown>>[T];
  config: PluginConfig<T, Record<string, unknown>>;
  loadedAt: Date;
  authFailures: number;
  remoteName: string;
}

type PluginContainer<T extends PluginType> =
  | {
      default?: new () => PluginTypeMap<
        unknown,
        unknown,
        Record<string, unknown>
      >[T];
    }
  | (new () => PluginTypeMap<unknown, unknown, Record<string, unknown>>[T]);

/**
 * PluginService manages the complete lifecycle of plugins including loading,
 * initialization, caching, endpoint registration, and cleanup.
 */
export class PluginService {
  private remotes: Map<string, RemoteState> = new Map();
  private instances: Map<string, InstanceState<PluginType>> = new Map();

  private readonly maxAuthFailures: number = 2; // one less than 3 to avoid locking
  private readonly retryDelays: number[] = [1000, 5000]; // Delays between retries in ms

  constructor(
    private getPluginByName: (name: string) => { url: string } | undefined,
  ) {}

  /**
   * Gets or creates a plugin instance with the specified configuration
   */
  public async getPlugin<
    T extends PluginType,
    TInput = unknown,
    TOutput = unknown,
    TConfig extends Record<string, unknown> = Record<string, unknown>,
  >(
    name: string,
    pluginConfig: { type: T; config: TConfig },
  ): Promise<PluginTypeMap<TInput, TOutput, TConfig>[T]> {
    try {
      // Get plugin metadata from app config
      const pluginMeta = this.getPluginByName(name);

      if (!pluginMeta) {
        throw new PluginLoadError(
          name,
          "",
          new Error(`Plugin ${name} not found in app configuration`),
        );
      }

      // Create full config with URL from app config
      const config: PluginConfig<T, TConfig> = {
        type: pluginConfig.type,
        url: pluginMeta.url,
        config: pluginConfig.config,
      };

      const normalizedName = getNormalizedRemoteName(name);
      const instanceId = createPluginInstanceKey(normalizedName, config);

      // Check existing instance
      const instance = this.instances.get(instanceId);
      if (instance) {
        if (instance.authFailures >= this.maxAuthFailures) {
          throw new PluginError(`Plugin ${name} disabled due to auth failures`);
        }

        return instance.instance as PluginTypeMap<TInput, TOutput, TConfig>[T];
      }

      // Get or initialize remote
      let remote = this.remotes.get(normalizedName);
      if (!remote) {
        remote = {
          config: { name: normalizedName, entry: config.url },
          status: "active",
        };
        this.remotes.set(normalizedName, remote);
      }

      // Create and initialize instance with retries
      let lastError: Error | null = null;
      for (let attempt = 0; attempt <= this.retryDelays.length; attempt++) {
        try {
          // Load module if needed
          if (!remote.module || !remote.loadedAt) {
            remote.status = "loading";
            await this.loadModule(remote);
          }

          if (remote.status === "failed") {
            throw remote.lastError || new Error("Module loading failed");
          }

          // Create and initialize instance
          const newInstance = new remote.module() as PluginTypeMap<
            TInput,
            TOutput,
            TConfig
          >[T];
          await newInstance.initialize(config.config);

          // Validate instance implements required interface
          if (!this.validatePluginInterface(newInstance, config.type)) {
            throw new PluginInitError(
              name,
              new Error(
                `Plugin does not implement required ${config.type} interface`,
              ),
            );
          }

          // Cache successful instance
          const instanceState: InstanceState<T> = {
            instance: newInstance as PluginTypeMap<
              unknown,
              unknown,
              Record<string, unknown>
            >[T],
            config: config as PluginConfig<T, Record<string, unknown>>,
            loadedAt: new Date(),
            authFailures: 0,
            remoteName: normalizedName,
          };
          this.instances.set(instanceId, instanceState);

          return newInstance;
        } catch (error) {
          lastError = error as Error;

          // Track auth failure
          const existingInstance = this.instances.get(instanceId);
          if (existingInstance) {
            existingInstance.authFailures += 1;

            if (existingInstance.authFailures >= this.maxAuthFailures) {
              console.error(`Plugin ${name} disabled due to auth failures`);
              throw new PluginError(
                `Plugin ${name} disabled after ${existingInstance.authFailures} auth failures`,
              );
            }
          }

          // If we have more retries, wait and try again
          if (attempt < this.retryDelays.length) {
            console.warn(
              `Plugin ${name} initialization failed, retrying in ${this.retryDelays[attempt]}ms`,
              { error },
            );
            await new Promise((resolve) =>
              setTimeout(resolve, this.retryDelays[attempt]),
            );
          }
        }
      }

      // If we get here, all retries failed
      throw lastError || new PluginError(`Failed to initialize plugin ${name}`);
    } catch (error) {
      console.error(`Plugin error: ${name}`, { error });
      throw error instanceof PluginError
        ? error
        : new PluginError(
            `Unexpected error with plugin ${name}`,
            error as Error,
          );
    }
  }

  /**
   * Loads a plugin module
   */
  private async loadModule(remote: RemoteState): Promise<void> {
    try {
      // Initialize Module Federation with all active remotes
      await performReload(true);
      init({
        name: "host",
        remotes: Array.from(this.remotes.values()).map((r) => r.config),
      });

      const container = await loadRemote<PluginContainer<PluginType>>(
        `${remote.config.name}/plugin`,
      );
      if (!container) {
        throw new PluginLoadError(
          remote.config.name,
          remote.config.entry,
          new Error("Plugin module not found"),
        );
      }

      // Handle both default export and direct constructor
      const module =
        typeof container === "function" ? container : container.default;

      if (!module || typeof module !== "function") {
        throw new PluginLoadError(
          remote.config.name,
          remote.config.entry,
          new Error("Invalid plugin format - no constructor found"),
        );
      }

      remote.module = module;
      remote.loadedAt = new Date();
      remote.status = "active";
      remote.lastError = undefined;

      console.debug(`Loaded module for remote ${remote.config.name}`, {
        activeRemotes: Array.from(this.remotes.keys()),
      });
    } catch (error) {
      remote.status = "failed";
      remote.lastError = error as Error;
      throw error;
    }
  }

  /**
   * Cleans up all plugin instances
   */
  public async cleanup(): Promise<void> {
    const errors: Error[] = [];

    // Cleanup instances
    for (const [id, state] of this.instances) {
      if ((state.instance as BotPlugin).shutdown) {
        try {
          await (state.instance as BotPlugin).shutdown!();
        } catch (error) {
          const pluginError = new PluginError(
            `Failed to shutdown plugin instance ${id}`,
            error as Error,
          );
          errors.push(pluginError);
          console.error(`Shutdown error`, {
            error: pluginError,
            config: state.config,
          });
        }
      }
    }

    this.instances.clear();
    this.remotes.clear();

    if (errors.length > 0) {
      throw new AggregateError(
        errors,
        `Some plugins failed to shutdown properly`,
      );
    }
  }

  /**
   * Validates that a plugin instance implements the required interface
   */
  private validatePluginInterface(instance: any, type: PluginType): boolean {
    if (!instance || typeof instance !== "object") return false;

    switch (type) {
      case "distributor":
        return typeof instance.distribute === "function";
      case "transformer":
        return typeof instance.transform === "function";
      default:
        return false;
    }
  }
}
