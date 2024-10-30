// webpack.config.js
import path from 'path';
import { fileURLToPath } from 'url';
import webpack from 'webpack';
import CopyWebpackPlugin from 'copy-webpack-plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  entry: './src/neataptic.js',
  output: {
    filename: 'neataptic.min.js',
    path: path.resolve(__dirname, 'dist'),
    library: 'neataptic',
    libraryTarget: 'umd',
    globalObject: 'this',
  },
  mode: 'production',
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
          },
        },
      },
    ],
  },
  plugins: [
    new webpack.NoEmitOnErrorsPlugin(),
    new webpack.optimize.ModuleConcatenationPlugin(),
    // new CopyWebpackPlugin([
    //   {
    //     from: path.resolve(__dirname, '/src/multithreading/workers/node/worker.js'),
    //     to: path.resolve(__dirname, 'dist')
    //   }
    // ]),
    new CopyWebpackPlugin({
      patterns: [
        { from: './src/multithreading/workers/node/worker.js', to: '.' }, // Chỉnh sửa 'source' và 'destination' theo nhu cầu của bạn
      ],
    }),
  ],
  optimization: {
    minimize: true,
  },
  resolve: {
    extensions: ['.js'],
  },
  externals: [
    'child_process',
    'os'
  ],
  node: {
    __dirname: false
  }
};
