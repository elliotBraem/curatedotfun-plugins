import "dotenv/config";
import { PluginLoader } from "./plugin-loader";
import { DistributorPlugin } from "@curatedotfun/types";
import express from "express";
import path from "path";

const PLUGIN_PORTS: Record<string, number> = {
  'notion': 3003,
  'rss': 3004,
  'supabase': 3006,
  'telegram': 3007
};

async function main() {
  const app = express();
  const loader = new PluginLoader(60 * 1000);
  
  // Serve static frontend files
  app.use(express.static(path.join(__dirname, '../dist')));
  app.use(express.json());

  // Distribution endpoint
  app.post('/api/distribute', async (req, res) => {
    try {
      const config = req.body;
      
      if (!config.distribute || !Array.isArray(config.distribute)) {
        throw new Error('Invalid configuration: missing or invalid distribute array');
      }

      // Clear existing plugins
      await loader.reloadAll();
      
      // Load and configure plugins
      const loadedPlugins: DistributorPlugin[] = [];
      
      for (const pluginConfig of config.distribute) {
        const port = PLUGIN_PORTS[pluginConfig.plugin];
        if (!port) {
          console.warn(`Unknown plugin: ${pluginConfig.plugin}`);
          continue;
        }

        try {
          const plugin = await loader.loadPlugin(
            pluginConfig.plugin,
            {
              url: `http://localhost:${port}/remoteEntry.js`,
              type: 'distributor',
              config: pluginConfig.config
            }
          ) as DistributorPlugin;
          
          loadedPlugins.push(plugin);
          console.log(`Loaded plugin: ${pluginConfig.plugin}`);
        } catch (error) {
          console.error(`Failed to load plugin ${pluginConfig.plugin}:`, error);
          throw new Error(`Failed to load plugin ${pluginConfig.plugin}`);
        }
      }

      // Distribute to all loaded plugins
      const results = await Promise.all(
        loadedPlugins.map(async (plugin, index) => {
          const pluginName = config.distribute[index].plugin;
          try {
            await plugin.distribute({ input: "Test distribution" });
            return { plugin: pluginName, status: 'success' };
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`Distribution failed for plugin ${pluginName}:`, error);
            return { plugin: pluginName, status: 'error', error: errorMessage };
          }
        })
      );

      res.json({ success: true, results });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Distribution failed';
      console.error('Error in distribution:', error);
      res.status(500).json({ 
        success: false, 
        error: errorMessage
      });
    }
  });

  // Start server
  const port = 3000;
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}

// Run the server
main().catch(console.error);
