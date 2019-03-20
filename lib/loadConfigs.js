/*
 * @Author: binchem
 * @Date:   2016-04-16 09:10:46
 * @Last Modified by:   able
 * @Last Modified time: 2016-05-26 18:49:06
 */

'use strict';

var path = require('path');
var requireAll = require('./requireAll');

exports = module.exports = function() {

    let env = process.env.NODE_ENV || 'development';

    // 默认配置 
    let defaults = require('./config');
    let config = defaults.tmpl;

    // 加载启动项目配置，以启动项目配置为主，覆盖默认配置。
    let startupConfigs = requireAll(path.resolve(_fw.paths.root, 'config'));
    // if (!startupConfigs || !startupConfigs[env]) {
    //     throw new Error('错误：找不到启动项目的对应配置文件。env：' + env);
    // }
    startupConfigs = startupConfigs[env];
    let _log = _.clone(startupConfigs && startupConfigs.log || config.log);
    _.merge(config, startupConfigs);

    // 加载子模块配置，只加载模块个性化配置项（即：默认配置和启动项目配置合并后都没有的项）。
    _.forEach(_fw.plus.list, (p, n) => {
        if (p.scope == '/') {
            p.view_engine = startupConfigs && startupConfigs.view_engine || false;
            return;
        }

        let plusConfigs = requireAll(p.paths.config);
        if (!plusConfigs || !plusConfigs[env]) {
            // throw new Error('错误：找不到子模块的对应配置文件。env：' + env + ', name: ' + n);
            log.warn('错误：找不到子模块的对应配置文件。env：' + env + ', name: ' + n);
            plusConfigs = {};
        } else {
            plusConfigs = plusConfigs[env];
        }

        // 获取子模块的模版引擎
        p.view_engine = plusConfigs.view_engine || startupConfigs && startupConfigs.view_engine || false;

        _.defaultsDeep(config, plusConfigs);
    });

    _.forEach(config.connections, (cf) => {
        // 加载 mysql 默认配置
        if (typeof cf.adapter == 'undefined' || cf.adapter.toLowerCase() == 'mysql') {
            _.defaultsDeep(cf, defaults.db.mysql);
        }
        // 加载 redis 默认配置
        if (cf.adapter && cf.adapter.toLowerCase() == 'redis') {
            _.defaultsDeep(cf, defaults.db.redis);
        }
    });

    // 修正数组合并问题
    config.log = _log;

    log.info('===== 确认启动配置 ==============================');
    log.info(config);
    log.info('===== 确认启动配置 ==============================');

    return config;
};
