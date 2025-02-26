import { DistributorPlugin } from "@curatedotfun/types";
import "dotenv/config";
import express from "express";
import path from "path";
import { PluginService } from "./plugin-service";
import {
  getPluginByName,
  getPluginRegistry,
  setPluginRegistry,
} from "./plugin-service/plugin-registry";
import { hydrateConfigValues } from "./utils";

async function main() {
  const app = express();
  const pluginService = new PluginService(getPluginByName);

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

      // Load and configure plugins
      const loadedPlugins: DistributorPlugin[] = [];

      for (const pluginConfig of config.distribute) {
        console.log("pluginConfig.plugin", pluginConfig.plugin);

        try {
          // Hydrate config with environment variables
          const hydratedConfig = hydrateConfigValues(pluginConfig.config);

          const plugin = await pluginService.getPlugin<"distributor">(
            pluginConfig.plugin,
            {
              type: "distributor",
              config: hydratedConfig,
            },
          );

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

      // Hydrate config with environment variables
      const hydratedConfig = hydrateConfigValues(pluginConfig);

      // Load and configure transform plugin
      const plugin = await pluginService.getPlugin<"transformer">(pluginName, {
        type: "transformer",
        config: hydratedConfig,
      });

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

  // Plugin registry endpoints
  app.get("/api/plugin-registry", (req, res) => {
    try {
      const registry = getPluginRegistry();
      res.json({ success: true, registry });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to get plugin registry";
      console.error("Error getting plugin registry:", error);
      res.status(500).json({
        success: false,
        error: errorMessage,
      });
    }
  });

  app.post("/api/plugin-registry", (req, res) => {
    try {
      const newRegistry = req.body.registry;
      if (!newRegistry || typeof newRegistry !== "object") {
        throw new Error("Invalid registry format");
      }

      setPluginRegistry(newRegistry);
      res.json({ success: true });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to update plugin registry";
      console.error("Error updating plugin registry:", error);
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

  // Cleanup plugins on exit
  process.on("SIGINT", async () => {
    await pluginService.cleanup();
    process.exit(0);
  });
}

// Run the server
main().catch(console.error);
