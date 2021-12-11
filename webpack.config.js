/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-undef */

const webpack = require("webpack");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");

const config = {
  entry: "./threshold.js",
  module: {
    rules: [
      {
        test: /\.js/,
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
    ],
  },
  devtool: "source-map",
  output: {
    path: __dirname + "/js",
    filename: "threshold.min.js",
    sourceMapFilename: "threshold.min.js.map",
  },
};

const plugins = [new webpack.ProgressPlugin(), new CleanWebpackPlugin()];

module.exports = (env, options) => {
  const extra = {};
  if (options.name)
    extra.output = {
      path: __dirname + `/examples/${options.name}/js`,
      filename: "threshold.min.js",
      sourceMapFilename: "threshold.min.js.map",
    };

  if (env.development) {
    return Object.assign({}, config, {
      ...extra,
      mode: "development",
      optimization: {
        minimize: false,
      },
      plugins: [
        ...plugins,
        new webpack.DefinePlugin({
          "process.env.debug": true,
        }),
      ],
      watch: true,
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
