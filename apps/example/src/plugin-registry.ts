interface PluginMetadata {
  url: string;
}

const PLUGIN_PORTS: Record<string, number> = {
  "@curatedotfun/notion": 3003,
  "@curatedotfun/rss": 3004,
  "@curatedotfun/supabase": 3006,
  "@curatedotfun/telegram": 3007,
  "@curatedotfun/simple-transform": 3005,
  "@curatedotfun/ai-transform": 3002,
};

export function getPluginByName(name: string): PluginMetadata | undefined {
  const port = PLUGIN_PORTS[name];
  if (!port) {
    return undefined;
  }

  return {
    url: `http://localhost:${port}/remoteEntry.js`,
  };
}
