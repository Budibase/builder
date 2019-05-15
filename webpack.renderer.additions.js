const webpack = require('webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const mode = process.env.NODE_ENV || 'development';
const prod = mode === 'production';

module.exports = {
	
	entry: {
		index: ['./src/index.js']
	},
	
	resolve: {
		extensions: ['.mjs', '.js', '.html']
	},
	
	/*output: {
		path: __dirname + '/public',
		filename: '[name].js',
		chunkFilename: '[name].[id].js'
	},*/

	module: {
		rules: [
			{
				test: /\.html$/,
				exclude: /node_modules/,
				use: {
					loader: 'svelte-loader',
					options: {
						emitCss: true,
						hotReload:true
					}
				}
			},
			{
				test: /\.(png|jpg|gif|woff2)$/,
				use: [
					{
						loader: 'file-loader',
						options: {
							name: '[path][name].[ext]'
						},
					},
				]
			},
			{
				test: /\.css$/,
				use: [
					MiniCssExtractPlugin.loader,
					'css-loader'
				]
			}
		]
	},
	
	mode,
	
	plugins: [
		new MiniCssExtractPlugin({
			filename: './[name].css'
		})
	],
	
	devtool: prod ? false: 'source-map'
};