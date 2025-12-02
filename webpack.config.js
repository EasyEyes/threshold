/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-undef */

const webpack = require("webpack");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const path = require("path");

const config = {
  entry: {
    first: "./first.js",
    threshold: "./threshold.js",
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        use: "babel-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },
      {
        test: /\.mp3$/,
        loader: "file-loader",
        options: {
          name: "[name].[ext]",
        },
      },
      {
        test: /\.wasm$/,
        type: "asset/inline",
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".js"],
    fallback: {
      // WASM modules may need these
      fs: false,
      path: false,
    },
  },
  devtool: "source-map",
  output: {
    path: __dirname + "/js",
    publicPath: "js/",
    filename: "[name].min.js",
    sourceMapFilename: "[name].min.js.map",
  },
  optimization: {
    runtimeChunk: "single",
    splitChunks: {
      chunks: "all",
      cacheGroups: {
        // Force WASM-related code into main bundle (no separate chunk)
        wasmInline: {
          test: /@rust/,
          name: "threshold",
          chunks: "all",
          enforce: true,
        },
      },
    },
  },
};

const plugins = [new CleanWebpackPlugin()];

module.exports = (env, options) => {
  const extra = {};

  if (options.name) {
    // prettier-ignore
    console.log(`
        ==- \x1b[32m\x1b[1mEasyEyes Threshold Example Dev\x1b[22m\x1b[0m -=========================
        =============================================================

        Start developing \x1b[1m\x1b[32m\x1b[1m${options.name}\x1b[22m\x1b[0m.
        Threshold participant development now uses Webpack DevServer.
        (No need to start VSCode Live Server.)

        Go to \x1b[36mhttp://localhost:5500\x1b[0m directly.

        =============================================================

`);
    extra.output = {
      path: path.join(__dirname, `examples/${options.name}/js`),
      publicPath: `/js/`,
      filename: "[name].min.js",
      sourceMapFilename: "[name].[contenthash].min.js.map",
    };
  } else if (env.development) {
    throw new Error(
      "You have to specify a name for the build, e.g., `npm start -- --name=demoExperiment`.",
    );
  }

  if (env.development) {
    const BundleAnalyzerPlugin =
      require("webpack-bundle-analyzer").BundleAnalyzerPlugin;
    return Object.assign({}, config, {
      ...extra,
      mode: "development",
      optimization: {
        minimize: false,
      },
      plugins: [
        ...plugins,
        new webpack.ProgressPlugin(),
        new webpack.DefinePlugin({
          "process.env.debug": true,
        }),
        new BundleAnalyzerPlugin({
          analyzerMode: "disabled",
          generateStatsFile: true,
          statsOptions: {
            source: false,
          },
        }),
      ],
      // watch: true,
      devtool: "source-map",
      devServer: {
        port: 5500,
        open: true,
        static: {
          directory: path.join(__dirname, `examples/${options.name}`),
          publicPath: `/`,
        },
        headers: {
          "Cross-Origin-Embedder-Policy": "require-corp",
          "Cross-Origin-Opener-Policy": "same-origin",
        },
      },
    });
  } else if (env.production) {
    return Object.assign({}, config, {
      mode: "production",
      optimization: {
        minimize: true,
      },
      plugins: [
        ...plugins,
        new webpack.DefinePlugin({
          "process.env.debug": false,
        }),
      ],
      devtool: "source-map",
    });
  }
};
