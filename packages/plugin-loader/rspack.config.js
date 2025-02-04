const path = require("path");
const { rspack } = require("@rspack/core");

module.exports = {
  entry: "./src/index",
  mode: process.env.NODE_ENV === "development" ? "development" : "production",
  target: "async-node",
  devtool: "source-map",
  output: {
    uniqueName: "plugin_loader",
    publicPath: "auto",
    path: path.resolve(__dirname, "dist"),
    clean: true,
    library: { type: "commonjs-module" },
  },
  module: {
    // noParse: /yargs/,
    // rules: [
    //   {
    //     test: /\.tsx?$/,
    //     use: [
    //       {
    //         loader: 'ts-loader',
    //         options: {
    //           transpileOnly: false, // Enables type-checking and .d.ts file emission
    //         },
    //       },
    //     ],
    //     exclude: /node_modules/,
    //   },
    // ],
    rules: [
      {
        test: /\.tsx?$/,
        use: "builtin:swc-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  plugins: [
    new rspack.container.ModuleFederationPlugin({
      name: "plugin_loader",
      filename: "remoteEntry.js",
      runtimePlugins: [
        require.resolve("@module-federation/node/runtimePlugin"),
      ],
      exposes: {
        "./plugin": "./src/index.ts",
      },
      shared: {
        "@curatedotfun/types": {
          singleton: true,
        },
      },
    }),
  ],
};
