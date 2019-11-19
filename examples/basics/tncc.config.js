// eslint-disable-next-line
const webpack = require('webpack')

module.exports = {
  webpack: config => {
    config.plugins.push(new webpack.IgnorePlugin(/^pg-native$/))
    return config
  },
}
