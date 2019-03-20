/*
 * @Author: binchem
 * @Date:   2016-04-18 13:32:02
 * @Last Modified by:   able
 * @Last Modified time: 2016-09-08 10:53:43
 *
 *
 *    User.create({
 *        openid: (+new Date()),
 *        name: 'able'
 *    }, function(err, rowData, result) {
 *        console.log(err);
 *        console.log(result); // => { affectedRows: 1, openid: 1461318508366 }
 *    
 *        // rowData: 新创建记录的全部数据,如
 *        // { openid: '1461318623268', name: 'able', status: 1, ... }
 *        console.log(rowData);
 *    });
 *    
 *    User.create({
 *            openid: (+new Date()),
 *            name: 'able'
 *        })
 *        .select(['openid', 'status'])
 *        .exec(function(err, rowData, result) {
 *            console.log(err);
 *            console.log(result);
 *            console.log(rowData); // => { openid: '1461318508366', status: 1 }
 *        });
 *    
 *    User.create({
 *            openid: (+new Date()),
 *            name: 'able'
 *        })
 *        .exec(function(err) {
 *            // 如果不需要返回新纪录数据，可以去掉回调函数的参数rowData，这样可以减少一次select查询。
 *            console.log(err);
 *        });
 * 
 */

'use strict';
var sql = require('../../sql');

function create() {
    if (!(this instanceof create)) {
        var fn = _.extend(new create(), this);
        fn.init.apply(fn, arguments);
        return fn;
    }
};

create.prototype.init = function() {

    log.debug('>> into create');

    let args = arguments;

    this.fields = this.model.fields;
    this.cb = null;
    this.err = null;
    this.sets = {};
    this.primaryKeys = _.isArray(this.model.primaryKey) ? this.model.primaryKey : [this.model.primaryKey];
    this.clientReq = false;
    this.where = {};

    if (!this.req) {
        // 代码调用

        if (args[1] && typeof args[1] === 'function') this.cb = args[1];
        this.sets = _.pick(args[0], this.fields);

        if (!Object.keys(this.sets).length) {
            this.err = '参数错误';
            if (this.cb) return this.exec();
            return this;
        }

        this.where = _.pick(args[0], this.primaryKeys);
        if (this.cb) return this.exec();
        return this;

    } else {

        this.clientReq = true;
        // 创建项
        this.sets = _.pick(_.defaults(this.req.body, this.req.query), this.fields);

        if (Object.keys(this.sets).length) {
            this.where = _.pick(this.sets, this.primaryKeys);
            return this.exec();
        } else {
            this.err = '参数错误';
            return this.exec();
        }
    }
};

create.prototype.select = function(fields) {
    this.fields = fields;
    return this;
};

create.prototype.exec = function(cb) {
    this.cb = cb || this.cb;
    if (this.err) return this.end(this.err);

    this.query('INSERT INTO ?? SET ?;', [this.model.tableName, this.sets], (err, result) => {
        if (err) return this.end(err);

        let result2 = {
            affectedRows: result.affectedRows
        };

        if (!result.insertId) _.merge(result2, this.where);
        else {
            _.merge(result2, {
                [this.primaryKeys[0]]: result.insertId
            });
            this.where[this.primaryKeys[0]] = result.insertId
        }

        if (this.cb && _fw.getFnParams(this.cb).length < 2) {
            // 回调方法没有定义接收数据的参数
            return this.cb(null);
        } else {
            this._where = new sql.update().parseWhere(this.where).slice(0, -5);
            this.query(`SELECT ?? FROM ?? WHERE ${ this._where };`, [this.fields, this.model.tableName], (err2, rows) => {
                return this.end(err2, rows, result2);
            });
        }

    });
};

create.prototype.end = function(err, rows, result) {
    rows = rows || [];
    result = result || {};

    let preResult = {
        data: rows,
        result: result
    };
    if (err) preResult['message'] = err;

    if (!this.clientReq)
        return this.cb(err, rows[0], result);
    else if (this.idx < this.req.route.stack.length) {
        this.req.preResult = preResult;
        return this.next();
    } else {
        if (err) return this.res.fail(err);
        return this.res.ok(preResult);
    }
};

exports = module.exports = create;
