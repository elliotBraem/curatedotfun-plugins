import { loadRemote, init } from '@module-federation/runtime';
import { performReload, revalidate } from '@module-federation/node/utils';

interface PluginConfig {
  url: string;
  type: "transform" | "distributor";
  config: Record<string, string>;
}

interface PluginCache {
  instance: any;
  lastLoaded: Date;
}

export class PluginLoader {
  private pluginCache: Map<string, PluginCache> = new Map();
  private reloadIntervalMs: number;

  constructor(reloadInterval: number = 5 * 60 * 1000) { // Default 5 minutes
    this.reloadIntervalMs = reloadInterval;
  }

  private async initModuleFederation(name: string, remoteUrl: string) {
    await performReload(true);
    return init({
      name: 'plugin_loader',
      remotes: [
        {
          name: name,
          entry: remoteUrl,
        },
      ],
    });
  }

  async loadPlugin(name: string, pluginConfig: PluginConfig): Promise<any> {
    const cached = this.pluginCache.get(name);
    if (cached && this.isCacheValid(cached.lastLoaded)) {
      return cached.instance;
    }

    try {
      // Initialize Module Federation runtime
      await this.initModuleFederation(name, pluginConfig.url);
      console.log("initializing, ", `${name}/plugin`);
      
      // Load the remote module
      const container = await loadRemote(`${name}/plugin`) as { default?: any } | any;
      console.log("we here");
      if (!container) {
        throw new Error(`Failed to load plugin ${name}: Remote module not found`);
      }
      
      // Get the plugin factory (handle both default and named exports)
      const Plugin = container.default || container;
      
      // Create instance
      const plugin = new Plugin();
      
      // Store the plugin configuration for reloads
      (plugin as any).__config = pluginConfig;
      
      // Initialize if it's a distributor plugin
      if (pluginConfig.type === "distributor") {
        await (plugin as any).initialize(name, pluginConfig.config);
      }

      // Cache the instance
      this.pluginCache.set(name, {
        instance: plugin,
        lastLoaded: new Date()
      });

      return plugin;
    } catch (error: any) {
      // Provide more specific error messages for common issues
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOENT') {
        throw new Error(
          `Failed to load plugin ${name}: Could not connect to ${pluginConfig.url}. ` +
          `Make sure the plugin is accessible.`
        );
      }
      console.error(`Failed to load plugin ${name}:`, error);
      throw error;
    }
  }

  private isCacheValid(lastLoaded: Date): boolean {
    const now = new Date();
    return now.getTime() - lastLoaded.getTime() < this.reloadIntervalMs;
  }

  clearCache(): void {
    this.pluginCache.clear();
  }

  async reloadAll(): Promise<void> {
    const entries = Array.from(this.pluginCache.entries());
    const shouldReload = await revalidate();
    
    if (shouldReload) {
      this.pluginCache.clear();
      
      await Promise.all(
        entries.map(async ([name, cache]) => {
          if (cache.instance instanceof Plugin) {
            // Use the original plugin configuration instead of hardcoded values
            const pluginConfig = (cache.instance as any).__config;
            if (pluginConfig) {
              await this.loadPlugin(name, pluginConfig);
            }
          }
        })
      );
    }
  }
}

// Example usage:
/*
const loader = new PluginLoader();

// Load a transform plugin
const gptTransform = await loader.loadPlugin("gpt_transform", {
  url: "http://localhost:3002/remoteEntry.js",
  type: "transform",
  config: {
    prompt: "Your prompt",
    apiKey: "your-api-key"
  }
});

// Use the plugin
const result = await (gptTransform as Plugin).transform({
  input: "Some text"
});
*/
