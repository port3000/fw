/*
 * @Author: binchem
 * @Date:   2016-04-16 17:25:15
 * @Last Modified by:   binchem
 * @Last Modified time: 2016-12-27 10:58:28
 *
 *     res.fail();                   //=> { message: '操作失败(未定义的原因)' }
 *     res.fail('信息');            //=> { message: '信息' }
 *     res.fail('信息', {          //=> { message: '信息', code: 1, data: data, .... }  (status=200)
 *         status: 200,
 *         code: 1,
 *         // 自定义属性
 *         // ...
 *     });
 * 
 */

'use strict';

module.exports = function fail(err, ext) {
    log.warn(err);
    this.status(200);

    let resp = {};
    if (typeof err == 'string') resp['message'] = err;
    else if (typeof err == 'object') {
        resp['message'] = err.code || err.message || 'ERR_UNDEFINED_ERROR';
    }

    if (ext && _.isPlainObject(ext)) {
        if (ext.status) {
            this.status(ext.status);
            delete ext.status;
        }
        _.merge(resp, ext);
    }

    // if (this.req.xhr)
    return this.json(resp);
    // else
    // return this.render('error', resp);
    // return this.send(resp.message);
};
