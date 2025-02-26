import { PluginType } from "@curatedotfun/types";

interface PluginMetadata {
  url: string;
  type: PluginType;
}

// Initial plugin registry with types
// UPDATE THIS IF ADDING A NEW PLUGIN TO REPOSITORY
let pluginRegistry: Record<string, PluginMetadata> = {
  "@curatedotfun/object-transform": {
    url: "http://localhost:3008/remoteEntry.js",
    type: "transformer",
  },
  "@curatedotfun/notion": {
    url: "http://localhost:3003/remoteEntry.js",
    type: "distributor",
  },
  "@curatedotfun/rss": {
    url: "http://localhost:3004/remoteEntry.js",
    type: "distributor",
  },
  "@curatedotfun/supabase": {
    url: "http://localhost:3006/remoteEntry.js",
    type: "distributor",
  },
  "@curatedotfun/telegram": {
    url: "http://localhost:3007/remoteEntry.js",
    type: "distributor",
  },
  "@curatedotfun/simple-transform": {
    url: "http://localhost:3005/remoteEntry.js",
    type: "transformer",
  },
  "@curatedotfun/ai-transform": {
    url: "http://localhost:3002/remoteEntry.js",
    type: "transformer",
  },
};

export function getPluginByName(name: string): PluginMetadata | undefined {
  return pluginRegistry[name];
}

export function getPluginRegistry(): Record<string, PluginMetadata> {
  return pluginRegistry;
}

export function setPluginRegistry(
  newRegistry: Record<string, PluginMetadata>,
): void {
  // Validate the new registry
  for (const [name, metadata] of Object.entries(newRegistry)) {
    if (!metadata.url || !metadata.type) {
      throw new Error(
        `Invalid plugin metadata for ${name}: missing url or type`,
      );
    }
    if (!["distributor", "transformer"].includes(metadata.type)) {
      throw new Error(`Invalid plugin type for ${name}: ${metadata.type}`);
    }
  }

  pluginRegistry = newRegistry;
}
