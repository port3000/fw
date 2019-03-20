/*
 * @Author: binchem
 * @Date:   2016-04-16 17:25:15
 * @Last Modified by:   able
 * @Last Modified time: 2016-05-18 13:45:58
 *
 *     res.error();                   //=> { message: '操作失败(未定义的原因)' }
 *     res.error('信息');            //=> { message: '信息' }
 *     res.error('信息', {          //=> { message: '信息', code: 1, data: data, .... }  (status=200)
 *         status: 200,
 *         code: 1,
 *         // 自定义属性
 *         // ...
 *     });
 */

'use strict';

module.exports = function error(err, ext) {
    log.star('res.err 将被弃用，请该用res.error代替');
    log.error(err);
    this.status(500);

    let resp = {};
    if (typeof err == 'string') resp['message'] = err;
    else if (typeof err == 'object') resp['message'] = err.message || '未知错误';

    if (ext && _.isPlainObject(ext)) {
        if (ext.status) {
            this.status(ext.status);
            delete ext.status;
        }
        _.merge(resp, ext);
    }
    return this.json(resp);
};
