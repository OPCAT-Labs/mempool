const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = (config) => {
  config.optimization.minimize = true;
  config.optimization.mangleExports = false;
  config.optimization.minimizer = [
    new TerserPlugin({
      terserOptions: {
        compress: {
          keep_classnames: true,
          keep_fnames: true,
          global_defs: {
            ngDevMode: false,
            ngJitMode: false,
            ngI18nClosureMode: false,
          },
        },
        mangle: false,
        format: {
          comments: false,
        },
      },
      extractComments: false,
    }),
  ];

  // Resolve fallbacks and aliases
  config.resolve = config.resolve || {};
  config.resolve.fallback = {
    ...(config.resolve.fallback || {}),
    "crypto": require.resolve("crypto-browserify"),
    "stream": require.resolve("stream-browserify"),
    "buffer": require.resolve("buffer/"),
    "util": require.resolve("util/"),
    "vm": false,
    "process": require.resolve("process/browser"),
  };
  config.resolve.alias = {
    ...(config.resolve.alias || {}),
    '@opcat-labs/cat-sdk': '@opcat-labs/cat-sdk/dist/cjs/index.js',
  };

  // Add plugins
  config.plugins = config.plugins || [];
  config.plugins.push(
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
    })
  );

  return config;
};
