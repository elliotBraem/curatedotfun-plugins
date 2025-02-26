# Plugin Manager

This example app is a development tool for testing and managing plugins in the curatedotfun ecosystem. This app provides a local environment where you can test plugins, manage the plugin registry, and validate plugin functionality. Plugins are loaded at runtime and do not need to be installed.

Your plugin does not have to exist in this repository and can be added to the "registry" for usage via the UI.

## Getting Started

1. Install dependencies from the root directory:

```bash
bun install
```

2. Serve any remote plugins (`bun run dev` from root for this repository's offerings), then run the dashboard:

```bash
bun run start
```

## Development Workflow

1. Start your plugin's development server
2. Add your plugin to the registry with:
   - Unique name
   - Local URL (e.g., <http://localhost:3001/remoteEntry.js>)
   - Type (transform or distributor)
3. Use the UI to test your plugin:
   - For transform plugins: Test content transformation
   - For distributor plugins: Test content distribution
4. Make changes to your plugin and see them reflected in real-time

## Managing Plugins

### Plugin Registry

The plugin registry is managed through the UI or via the API endpoints:

- GET `/api/plugin-registry`: Get the current plugin registry
- POST `/api/plugin-registry`: Update the plugin registry

Example plugin registry format:

```json
{
  "@curatedotfun/simple-transform": {
    "url": "http://localhost:3005/remoteEntry.js",
    "type": "transformer"
  },
  "@curatedotfun/telegram": {
    "url": "http://localhost:3007/remoteEntry.js",
    "type": "distributor"
  }
}
```

## Environment Variables

Plugins may require environment variables for configuration. Add these to your `.env` file:

```env
OPENROUTER_API_KEY=your-key
TELEGRAM_BOT_TOKEN=your-token
NOTION_TOKEN=your-token
# Add other plugin-specific variables as needed
```

The app will automatically hydrate these variables in plugin configurations.

You can access them in config via {YOUR_ENV_KEY_NAME}
