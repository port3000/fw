/*
 * @Author: binchem
 * @Date:   2016-04-18 13:32:02
 * @Last Modified by:   able
 * @Last Modified time: 2016-08-18 21:28:59
 */

'use strict';

var mysql = require('mysql');

_fw.connections = _fw.connections || {};

_.each(_fw.config.connections, function(cfs, name) {
    if (typeof cfs.adapter == 'undefined' || cfs.adapter == 'mysql') {
        _fw.connections[name] = mysql.createPool(cfs);
        _fw.connections[name].on('connection', function(connection) {
            log.debug(log.black.bgWhite('mySql > '), 'connected as id ' + connection.threadId);
        });
        process.nextTick(function() {
            _fw.connections[name].on('enqueue', function() {
                log.warn(log.black.bgWhite('mySql > '), 'Waiting for available connection slot.');
            });
        });
    }
});

exports = module.exports = function query(sql, values, cb) {
    log.debug('>> into query');
    _fw.connections[this.model.connection || 'mysql'].getConnection(function(err, conn) {
        if (err) return log.error(err);

        var _query;
        if (_.isFunction(values)) {
            _query = conn.query(sql, function(err, rows, fields) {
                conn.release();
                values(err, rows, fields);
            });
        } else if (_.isFunction(cb)) {
            _query = conn.query(sql, values, function(err, rows, fields) {
                conn.release();
                cb(err, rows, fields);
            });
        }

        log.debug(_query.sql);
        return _query;
    });

};
