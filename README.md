<!-- markdownlint-disable MD014 -->
<!-- markdownlint-disable MD033 -->
<!-- markdownlint-disable MD041 -->
<!-- markdownlint-disable MD029 -->

<div align="center">

<h1 style="font-size: 2.5rem; font-weight: bold;">curate.fun plugins</h1>

  <p>
    <strong>monorepo for plugins compatible with curate.fun runtime</strong>
  </p>

</div>

<details>
  <summary>Table of Contents</summary>

- [Getting Started](#getting-started)
  - [Installing dependencies](#installing-dependencies)
  - [Creating a new plugin](#creating-a-new-plugin)
  - [Development](#development)
  - [Building](#building)
- [Contributing](#contributing)

</details>

## Getting Started

### Installing dependencies

```bash
bun install
```

### Creating a new plugin

To create a new plugin, use the [curatedotfun-plugin-template](https://github.com/potlock/curatedotfun-plugin-template) as a starting point.

Then, publish as a standalone package. Make a pull request to add your plugin below:

### Development

Each plugin runs on its own port in development mode with hot reloading:

```bash
# Run all plugins
bun run dev

# Run specific plugins
bun run dev --filter=@curatedotfun/gpt-transform    # Port 3002
bun run dev --filter=@curatedotfun/telegram         # Port 3003
bun run dev --filter=@curatedotfun/rss              # Port 3004
bun run dev --filter=@curatedotfun/simple-transform # Port 3005
```

### Plugin Loading

The `@curatedotfun/plugin-loader` package provides a simple way to load and manage plugins:

```typescript
import { PluginLoader } from "@curatedotfun/plugin-loader";

// Create loader instance (reload plugins every 5 minutes)
const loader = new PluginLoader(5 * 60 * 1000);

// Load a transform plugin
const gptTransform = await loader.loadPlugin("gpt-transform", {
  url: "http://localhost:3002/remoteEntry.js",
  type: "transform",
  config: {
    prompt: "Your prompt",
    apiKey: "your-api-key"
  }
});

// Load a distributor plugin
const telegram = await loader.loadPlugin("telegram", {
  url: "http://localhost:3003/remoteEntry.js",
  type: "distributor",
  config: {
    botToken: "your-bot-token",
    channelId: "your-channel-id"
  }
});

// Use plugins
await gptTransform.transform({ input: "Hello" });
await telegram.distribute("feed-1", "Content");

// Force reload all plugins
await loader.reloadAll();
```

Benefits:
- Hot reloading during development
- Automatic plugin reloading
- Plugin instance caching
- Type-safe plugin loading

### Building

Build all plugins:

```bash
bun run build
```

Or build a specific plugin:

```bash
bun run build --filter=@curatedotfun/gpt-transform
```

### Running tests

```bash
bun run test
```

See the full [testing guide](./playwright-tests/README.md).

## Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

If you're interested in contributing to this project, please read the [contribution guide](./CONTRIBUTING).

<div align="right">
<a href="https://nearbuilders.org" target="_blank">
<img
  src="https://builders.mypinata.cloud/ipfs/QmWt1Nm47rypXFEamgeuadkvZendaUvAkcgJ3vtYf1rBFj"
  alt="Near Builders"
  height="40"
/>
</a>
</div>
