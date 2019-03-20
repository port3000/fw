/*
 * @Author: binchem
 * @Date:   2016-04-16 13:19:18
 * @Last Modified by:   able
 * @Last Modified time: 2016-09-05 14:17:30
 */

'use strict';

var fs = require('fs');
var path = require('path');
var requireAll = require('./requireAll');

exports = module.exports = function(root) {
    root = root || process.cwd();
    let plist;

    let getinfo = function(scope, p, dir) {
        return {
            name: p,
            scope: scope,
            get pkg() {
                return require(path.resolve(dir, 'package.json'))
            },
            paths: {
                root: path.resolve(dir),
                config: path.resolve(dir, 'config'),
                policies: path.resolve(dir, 'policies'),
                responses: path.resolve(dir, 'responses'),
                controllers: path.resolve(dir, 'controllers'),
                dal: path.resolve(dir, 'dal'),
                routes: path.resolve(dir, 'routes'),
                public: path.resolve(dir, 'public'),
                views: path.resolve(dir, 'views'),
            }
        };
    };

    let getfns = function(handlers) {
        let fns = [];
        let policies = _fw.policies;
        if (!_.isArray(handlers)) handlers = [handlers];

        let _policies = handlers[0].policies || 'isPublic';
        if (!_.isArray(_policies)) _policies = [_policies];

        if (handlers[0].cors && _fw.config.cors) {
            fns.push({
                fn: policies['cors']
            });
        }

        _.forEach(_policies, (pls) => {
            fns.push({
                fn: policies[pls]
            });
        });

        _.forEach(handlers, (handler, i) => {

            if (_.isFunction(handler)) {
                fns.push({
                    fn: handler
                });
            } else if (_.isPlainObject(handler)) {
                if (handler.fn) {
                    fns.push({
                        fn: handler.fn
                    });
                } else if (handler.controller && handler.action) {
                    fns.push({
                        fn: global[handler.controller][handler.action],
                        controller: handler.controller,
                        action: handler.action
                    });
                } else if (handler.view) {
                    fns.push({
                        fn: function() {
                            return this.res.render(handler.view, handler.locals || {});
                        }
                    });
                }
            } else {
                log.error('无效的路由：', verb, regexp);
            }
        });

        return fns;
    };

    let explain = function(regexp, routes) {
        var handler = routes[regexp];
        var verbExpr = /^(all|get|post|put|delete)\s+/i;
        var verb = _.last(regexp.match(verbExpr) || []) || '';
        verb = verb.toLowerCase();

        if (verb) regexp = regexp.replace(verbExpr, '');
        else verb = 'get';

        return {
            name: _.isArray(handler) ? handler[0].name : handler.name,
            verb: verb,
            path: regexp,
            handlers: getfns(handler)
        };
    };

    let param = function(req, name) {
        var params = req.params || {};
        var body = req.body || {};
        var query = req.query || {};
        if (null != params[name] && params.hasOwnProperty(name)) return params[name];
        if (null != body[name]) return body[name];
        if (null != query[name]) return query[name];
        return null;
    };

    let getParams = function(fn, req) {
        return _fw.getFnParams(fn).map(function(k) {
            return param(req, _.trim(k));
        });
    };

    return {

        get list() {
            if (plist) return plist;

            log.debug('[DEBUG] 扫描子模块...');
            plist = {};
            if (fs.existsSync(path.resolve(root, 'node_modules'))) {
                fs.readdirSync(path.resolve(root, 'node_modules')).forEach((dir) => {
                    if (dir.indexOf('@') == 0) {
                        let scope = dir;
                        dir = path.resolve(root, 'node_modules', dir);
                        fs.readdirSync(dir).filter(n => n != 'fw').map((p) => {
                            if (!/^[0-9a-z-]+$/.test(p)) {
                                log.error('错误，发现不符合规范的模块名（只能包含数字和小写字母）: ' + p);
                                return;
                            }
                            if (plist[p])
                                throw new Error('错误，发现重复的模块名: ' + p);
                            plist[p] = getinfo(scope, p, path.resolve(dir, p));
                        });
                    }
                });
            }
            plist[path.basename(root).toLowerCase()] = getinfo('/', path.basename(root).toLowerCase(), root);
            return plist;
        },

        setup: function() {
            let tmp;

            log.debug('[DEBUG] 加载 responses、policies、controllers...');

            let responses = requireAll(path.resolve(_fw.paths.fwRoot, 'lib/responses'));
            let policies = requireAll(path.resolve(_fw.paths.fwRoot, 'lib/policies'));
            let controllers = requireAll(path.resolve(_fw.paths.fwRoot, 'lib/controllers'));
            _.extend(global, controllers); // 预先装载框架的controllers

            let dal = requireAll(path.resolve(_fw.paths.fwRoot, 'lib/dal'));
            let routes = [];

            _.forEach(plist, (p, n) => {
                tmp = requireAll(path.resolve(p.paths.responses));
                // 检查是否有冲突的 response
                for (var k in responses) {
                    if (Object.keys(tmp).indexOf(k) > -1) log.error(`已被重写 response：${p.scope} >> ${k}`);
                }
                _.merge(responses, tmp);

                tmp = requireAll(path.resolve(p.paths.policies));
                for (var k in policies) {
                    if (Object.keys(tmp).indexOf(k) > -1) log.error(`已被重写 policies：${p.scope} >> ${k}`);
                }
                _.merge(policies, tmp);

                tmp = requireAll(path.resolve(p.paths.controllers));
                // 检查是否有冲突的 controllers
                for (var k in controllers) {
                    if (Object.keys(tmp).indexOf(k) > -1) throw new Error(`错误，发现重复定义的 controllers：${p.scope} >> ${k}`);
                }
                _.defaults(controllers, tmp);

                tmp = requireAll(path.resolve(p.paths.dal));
                // 检查是否有冲突的 dal
                for (var k in dal) {
                    if (Object.keys(tmp).indexOf(k) > -1) throw new Error(`错误，发现重复定义的 dal：${p.scope} >> ${k}`);
                }
                _.defaults(dal, tmp);

                tmp = requireAll(path.resolve(p.paths.routes));
                let rts = {};
                for (var rf in tmp) {
                    _.extend(rts, tmp[rf]);
                }
                // 检查是否有冲突的 routes (允许启动项目覆盖)
                for (var i = 0; i < routes.length; i++) {
                    for (var k in routes[i].routes) {
                        if (Object.keys(rts).indexOf(k) > -1) {
                            if (p.scope != '/')
                                throw new Error(`错误，发现重复定义的 routes：${p.scope} >> ${k}`);
                            else {
                                log.warn(`警告，发现重复定义的 routes：${p.scope} >> ${k}，(只允许启动项目覆盖)`);
                            }
                        }
                    }
                }

                rts = {
                    plus_name: p.name,
                    routes: rts,
                    view_engine: p.view_engine
                };

                routes.push(rts);
            });

            // responses 直接附加到res
            _.defaults(_fw.app.response.__proto__, responses);
            // policies 添加到_fw留待使用
            _fw.policies = policies;
            // dal 附加到每个controllers
            _.forEach(controllers, (ctl, k) => {
                if (ctl.model) {
                    let adapter = _fw.config.connections[ctl.model.connection].adapter || 'mysql';
                    _.defaults(ctl, _.cloneDeep(dal[adapter]));
                }
            });
            // controllers 直接附加到global，变成全局变量
            _fw.controllers = controllers;
            _.extend(global, controllers);

            // 启动路由
            _.forEach(routes, (plus) => {
                for (var regexp in plus.routes) {
                    plus.routes[regexp] = explain(regexp, plus.routes);
                }

                let app = _fw.subapps[plus.plus_name] = _fw.express();
                app.set('trust proxy', true);

                // if (plus.view_engine) _fw.view_engine(app, plus); // 移到了后面
                let startfile = path.resolve(_fw.plus.list[plus.plus_name].paths.root, 'index.js');
                if (fs.existsSync(startfile)) require(startfile);

                _.forEach(plus.routes, (route) => {
                    let fns = [];
                    _.forEach(route.handlers, (handler, idx) => {
                        fns.push(function wapper(req, res, next) {
                            // let fn = _.cloneDeep(handler.fn);
                            _.defaults(res.locals, req.params, { pjax: req.header('X-PJAX') || req.query._pjax || false });

                            let go = (_u) => {
                                if (_u && _u.uid > 0) {
                                    log.star('>>> reload to session');
                                    req.session.user = _u;
                                }
                                res.locals.user = req.session && req.session.user || {};

                                let ctrl = {};
                                if (handler.controller) {
                                    ctrl = global[handler.controller];
                                }
                                let fn = _.bind(handler.fn, _.extend({
                                    idx: idx + 1,
                                    req: req,
                                    res: res,
                                    next: next,
                                    user: res.locals.user
                                }, ctrl || {}));
                                fn.apply(ctrl, getParams(handler.fn, req));
                            };

                            if (req.session && req.session.user && req.session.user._reload == true && _fw.reloadSession) {
                                log.star('>>>>>>>> eq.session.user._reload == true');
                                // delete req.session.user._reload;
                                _fw.reloadSession(req.session.user, go);
                            } else go();
                        });
                    });
                    let rt = app.route(route.path);
                    rt[route.verb].apply(rt, fns);
                });

                if (plus.view_engine) _fw.view_engine(app, plus);

                app.use(function(err, req, res, next) {
                    res.status(err.status || 500);
                    res.error(err);
                });
                _fw.app.use(app);

            });
            _fw.routes = routes;
        },
    }
};
