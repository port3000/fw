/*
 * @Author: able
 * @Date:   2016-05-18 13:39:40
 * @Last Modified by:   able
 * @Last Modified time: 2016-08-25 17:51:10
 */

'use strict';

module.exports = function done(message, statusCode) {

    log.star('res.done 将被弃用，请该用res.ok代替');

    message = message || { ok: true };

    if (typeof message === 'string') {
        message = { message: message };
    }

    this.status(statusCode || 200);
    return this.json(message);
};
