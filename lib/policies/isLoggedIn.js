module.exports = function isLoggedIn(limit) {

    log.debug('>> into isLoggedIn');

    this.req.defaultQueries = this.req.defaultQueries || {};
    if (limit > 30) {
        this.req.defaultQueries.limit = 30;
    }

    if (!this.user.uid) {
        if (_fw.config.loginUrl) return this.res.redirect(_fw.config.loginUrl);
        return this.res.forbidden('需要登录才能访问');
    } else {
        return this.next();
    }

};
