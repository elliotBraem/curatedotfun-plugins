import "dotenv/config";
import { PluginLoader } from "./plugin-loader";
import { DistributorPlugin, TransformerPlugin } from "@curatedotfun/types";
import express from "express";
import path from "path";
import { hydrateConfigValues } from "./utils";

const PLUGIN_PORTS: Record<string, number> = {
  notion: 3003,
  rss: 3004,
  supabase: 3006,
  telegram: 3007,
  "simple-transform": 3005,
  "ai-transform": 3002,
};

async function main() {
  const app = express();
  const loader = new PluginLoader(60 * 1000);

  // Serve static frontend files
  app.use(express.static(path.join(__dirname, "../dist")));
  app.use(express.json());

  // Distribution endpoint
  app.post("/api/distribute", async (req, res) => {
    try {
      const config = req.body;

      if (!config.distribute || !Array.isArray(config.distribute)) {
        throw new Error(
          "Invalid configuration: missing or invalid distribute array",
        );
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
          // Hydrate config with environment variables
          const hydratedConfig = hydrateConfigValues(pluginConfig.config);

          const plugin = (await loader.loadPlugin(pluginConfig.plugin, {
            url: `http://localhost:${port}/remoteEntry.js`,
            type: "distributor",
            config: hydratedConfig,
          })) as DistributorPlugin;

          loadedPlugins.push(plugin);
          console.log(`Loaded plugin: ${pluginConfig.plugin}`);
        } catch (error) {
          console.error(`Failed to load plugin ${pluginConfig.plugin}:`, error);
          throw new Error(`Failed to load plugin ${pluginConfig.plugin}`);
        }
      }

      // Get content from request
      const { content } = req.body;
      if (!content) {
        throw new Error("No content provided for distribution");
      }

      // Distribute to all loaded plugins
      const results = await Promise.all(
        loadedPlugins.map(async (plugin, index) => {
          const pluginName = config.distribute[index].plugin;
          try {
            await plugin.distribute({ input: content });
            return { plugin: pluginName, status: "success" };
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : "Unknown error";
            console.error(
              `Distribution failed for plugin ${pluginName}:`,
              error,
            );
            return { plugin: pluginName, status: "error", error: errorMessage };
          }
        }),
      );

      res.json({ success: true, results });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Distribution failed";
      console.error("Error in distribution:", error);
      res.status(500).json({
        success: false,
        error: errorMessage,
      });
    }
  });

  // Transform endpoint
  app.post("/api/transform", async (req, res) => {
    try {
      const { plugin: pluginName, config: pluginConfig, content } = req.body;

      if (!content) {
        throw new Error("No content provided for transformation");
      }

      const port = PLUGIN_PORTS[pluginName];
      if (!port) {
        throw new Error(`Unknown plugin: ${pluginName}`);
      }

      // Hydrate config with environment variables
      const hydratedConfig = hydrateConfigValues(pluginConfig);

      // Load and configure transform plugin
      const plugin = (await loader.loadPlugin(pluginName, {
        url: `http://localhost:${port}/remoteEntry.js`,
        type: "transform",
        config: hydratedConfig,
      })) as TransformerPlugin;

      // Transform content
      const result = await plugin.transform({ input: content });
      res.json({ success: true, output: result });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Transform failed";
      console.error("Error in transform:", error);
      res.status(500).json({
        success: false,
        error: errorMessage,
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
