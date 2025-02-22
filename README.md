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
# Run all plugins and example plugin manager
bun run dev

# Run specific plugins
bun run dev --filter=@curatedotfun/plugin-name
```

#### Plugin Manager

A development tool is included in `apps/example` that helps you test and manage plugins. It provides:

- Runtime plugin loading without installation
- Plugin registry management through UI
- Transform and distribute testing
- Environment variable configuration

See [Plugin Manager Documentation](apps/example/README.md) for details on testing your remote plugins locally.

### Building

Build all plugins:

```bash
bun run build
```

Or build a specific plugin:

```bash
bun run build --filter=@curatedotfun/gpt-transform
```

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
