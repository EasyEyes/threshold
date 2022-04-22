/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-undef */

const webpack = require("webpack");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const path = require("path");

const config = {
  entry: "./threshold.js",
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
    ],
  },
  devtool: "source-map",
  output: {
    path: __dirname + "/js",
    publicPath: "js/",
    filename: "threshold.min.js",
    sourceMapFilename: "threshold.min.js.map",
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
      filename: "threshold.min.js",
      sourceMapFilename: "threshold.[contenthash].min.js.map",
    };
  } else if (env.development) {
    throw new Error(
      "You have to specify a name for the build, e.g., `npm start -- --name=demoExperiment`."
    );
  }

  if (env.development) {
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
      ],
      // watch: true,
      devtool: "source-map",
      devServer: {
        port: 5500,
        static: {
          directory: path.join(__dirname, `examples/${options.name}`),
          publicPath: `/`,
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
    });
  }
};
