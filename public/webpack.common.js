const webpack = require('webpack'),
  CleanWebpackPlugin = require('clean-webpack-plugin'),
  MiniCssExtractPlugin = require("mini-css-extract-plugin"),
  HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  context: __dirname,
  entry: {
    app: './main.js',
    api_docs: './api_docs/index.js'
  },
  output: {
    path: __dirname + '/dist',
    filename: '[name].js'
  },
  module: {
    rules: [{
      test: /\.css$/,
      use: [
        MiniCssExtractPlugin.loader,
        'css-loader'
      ]
    },{
      test: /\.(eot|svg|ttf|woff|woff2)$/,
      loader: 'file-loader?name=fonts/[name].[ext]'
    },{
      test: /\.(png|jpg|ico|gif)$/,
      loader: 'file-loader?name=images/[name].[ext]'
    },{
      test: /\.html$/, loader: 'raw-loader'
    }]
  },
  optimization: {
    splitChunks: {
      chunks: 'all'
    }
  },
  plugins: [
    new CleanWebpackPlugin(
      ['dist']
    ),
    new MiniCssExtractPlugin({
      filename: '[name].css'
    }),
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: './index.html',
      excludeChunks: [ 'api_docs' ]
    }),
    new HtmlWebpackPlugin({
      filename: 'api_docs/index.html',
      template: './api_docs/index.html',
      excludeChunks: [ 'app' ]
    }),
    new webpack.ProvidePlugin({
      'window.jQuery': 'jquery',
      'jQuery': 'jquery'
    })
  ]
};
