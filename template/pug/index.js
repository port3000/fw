/*
 * @Author: binchem
 * @Date:   2016-04-20 22:04:16
 * @Last Modified by:   able
 * @Last Modified time: 2016-09-01 10:43:15
 */

'use strict';

var app = exports = module.exports = _fw.currentApp(__dirname);

app.param('uid', function(req, res, next, uid) {
    if (/^\d+$/.test(uid)) return next();
    return next('route');
});

app.param('id', function(req, res, next, id) {
    if (/^\d+$/.test(id)) return next();
    return next('route');
});
