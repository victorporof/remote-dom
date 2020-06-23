module.exports = {
  devtool: "source-map",
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env"],
            plugins: [["@babel/plugin-transform-runtime", { corejs: 3 }]],
          },
        },
      },
    ],
  },
  resolve: {
    extensions: ["*", ".js"],
    alias: {
      debug: "debug-es5",
    },
  },
};
