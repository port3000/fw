/*
 * @Author: binchem
 * @Date:   2016-04-18 13:32:02
 * @Last Modified by:   able
 * @Last Modified time: 2016-08-24 22:24:02
 *
        User.createOrUpdate({
            openid: 1,
            name: 123,
        }, function() {

        });

        User.createOrUpdate({
            openid: 1,
            name: 123,
        }).exec(function() {

        });
 * 
 */



'use strict';
var sql = require('../../sql');

function createOrUpdate() {
    if (!(this instanceof createOrUpdate)) {
        var fn = _.extend(new createOrUpdate(), this);
        fn.init.apply(fn, arguments);
        return fn;
    }
};

createOrUpdate.prototype.init = function() {

    log.debug('>> into createOrUpdate');

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

        if (!_.isPlainObject(args[0])) {
            this.err = '参数错误';
            if (this.cb) return this.exec();
            return this;
        }

        // 创建项
        this.sets = args[0];
        this.where = _.pick(args[0], this.primaryKeys, this.uniKeys || []);

        if (_.keys(this.sets).length < 1) {
            this.err = '参数错误';
            if (this.cb) return this.exec();
            return this;
        }

        if (this.cb) return this.exec();
        return this;

    } else {

        this.clientReq = true;
        // 创建项
        this.sets = _.pick(_.defaults(this.req.body, this.req.query), this.fields);
        this.where = _.pick(this.req.body, this.primaryKeys, this.uniKeys || []);

        if (_.keys(this.sets).length < 1) {
            this.err = '参数错误';
        }
        return this.exec();
    }
};

createOrUpdate.prototype.select = function(fields) {
    this.fields = fields;
    return this;
};

createOrUpdate.prototype.updateCols = function(fields) {
    this._updateCols = fields;
    return this;
};

createOrUpdate.prototype.duplicateKeys = function(fields) {
    this.duplicateKeys = fields;
    return this;
};

function duplicateUpdateFormat(sets, primaryKeys, _updateCols) {
    let newSets = '';
    _.forEach(sets, (v, k) => {
        if (primaryKeys.indexOf(k) > -1) return;
        if (_updateCols && _updateCols.indexOf(k) == -1) return;
        newSets += `\`${k}\`=values(\`${k}\`),`;
    });
    if (newSets.length > 0) {
        newSets = 'ON DUPLICATE KEY UPDATE ' + newSets;
        return newSets.substring(0, newSets.length - 1);
    } else return '';
}

createOrUpdate.prototype.exec = function(cb) {
    this.cb = cb || this.cb;
    if (this.err) return this.end(this.err);

    let _g = true;
    if (this.model.requiredKeys && this.model.requiredKeys.length > 0) {
        let keys = Object.keys(this.sets);
        for (var i in this.model.requiredKeys) {
            if (keys.indexOf(this.model.requiredKeys[i]) == -1) {
                _g = false;
                break;
            }
        }
    }

    if (!_g) {

        this.update.apply({
            model: this.model,
            query: this.query
        }, [this.sets, (err, rows, result) => {
            if (err) return this.end(err);
            return this.end(err, rows, result);
        }]);

    } else {
        this.query('INSERT INTO ?? SET ? ' + duplicateUpdateFormat(this.sets, this.primaryKeys, this._updateCols) + ';', [this.model.tableName, this.sets], (err, result) => {

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

                if (Object.keys(this.where).length == 0 && this.duplicateKeys)
                    this.where = _.pick(this.sets, this.duplicateKeys);

                this._where = new sql.update().parseWhere(this.where).slice(0, -5);
                this.query(`SELECT ?? FROM ?? WHERE ${ this._where };`, [this.fields, this.model.tableName], (err2, rows) => {
                    return this.end(err2, rows, result2);
                });
            }

        });
    }
};

createOrUpdate.prototype.end = function(err, rows, result) {

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

exports = module.exports = createOrUpdate;
