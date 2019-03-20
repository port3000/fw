/*
 * @Author: binchem
 * @Date:   2016-04-18 13:32:02
 * @Last Modified by:   able
 * @Last Modified time: 2016-08-25 12:15:38
 *
 *     User.findOne(1, function(err, rowData) {
 *         console.log(err);
 *         console.log(rowData); // => { openid: '1', name: 'binchem', status: 1, ... }
 *     });
 *     
 *     User.findOne({
 *         openid: '1'
 *     }, function(err, rowData) {
 *         console.log(err);
 *         console.log(rowData);
 *     });
 *     
 *     User.findOne({
 *             openid: '1'
 *         })
 *         .select(['openid', 'name'])
 *         .leftJoin('openid', Message, Message.model.fields)
 *         .exec(function(err, rowData) {
 *             console.log(err);
 *             console.log(rowData);
 *         });
 * 
 */

'use strict';
var sql = require('../../sql');

function findOne() {
    if (!(this instanceof findOne)) {
        var fn = _.extend(new findOne(), this);
        fn.init.apply(fn, arguments);
        return fn;
    }
};

findOne.prototype.init = function() {

    log.debug('>> into findOne');

    let args = arguments;

    this.fields = this.model.fields;
    this.cb = null;
    this.err = null;
    this.primaryKeys = _.isArray(this.model.primaryKey) ? this.model.primaryKey : [this.model.primaryKey];
    this.clientReq = false;
    this.where = {};

    if (!this.req) {
        // 代码调用

        // 回调
        if (args[1] && typeof args[1] === 'function') this.cb = args[1];

        // 条件
        if (_.isPlainObject(args[0])) {
            this.where = args[0];
        } else if (typeof args[0] === 'number' || typeof args[0] === 'string') {
            this.where[this.primaryKeys[0]] = args[0];
        } else {
            this.err = '参数错误';
            if (this.cb) return this.exec();
            return this;
        }

        for (var pk in this.primaryKeys) {
            if (Object.keys(this.where).indexOf(pk) > -1)
                this.err = '错误，未提供全部的主键值';
        }

        if (this.cb) return this.exec();
        return this;

    } else {

        this.clientReq = true;

        if (this.req.query._view) {
            this.fields = this.req.query._view.select || this.fields;
        }

        // 条件
        this.where = _.defaults({}, _.pick(this.req.params, this.primaryKeys), this.req.query);
        this.where = _.pick(this.where, this.fields);

        _.forEach(this.primaryKeys, (pk) => {
            if (Object.keys(this.where).indexOf(pk) == -1)
                this.err = '错误，未提供全部的主键值';
        });

        return this.exec();
    }
};

findOne.prototype.select = function(fields) {
    this.fields = fields;
    return this;
};

findOne.prototype.leftJoin = function(foreignKey, joinObj, joinFields) {
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

findOne.prototype.exec = function(cb) {

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

    this.query(query.toSql() + ';', (err, rows, result) => {
        if (err) return this.end(err);
        return this.end(err, rows, result);
    });

};

findOne.prototype.end = function(err, rows, result) {

    rows = rows || [];
    result = result || {};

    let preResult = {
        data: rows,
        // result: result
    };
    if (err) preResult['message'] = err;
    if (this.req && this.req.query._view) preResult['view'] = this.req.query._view;

    if (!this.clientReq) {
        return this.cb(err, rows[0]);
    } else if (this.idx < this.req.route.stack.length) {
        this.req.preResult = preResult;
        return this.next();
    } else {
        if (err) return this.res.fail(err);
        return this.res.ok(preResult);
    }

};

exports = module.exports = findOne;
