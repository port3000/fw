/*
 * @Author: binchem
 * @Date:   2016-04-14 10:58:05
 * @Last Modified by:   binchem
 * @Last Modified time: 2016-04-20 10:55:42
 */

'use strict';

var EventEmitter = require('events').EventEmitter;
var proto = require('./app');
var Router = require('router');
var req = require('./request');
var res = require('./response');

/**
 * Expose `createApplication()`.
 */

exports = module.exports = createApplication;

/**
 * Create an express application.
 *
 * @return {Function}
 * @api public
 */

function createApplication() {

    let app = function(req, res, next) {
        app.handle(req, res, next);
    };

    _.defaults(app, EventEmitter.prototype);
    _.defaults(app, proto);

    app.request = { __proto__: req, app: app };
    app.response = { __proto__: res, app: app };
    app.init();

    return app;
}

/**
 * Expose the prototypes.
 */

exports.application = proto;
exports.request = req;
exports.response = res;

/**
 * Expose constructors.
 */

exports.Route = Router.Route;
exports.Router = Router;

/**
 * Expose middleware
 */

exports.static = require('serve-static');
