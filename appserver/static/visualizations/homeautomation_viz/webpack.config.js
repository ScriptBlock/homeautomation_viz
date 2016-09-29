var webpack = require('webpack');
var path = require('path');

module.exports = {
    entry: 'homeautomation_viz',
    resolve: {
        root: [
            path.join(__dirname, 'src'),
        ]
    },
    output: {
        filename: 'visualization.js',
        libraryTarget: 'amd'
    },
    externals: [
        'vizapi/SplunkVisualizationBase',
        'vizapi/SplunkVisualizationUtils',
        'splunkjs/mvc',
        'splunkjs/mvc/utils',
        'splunkjs/mvc/tokenutils'
    ]
};