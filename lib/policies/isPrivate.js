module.exports = function isPrivate(uid, limit) {

    log.debug('>> into isPrivate');

    this.req.defaultQueries = this.req.defaultQueries || {};
    if (limit > 30) {
        this.req.defaultQueries.limit = 30;
    }

    if (!this.user.uid) {
        return this.res.forbidden('需要登录才能访问');
    }

    this.req.defaultQueries['uid'] = this.user.uid;
    return this.next();
};
