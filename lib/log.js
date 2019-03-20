'use strict';

var util = require('util');
var colors = require('colors/safe');

module.exports = function(opts) {

    let log = colors;
    opts = opts || ['http', 'info', 'debug', 'star', 'warn', 'error'];

    Object.defineProperty(_fw, '_logger', {
        configurable: true,
        enumerable: true,
        get: function() {
            return process.env._logger == 'false' ? false : true;
        }
    });

    return _.extend(log, {

        info: function() {
            if (_fw._logger && opts.indexOf('info') != -1) console.log(colors.grey(util.format.apply(this, arguments)));
        },

        debug: function() {
            if (_fw._logger && opts.indexOf('debug') != -1) console.log(colors.blue(util.format.apply(this, arguments)));
        },

        star: function() {
            if (_fw._logger && opts.indexOf('star') != -1) console.log(colors.yellow.underline(util.format.apply(this, arguments)));
        },

        warn: function() {
            if (_fw._logger && opts.indexOf('warn') != -1) console.log(colors.yellow(util.format.apply(this, arguments)));
        },

        error: function() {
            if (_fw._logger && opts.indexOf('error') != -1) console.log(colors.red(util.format.apply(this, arguments)));
        },

        sys: function() {
            if (_fw._logger) console.log(colors.green(util.format.apply(this, arguments)));
        },

    });

};
