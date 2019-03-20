/*
 * @Author: binchem
 * @Date:   2016-04-15 22:52:15
 * @Last Modified by:   keny
 * @Last Modified time: 2017-08-18 13:55:56
 */

'use strict';

var path = require('path');
var plus = require('./plus');
var utils = require('./utils');
var bodyParser = require('body-parser');
var log4js = require('log4js');

log4js.configure({
    appenders: [{
            type: 'console',
        }, //控制台输出
        {
            type: 'dateFile', //文件输出
            filename: process.cwd() + '/logs/',
            pattern: "yyyyMMdd.log",
            alwaysIncludePattern: true,
            maxLogSize: 20480,
            backups: 10,
            category: 'app'
        },{
            type: 'dateFile', //文件输出
            filename: process.cwd() + '/logs/',
            pattern: "bank_yyyyMMdd.log",
            alwaysIncludePattern: true,
            maxLogSize: 20480,
            backups: 10,
            category: 'app-bank'
        }
    ],
    // replaceConsole: true,
    levels: {
        app: 'INFO',
    }
});
global._ = require('lodash');
global.moment = require('moment');
global._fw = global.yy = {};
global.log = require('./log')();
global.logger = log4js.getLogger('app');
global.loggerBank = log4js.getLogger('app-bank');

function createFw() {
    _fw.paths = {
        fwRoot: path.resolve(__dirname, '../'),
        root: process.cwd(),
    };
    _fw.express = require('./express');
    _fw.app = _fw.express();
    _fw.csrf = new require('csrf')();
    _fw.config = {};
    _fw.plus = {};
    _fw.subapps = {};

    return _fw.init();
}

_fw.init = function init() {

    // 获取子模块列表
    this.plus = plus();

    // 加载配置文件
    log.debug('1、开始加载配置文件。');
    this.config = require('./loadConfigs')();

    // 以当前配置重新加载log
    global.log = require('./log')(this.config.log);

    _fw.app.set('trust proxy', true);

    let sessConfs = _.cloneDeep(_fw.config.session);
    if (sessConfs) {
        let session = require('express-session');
        if (sessConfs.store) {
            sessConfs.store = new(require('connect-redis')(session))(sessConfs.store);
        }
        _fw.app.use(session(sessConfs));
    }

    _fw.app.use(bodyParser.json());
    _fw.app.use(bodyParser.urlencoded({
        extended: true
    }));
    _fw.app.use(require('cookie-parser')());

    if (_fw.config.log && _fw.config.log.indexOf('http') > -1) _fw.app.use(require('morgan')('short'));

    _fw.engines = {
        ejs: require('ejs-locals'),
        pug: require('jade'),
    };

    // 加载模块的路由
    log.debug('2、开始加载模块。');
    this.plus.setup();

    let rts = [];
    _.forEach(this.routes, (p) => {
        _.forEach(p.routes, (r) => {
            rts.push({
                name: r.name,
                verb: r.verb.toUpperCase(),
                path: r.path,
                scope: '@' + p.plus_name,
                process: r.handlers.map(o => o.fn && o.fn.name || 'fn').join('->')
            });
        });
    });

    _fw.app['get']('/_apilist', function(req, res, next) {
        return res.json(rts);
    });

    _fw.app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.error(err);
    });

    log.warn('=[verb]==[path]====================================[name]==============[scope]==========[process]=========');
    _.forEach(rts, (r, i) => {
        if (i % 2)
            log.sys(' ', _.padEnd(r.verb, 7), _.padEnd(r.path, 40), _.padEnd(r.name, r.name && (20 - utils.gbkLen(r.name)) || 20), _.padEnd(r.scope, 15), r.process);
        else
            log.warn(' ', _.padEnd(r.verb, 7), _.padEnd(r.path, 40), _.padEnd(r.name, r.name && (20 - utils.gbkLen(r.name)) || 20), _.padEnd(r.scope, 15), r.process);
    });
    log.warn('==========================================================================================================');

    return this;
};

_fw.view_engine = function(app, plus) {

    let p = _fw.plus.list[plus.plus_name];
    app.set('views', p.paths.views);
    app.set('plus_name', plus.plus_name);

    switch (plus.view_engine) {
        case 'pug':
            app.engine('.jade', _fw.engines['pug'].renderFile);
            app.set('view engine', 'jade');
            break;
        case 'ejs':
            app.engine('.html', _fw.engines['ejs']);
            app.set('view engine', 'html');
            break;
        default:
            throw new Error('错误，暂不支持的模版引擎：' + plus.view_engine);
    }

    app.use('/' + plus.plus_name, _fw.express.static(p.paths.public));
};

_fw.currentApp = function(dirname) {
    return _fw.subapps[path.basename(dirname)];
};

_fw.getFnParams = function(fn) {
    if (typeof fn != 'function') return [];
    try {
        fn = fn.toString().match(/(function)*\s*[^(]*\(([^)]*)\)/);
        if (!_.isArray(fn)) return [];
        return fn[2].split(/\s*,\s*/);
    } catch (e) {
        log.error(e);
        return [];
    }
};

_fw.createCsrf = function(req) {
    if (!req && !req.session) return '';
    req.session.csrfSecret = req.sessionID;
    return _fw.csrf.create(req.sessionID);
};

exports = module.exports = createFw();