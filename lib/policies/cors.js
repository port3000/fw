/*
 * @Author: able
 * @Date:   2016-05-18 12:27:44
 * @Last Modified by:   able
 * @Last Modified time: 2016-05-18 12:31:19
 */

'use strict';

module.exports = function cors() {
    return require('cors')(_fw.config.cors)(this.req, this.res, this.next);
};
