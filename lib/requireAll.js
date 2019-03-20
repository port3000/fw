'use strict';

var fs = require('fs');

module.exports = function requireAll(dirname) {

    var modules = {};
    var files;

    try {
        files = fs.readdirSync(dirname);
    } catch (e) {
        return {};
    }

    files.forEach(function(file) {

        var filepath = dirname + '/' + file;

        if (fs.statSync(filepath).isDirectory()) {
            if (file.match(/^\./)) return;
            modules[file] = requireAll(filepath);

        } else {
            var match = file.match(/^([^\.].*)\.js(on)?$/);
            if (!match) return;
            modules[match[1]] = require(filepath);
        }
    });

    return modules;
};
