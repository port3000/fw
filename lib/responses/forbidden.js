/*
 * @Author: binchem
 * @Date:   2016-04-16 17:25:15
 * @Last Modified by:   able
 * @Last Modified time: 2016-04-30 22:00:39
 *
 */

'use strict';

module.exports = function forbidden(message) {
    this.status(403);
    if (typeof message == 'string') return this.json({
        message: message
    });
    else {
        return this.json({
            message: '访问被拒绝'
        });
    }
};
