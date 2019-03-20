/*
 * @Author: binchem
 * @Date:   2016-04-18 13:32:02
 * @Last Modified by:   keny
 * @Last Modified time: 2017-05-08 11:52:00
 *
 *    User.find({
 *        openid: '1'
 *    }, function(err, rows) {
 *        console.log(err);
 *        console.log(rows);
 *    });
 *    
 *    User.find(function(err, rows) {
 *        console.log(err);
 *        console.log(rows);
 *    });
 *    
 *    User.find({
 *            account: '18038004781',
 *            uid: {
 *                '<': 25
 *            },
 *            like: {
 *                account: '%3800%'
 *            },
 *            or: [{
 *                like: {
 *                    account: '180%'
 *                }
 *            }, {
 *                like: {
 *                    account: '185%'
 *                }
 *            }],
 *            uid: [1, 2, 3],
 *            status: {
 *                not: 40
 *            }
 *        })
 *        .sort({ openid: 'desc' })
 *        .exec(function(err, rows) {
 *            console.log(err);
 *            console.log(rows);
 *        });
 *    
 *    User.find()
 *        .select(['openid', 'name'])
 *        .leftJoin('openid', Message, Message.model.fields)
 *        .groupBy(['openid', 'status'])
 *        .sort({ 'openid': 'desc' })
 *        .skip(10)
 *        .limit(10)
 *        .count() // 返回符条件的总记录数
 *        .exec(function(err, rows, result) {
 *            console.log(err);
 *            console.log(rows);
 *            console.log(result.total); // 总记录数
 *        });
 *
 * 
 */

'use strict';
var sql = require('../../sql');
var qs = require('querystring');

var parseQuery = function(queries, keys) {

    // gt(>) 和 lt(<) 支持
    // 如：http://...?start=gt:1461403926056&end=lt:1461403926056
    // _sort 支持
    // 如：http://...?_sort=date:desc&_sort=id:desc
    // _count 支持，即结果中返回符合条件的总记录数
    // 如：http://...?_count
    // 
    // status=not:open
    // 
    _.forEach(queries, (v, k, o) => {

        if (keys.indexOf(k) == -1) return delete queries[k];

        if (_.isArray(v)) {

            v.map((_v, _k) => {
                if (_v.indexOf('gt:') == 0) {
                    if (!_.isPlainObject(o[k])) o[k] = {};
                    o[k]['>'] = _v.substr(3);
                } else if (_v.indexOf('lt:') == 0) {
                    if (!_.isPlainObject(o[k])) o[k] = {};
                    o[k]['<'] = _v.substr(3);
                } else if (_v.indexOf(':') > -1) {
                    if (!_.isPlainObject(o[k])) o[k] = {};
                    _.defaults(o[k], qs.parse(_v, '&', ':'));
                }
            });

        } else if (_.isString(v) && v.indexOf(':') > -1) {
            if (v.indexOf('gt:') == 0)
                o[k] = { '>': v.substr(3) };
            else if (v.indexOf('lt:') == 0)
                o[k] = { '<': v.substr(3) };
            else
                o[k] = qs.parse(v, '&', ':');
        }

        if (k == 'count' || k == '_count') {
            this._count = true;
            delete queries.count;
            delete queries._count;
        }

        if (k == 'sort' || k == '_sort') {
            this.sort(o[k]);
            delete queries.sort;
            delete queries._sort;
        }

        if (k == 'limit' || k == '_limit') {
            this.limit(o[k]);
            delete queries.limit;
            delete queries._limit;
        }

        if (k == 'skip' || k == '_skip') {
            this.skip(o[k]);
            delete queries.skip;
            delete queries._skip;
        }

        if (k == 'like' || k == '_like') {
            for (let _k in o[k]) {
                o[k][_k] = o[k][_k].replace(/\*/g, '%');
            }
            queries['like'] = o[k];
            delete queries._like;
        }

    });

    return queries;
};

function find() {
    if (!(this instanceof find)) {
        var fn = _.extend(new find(), this);
        fn.init.apply(fn, arguments);
        return fn;
    }
};

find.prototype.init = function() {

    log.debug('>> into find');

    let args = arguments;

    this.fields = this.model.fields;
    this.cb = null;
    this.err = null;
    this.primaryKeys = _.isArray(this.model.primaryKey) ? this.model.primaryKey : [this.model.primaryKey];
    this.clientReq = false;
    this.where = {};

    if (!this.req) {
        // 即代码调用

        // 回调
        if (args[1] && typeof args[1] === 'function') this.cb = args[1];
        else if (args[0] && typeof args[0] === 'function') this.cb = args[0];

        // 条件
        if (_.isPlainObject(args[0])) {
            this.where = args[0];
        }

        if (this.cb) return this.exec();
        return this;

    } else {

        if (this.req.query._view) {
            this.fields = this.req.query._view.select || this.fields;
        }

        this.clientReq = true;

        // 条件
        this.where = _.defaults(this.req.defaultQueries || {}, _.pick(this.req.params, this.primaryKeys), this.req.query);

        this.where = parseQuery.apply(this, [
            this.where,
            this.fields.concat(['count', 'sort', 'limit', 'skip', 'like', '_count', '_sort', '_limit', '_skip', '_like'])
        ]);

        return this.exec();
    }

};

find.prototype.select = function(fields) {
    this.fields = fields;
    return this;
};

find.prototype.leftJoin = function(foreignKey, joinObj, joinFields) {
    this.joinObjs = this.joinObjs || [];
    if (foreignKey && joinObj && joinObj.model && _.isArray(joinFields)) {
        this.joinObjs.push({
            foreignKey: foreignKey,
            joinObj: joinObj,
            joinFields: joinFields
        });
    }
    return this;
};

find.prototype.groupBy = function(arr) {
    if (!arr || !_.isArray(arr)) return this;
    this._groupBy = arr;
    return this;
};

find.prototype.sort = function(obj) {
    if (!obj || !_.isPlainObject(obj)) return this;
    this._sort = obj;
    return this;
};

find.prototype.skip = function(n) {
    if (!n || !/^\d+$/.test(n)) return this;
    this._skip = n;
    return this;
};

find.prototype.limit = function(n) {
    if (!n || !/^\d+$/.test(n)) return this;
    if (this.clientReq) {
        if (this.req.defaultQueries && this.req.defaultQueries.limit) this._limit = this.req.defaultQueries.limit;
        else
            this._limit = n > 30 ? 30 : n;
    } else
        this._limit = n;
    return this;
};

find.prototype.count = function() {
    this._count = true;
    return this;
};

find.prototype.exec = function(cb) {
    this.cb = cb || this.cb;
    if (this.err) return this.end(this.err);

    let _join = this.joinObjs && this.joinObjs.length;

    var query = new sql.select(this.fields, this.model);

    if (_join) {
        _.each(this.joinObjs, (o) => {
            query.leftJoin(o.foreignKey, new sql.select(o.joinFields, o.joinObj.model));
        });
    }
    if (this.where) query.where(this.where);

    if (this._groupBy) query.groupBy(this._groupBy);

    if (this._sort) query.sort(this._sort);

    if (this._limit) query.limit(this._limit);
    else query.limit(30);

    if (this._skip) query.skip(this._skip);
    else query.skip(0);

    let _sql = query.toSql() + ';';

    if (this._count) {
        _sql += 'SELECT COUNT(*) as total FROM (' + _sql.substring(0, _sql.indexOf('LIMIT') - 1) + ') as _view;';
    }

    this.query(_sql, (err, rows, result) => {
        if (err) return this.end(err);
        return this.end(err, rows, result);
    });

};

find.prototype.end = function(err, rows, result) {

    let total = 0;
    if (this._count) {
        try {
            total = rows[1][0].total;
            rows = rows[0];
        } catch (e) {
            log.error(e);
        }
    }

    rows = rows || [];

    let preResult = {
        data: rows,
        skip: this._skip || 0,
        limit: this._limit || 30
    };

    if (total) preResult['total'] = total;
    if (err) preResult['message'] = err;
    if (this.req && this.req.query._view) preResult['view'] = this.req.query._view;

    if (!this.clientReq)
        return this.cb(err, rows, preResult);
    else if (this.idx < this.req.route.stack.length) {
        this.req.preResult = preResult;
        return this.next();
    } else {
        if (err) return this.res.fail(err);
        return this.res.ok(preResult);
    }
};

exports = module.exports = find;
