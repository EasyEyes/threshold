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

const white = "color: white;";
const green = "color: green;";

module.exports = (env, options) => {
  const extra = {};
  if (options.name) {
    // prettier-ignore
    console.log(`
      ==- \x1b[32m\x1b[1mEasyEyes Threshold Example Dev\x1b[22m\x1b[0m -================================${'='.repeat(options.name.length)}======
      ====================================================================${'='.repeat(options.name.length)}======

      Go to >>>   \x1b[36mhttp://localhost:5500/docs/threshold/threshold/examples/${options.name}   \x1b[0m<<<

      OR (If your ROOT is at \`participant\` threshold)
            >>>   \x1b[36mhttp://localhost:5500/examples/${options.name}                            \x1b[0m<<<

      ====================================================================${'='.repeat(options.name.length)}======

`);
    extra.output = {
      path: __dirname + `/examples/${options.name}/js`,
      filename: "threshold.min.js",
      sourceMapFilename: "threshold.min.js.map",
    };
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
