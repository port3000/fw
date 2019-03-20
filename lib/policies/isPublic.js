module.exports = function isPublic(limit) {

    log.debug('>> into isPublic');

    this.req.defaultQueries = this.req.defaultQueries || {};
    if (limit > 30) {
        this.req.defaultQueries.limit = 30;
    }

    return this.next();
};
