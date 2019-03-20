/*
 * @Author: binchem
 * @Date:   2016-04-16 23:09:08
 * @Last Modified by:   able
 * @Last Modified time: 2016-05-01 22:33:20
 *
 *  EXPIRE CACHE:binchem 1   // 设置1它立刻过期
 *
 * 
 */

'use strict';

var redis = require("redis");
var evts = global['__fw_cache_expired_evts'] = {};

class Cache {

    constructor() {

        if (!this.config) return;

        log.debug(' >>>>> createClient of redis ...');

        let conf = this.config;
        this.client = redis.createClient(conf);
        this.subClient = redis.createClient(conf);
        this.subClient.psubscribe('__key*__:*');

        this.client.on("error", (err) => {
            log.error(err);
        });

        this.subClient.on("pmessage", (pattern, channel, message) => {
            if (channel == '__keyevent@' + conf.db + '__:expired') {
                log.debug(message, 'expired');
                _.forEach(evts, (v, k) => {
                    if (new RegExp(k.replace(/\*/g, '.*')).test(message)) {
                        v(message);
                    }
                });
            }
        });

        return _.defaults(this.client, {
            onExpire: function(name, fn) {
                evts[conf.prefix + name] = fn;
            }
        });
    }

    get config() {
        return _fw.config.cache_redis;
    }
}

exports = module.exports = new Cache();
