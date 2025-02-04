import { PluginLoader } from "../../../packages/plugin-loader/src";
import dotenv from "dotenv";

async function main() {

  dotenv.config();
  // Create a plugin loader instance
  // Reload plugins every minute in development
  const loader = new PluginLoader(60 * 1000);

  try {
    // Load transform plugin
    const gptTransform = await loader.loadPlugin("gpt_transform", {
      url: "http://localhost:3002/remoteEntry.js",
      type: "transform",
      config: {
        prompt: "Transform the greeting into a farewell",
        apiKey: process.env.OPENROUTER_API_KEY!
      }
    }) as any;

    // Transform some content
    const result = await gptTransform.transform({
      input: "Hello world"
    });
    console.log("Transform result:", result);

    // Load distributor plugin
    const telegram = await loader.loadPlugin("telegram", {
      url: "http://localhost:3003/remoteEntry.js", // Different port for each plugin
      type: "distributor",
      config: {
        botToken: process.env.TELEGRAM_BOT_TOKEN!,
        channelId: process.env.TELEGRAM_CHANNEL_ID!
      }
    }) as any;

    // Distribute content
    await telegram.distribute("feed-1", "Content to distribute");

    // Demonstrate cache and reload
    console.log("Loading plugin again (should use cache)...");
    const cachedPlugin = await loader.loadPlugin("gpt_transform", {
      url: "http://localhost:3002/remoteEntry.js",
      type: "transform",
      config: {
        prompt: "Say a greeting back",
        apiKey: process.env.OPENROUTER_API_KEY!
      }
    });

    const r = await cachedPlugin.transform({
      input: "Goodbye world"
    });

    console.log("Second Transform", r);

    // Force reload all plugins
    console.log("Reloading all plugins...");
    await loader.reloadAll();

  } catch (error) {
    console.error("Error in example:", error);
  }
}

// Run the example
main().catch(console.error);

/*
To run this example:
1. Start the gpt-transform plugin:
   cd packages/gpt-transform && bun run dev

2. Start the telegram plugin:
   cd packages/telegram && bun run dev

3. Run this example:
   bun run packages/plugin-loader/example-usage.ts
*/
