const path = require("path");
const { rspack } = require("@rspack/core");

module.exports = {
  entry: "./src/index",
  mode: process.env.NODE_ENV === "development" ? "development" : "production",
  target: "async-node",
  devtool: "source-map",
  output: {
    uniqueName: "telegram",
    publicPath: "auto",
    path: path.resolve(__dirname, "dist"),
    clean: true,
    library: { type: "commonjs-module" },
  },
  devServer: {
    static: path.join(__dirname, "dist"),
    hot: true,
    port: 3003,
    devMiddleware: {
      writeToDisk: true,
    },
  },
  module: {
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
      name: "telegram",
      filename: "remoteEntry.js",
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
