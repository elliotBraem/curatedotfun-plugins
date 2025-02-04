const path = require("path");
const { rspack } = require("@rspack/core");

module.exports = {
  entry: "./src/index",
  mode: process.env.NODE_ENV === "development" ? "development" : "production",
  target: "async-node",
  devtool: "source-map",
  output: {
    uniqueName: "host",
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
      name: "host",
      filename: "remoteEntry.js",
      remoteType: "script",
      isServer: true,
      useRuntimePlugin: true,
      shared: {
        "@curatedotfun/types": {
          singleton: true,
        },
      },
    }),
  ],
};
