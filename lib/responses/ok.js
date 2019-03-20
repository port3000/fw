/*
 * @Author: binchem
 * @Date:   2016-04-16 17:25:15
 * @Last Modified by:   able
 * @Last Modified time: 2016-08-29 15:59:24
 *
 *     res.ok();                   //=> { }
 *     res.ok([Object]);           //=> [Object]
 *     
 *     res.ok('信息');             //=> { message: '信息' }
 *     res.ok([Object], {          //=> { message: '信息', code: 1, data: data, .... } 
 *         message: '信息',
 *         code: 1,
 *         // 自定义属性
 *         // ...
 *     });
 * 
 */


'use strict';

module.exports = function ok(data, ext) {

    log.debug('>>>> ok ');

    this.status(200);

    if (arguments.length == 0 || !data) return this.json({});

    let resp = {};

    if (typeof data == 'string') {
        resp['message'] = data;
    } else resp = data;

    if (ext && _.isPlainObject(ext)) {
        _.merge(resp, ext);
    }

    if (this.req && this.req.query['_count'] == 'view') {

        let opts = _.defaultsDeep(resp, {
            query: this.req.query,
            location: this.req.url,
            isXhr: this.req.xhr,
            settings: { views: _fw.paths.fwRoot + '/views' }
        });

        return this.render('table', opts);

    } else {
        delete resp.query;
        return this.json(resp);
    }
};
