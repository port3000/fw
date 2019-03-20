/*
 * @Author: binchem
 * @Date:   2016-04-18 13:32:02
 * @Last Modified by:   able
 * @Last Modified time: 2016-08-24 22:27:02
 *
 *     // 1、按数据模型设置的主键进行更新（支持多主键）
 *     User.update({
 *         openid: '1',
 *         name: 'binchem',
 *         password: (+new Date()),
 *     }, function(err, rowData, result) {
 *         console.log(err);
 *         console.log(result); // => { changedRows: 1, openid: '1' }
 *         console.log(rowData); // => { openid: '1', name: 'binchem', status: 1, ... }
 *     });
 *     
 *     // 2、callback方法后置
 *     User.update({
 *             openid: '1',
 *             name: 'binchem',
 *             password: (+new Date()),
 *         })
 *         .select(['openid', 'status']) // 设定rowData返回的字段
 *         .exec(function(err, rowData, result) {
 *             console.log(err);
 *             console.log(result); // => { changedRows: 1, openid: '1' }
 *             console.log(rowData); // => { openid: '1', status: 1 }
 *         });
 *     
 *     // // 3、指定条件更新
 *     User.update({
 *         name: 'binchem',
 *         status: 1
 *     }, {
 *         password: (+new Date()),
 *     }, function(err) { // 如果不需要返回更新后的数据，可以不设置回调函数的参数，这样可以减少一次数据库查询
 *         console.info(err);
 *         // 如果设置了 rowData 参数
 *         // => [{ ... }, { ... }, { ... }]
 *     });

 *    
 */

'use strict';
var sql = require('../../sql');

function update() {
    if (!(this instanceof update)) {
        var fn = _.extend(new update(), this);
        fn.init.apply(fn, arguments);
        return fn;
    }
};

update.prototype.init = function() {

    log.debug('>> into update');

    let args = arguments;

    this.fields = this.model.fields;
    this.sets = {};
    this.cb = null;
    this.err = null;
    this.where = {};
    this.primaryKeys = _.isArray(this.model.primaryKey) ? this.model.primaryKey : [this.model.primaryKey];
    this.clientReq = false;

    if (!this.req) {
        // 代码调用

        if (args[1] && typeof args[1] === 'function') this.cb = args[1];
        else if (args[2] && typeof args[2] === 'function') this.cb = args[2];

        if (!_.isPlainObject(args[0])) {
            this.err = '参数错误';
            if (this.cb) return this.exec();
            return this;
        }

        if (_.isPlainObject(args[1])) {
            // 更新条件
            this.where = args[0];
            // 更新项 (排除主键)
            this.sets = _.omit(args[1], this.primaryKeys);
        } else {
            // 更新条件
            this.where = _.pick(args[0], this.primaryKeys);
            // 更新项 (排除主键)
            this.sets = _.omit(args[0], this.primaryKeys);

            if (_.keys(this.where).length != this.primaryKeys.length) {
                this.err = '错误，未提供全部的主键值';
            }
        }

        if (_.keys(this.sets).length < 1) {
            this.err = '错误，未提供除主键外的更新项（主键不能更新）';
        }

        if (this.cb) return this.exec();
        return this;

    } else {

        this.clientReq = true;

        // 更新项
        this.sets = _.pick(_.defaults(this.req.body, this.req.query), this.fields);
        // 更新条件
        this.where = _.pick(this.sets, this.primaryKeys);
        // 排除主键
        this.sets = _.omit(this.sets, this.primaryKeys);

        if (_.keys(this.where).length != this.primaryKeys.length) {
            this.err = '错误，未提供全部的主键值';
            return this.exec();
        }

        if (_.keys(this.sets).length < 1) {
            this.err = '错误，未提供除主键外的更新项（主键不能更新）';
            return this.exec();
        }

        return this.exec();
    }
};

update.prototype.select = function(fields) {
    this.fields = fields;
    return this;
};

update.prototype.exec = function(cb) {
    this.cb = cb || this.cb;
    if (this.err) return this.end(this.err);

    this._where = new sql.update().parseWhere(this.where).slice(0, -5);
    this.query(`UPDATE ?? SET ? WHERE ${ this._where };`, [this.model.tableName, this.sets], (err, result) => {

        if (err) return this.end(err);
        if (result.changedRows == 0) return this.end('没有任何数据更新');

        if (this.cb && _fw.getFnParams(this.cb).length < 2) {
            return this.cb(null);
        } else {

            let updated = _.pick(this.sets, Object.keys(this.where));
            _.defaults(updated, this.where);
            updated = new sql.update().parseWhere(updated).slice(0, -5);

            this.query(`SELECT ?? FROM ?? WHERE ${ updated };`, [this.fields, this.model.tableName], (err2, rows) => {
                return this.end(err2, rows, _.merge({
                    changedRows: result.changedRows
                }, this.where));
            });
        }

    });
};

update.prototype.end = function(err, rows, result) {

    rows = rows || [];
    result = result || {};

    let preResult = {
        data: rows,
        result: result
    };
    if (err) preResult['message'] = err;

    if (!this.clientReq)
        return this.cb(err, rows, result);
    else if (this.idx < this.req.route.stack.length) {
        this.req.preResult = preResult;
        return this.next();
    } else {
        if (err) return this.res.fail(err);
        return this.res.ok(preResult);
    }

};

exports = module.exports = update;
