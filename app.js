/*
 * @Author: able
 * @Date:   2016-05-07 00:39:09
 * @Last Modified by:   able
 * @Last Modified time: 2016-05-07 00:41:37
 */

'use strict';

var fw = require('./index');

// app.defaultLocals = {
//     pretty: true,
// };

fw.app.listen(fw.config.port, () => {
    log.info(`env: ${fw.app.get('env')}`);
    log.info(`Server started on: http://localhost:${fw.config.port}`);
});
