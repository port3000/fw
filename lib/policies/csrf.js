function defaultValue(req) {
    return (req.body && req.body._csrf) || (req.query && req.query._csrf) || (req.headers['csrf-token']) || (req.headers['xsrf-token']) || (req.headers['x-csrf-token']) || (req.headers['x-xsrf-token']);
}

module.exports = function csrf() {

    log.debug('>> into csrf');

    if (!this.req.session) {
        return this.res.fail('用户会话丢失。请刷新页面重试');
    } else {
        if (_fw.csrf.verify(this.req.session.csrfSecret, defaultValue(this.req))) {
            delete this.req.body._csrf;
            delete this.req.query._csrf;
            return this.next();
        } else {
            return this.res.fail('invalid csrf token');
        }
    }
};
