'use strict';

var sql = {};

var hop = Object.prototype.hasOwnProperty;
sql.escapeCharacter = '`';
sql.object = {};
sql.parser = {};

sql.object.hasOwnProperty = function(obj, prop) {
    return hop.call(obj, prop);
};

sql.tryToParseJSON = function(json) {
    if (!json) return null;
    try {
        return JSON.parse(json);
    } catch (e) {
        log.error(e);
        return null;
    }
};

sql.escapeName = function(name, escapeCharacter) {
    var regex = new RegExp(escapeCharacter, 'g');
    var replacementString = '' + escapeCharacter + escapeCharacter;
    var replacementDot = '\.';
    return '' + escapeCharacter + name.replace(regex, replacementString).replace(/\./g, replacementDot) + escapeCharacter;
};

sql.escapeString = function(value) {
    if (!_.isString(value)) return value;

    value = value.replace(/[\0\n\r\b\t\\\'\"\x1a]/g, function(s) {
        switch (s) {
            case "\0":
                return "\\0";
            case "\n":
                return "\\n";
            case "\r":
                return "\\r";
            case "\b":
                return "\\b";
            case "\t":
                return "\\t";
            case "\x1a":
                return "\\Z";
            default:
                return "\\" + s;
        }
    });

    return value;
};

sql.select = function(fields, model) {
    _.extend(this, sql.parser);

    this.model = model;
    if (!this.model) return this;

    this.table = this.model.tableName;
    this.fields = fields || '';
    this._limit = '';
    this._skip = '';

    return this;
};

sql.update = function() {
    _.extend(this, sql.parser);

    return this;
};

sql.insert = function() {
    _.extend(this, sql.parser);

    return this;
};

sql.delete = function() {
    _.extend(this, sql.parser);

    return this;
};

sql.parser.sort = function(obj) {
    var self = this;
    if (!obj || !_.isPlainObject(obj)) return this;
    this.sort = obj;
    return this;
};

sql.parser.parseSort = function(obj, tb) {
    var self = this;
    if (!obj || !_.isPlainObject(obj)) return '';
    var _sort = ' ORDER BY ';

    var keys = Object.keys(obj);
    keys.forEach(function(key) {
        var direction = obj[key] ? (obj[key].toUpperCase() === 'ASC' ? 'ASC' : 'DESC') : 'ASC';
        _sort += '`' + tb + '`.' + sql.escapeName(key, sql.escapeCharacter) + ' ' + direction + ', ';
    });
    return _sort.slice(0, -2);
};

sql.parser.limit = function(obj) {
    if (!obj || !/^\d+$/.test(obj)) {
        return this;
    } else {
        this._limit = ' LIMIT ' + obj;
    }
    return this;
};

sql.parser.skip = function(obj) {
    if (!obj || !/^\d+$/.test(obj)) {
        return this;
    } else {
        this._skip = ' OFFSET ' + obj;
    }
    return this;
};

sql.parser.groupBy = function(obj) {
    var self = this;
    if (!obj) return this;
    this.group = obj || '';
    return this;
};

sql.parser.parseGroupBy = function(obj, tb) {
    var self = this;
    if (!obj) return this;
    if (!Array.isArray(obj)) obj = [obj];
    var _group = '';
    obj.forEach(function(key) {
        _group += '`' + tb + '`.' + sql.escapeName(key, sql.escapeCharacter) + ', ';
    });
    return ' GROUP BY ' + _group.slice(0, -2);
};

sql.parser.leftJoin = function(foreignKey, joinSqlObj) {
    this.joinSqls = this.joinSqls || [];

    joinSqlObj.foreignKey = foreignKey;

    this.joinSqls.push(joinSqlObj);
    // this.foreignKey = foreignKey;
    return this;
};

sql.parser.where = function(obj) {
    if (!obj) return this;
    this.queryString = '';
    this._queryString = obj || '';
    return this;
};

sql.parser.parseWhere = function(obj, table) {
    var self = this;
    table = table || '';
    self.queryString = self.queryString || '';

    var _obj = _.cloneDeep(obj);
    if (_obj !== null) {
        _.keys(_obj).forEach(function(key) {
            self.expand(key, _obj[key], table);
        });
    }
    return self.queryString;
};

sql.parser.expand = function(key, val, tb) {
    var self = this;
    switch (key.toLowerCase()) {
        case 'or':
            self.or(val, tb);
            return;
        case 'like':
            tb = tb && (sql.escapeName(tb, sql.escapeCharacter) + '.') || '';
            self.like(val, tb);
            return;
        default:
            tb = tb && (sql.escapeName(tb, sql.escapeCharacter) + '.') || '';
            // `IN`
            if (Array.isArray(val)) {
                self._in(key, val, tb);
                return;
            }
            // `AND`
            self.and(key, val, tb);
            return;
    }
};

sql.parser.and = function(key, val, tb) {
    this.process(key, val, '=', tb);
    this.queryString += ' AND ';
};

sql.parser.or = function(val, tb) {
    var self = this;
    if (!Array.isArray(val)) {
        throw new Error('`or` statements must be in an array.');
    }

    this.queryString += '(';

    val.forEach(function(statement) {
        self.queryString += '(';

        _.keys(statement).forEach(function(key) {
            self.expand(key, statement[key], tb);
        });

        if (self.queryString.slice(-4) === 'AND ') {
            self.queryString = self.queryString.slice(0, -5);
        }

        self.queryString += ') OR ';
    });

    if (self.queryString.slice(-3) === 'OR ') {
        self.queryString = self.queryString.slice(0, -4);
    }

    self.queryString += ') AND ';
};

sql.parser.like = function(val, tb) {
    var self = this;
    var expandBlock = function(parent) {
        var comparator = 'LIKE';
        self.process(parent, val[parent], comparator, tb);
        self.queryString += ' AND ';
    };
    _.keys(val).forEach(function(parent) {
        expandBlock(parent);
    });
};

sql.parser._in = function(key, val, tb) {
    var self = this;

    self.queryString += tb + sql.escapeName(key, sql.escapeCharacter) + ' IN (';
    val.forEach(function(value) {
        if (_.isString(value)) {
            value = '"' + sql.escapeString(value) + '"';
        }
        self.queryString += value + ',';
    });
    self.queryString = self.queryString.slice(0, -1) + ')';
    self.queryString += ' AND ';
};

sql.parser.process = function(parent, value, combinator, tb) {

    var processMethod = _.isPlainObject(value) ? this.processObject : this.processSimple;

    processMethod.apply(this, [parent, value, combinator, tb]);
};

sql.parser.processSimple = function(parent, value, combinator, tb) {

    var self = this;

    parent = this.buildParam(parent);

    if (value === null) {
        return this.queryString += parent + ' IS NULL';
    }

    if (_.isDate(value)) {
        value = value.getFullYear() + '-' +
            ('00' + (value.getMonth() + 1)).slice(-2) + '-' +
            ('00' + value.getDate()).slice(-2) + ' ' +
            ('00' + value.getHours()).slice(-2) + ':' +
            ('00' + value.getMinutes()).slice(-2) + ':' +
            ('00' + value.getSeconds()).slice(-2);
    }

    if (_.isString(value)) {
        value = '"' + sql.escapeString(value) + '"';
    }

    this.queryString += tb + parent + ' ' + combinator + ' ' + value;
};

sql.parser.processObject = function(parent, value, combinator, tb) {
    var self = this;

    expandCriteria(value);

    // Remove trailing `AND`
    this.queryString = this.queryString.slice(0, -4);

    // Expand criteria object
    function expandCriteria(obj) {

        _.keys(obj).forEach(function(key) {

            // If value is an object, recursivly expand it
            if (_.isPlainObject(obj[key])) {
                return expandCriteria(obj[key]);
            }

            // Check if value is a string and if so add LOWER logic
            // to work with case in-sensitive queries
            self.queryString += tb + self.buildParam(parent) + ' ';
            self.prepareCriterion(key, obj[key]);
            self.queryString += ' AND ';
        });
    }
};

sql.parser.buildParam = function(property) {

    return sql.escapeName(property, sql.escapeCharacter);
};

sql.parser.prepareCriterion = function(key, value) {
    var self = this;
    var str;
    var comparator;
    var escapedDate = false;

    if (_.isDate(value)) {
        value = value.getFullYear() + '-' +
            ('00' + (value.getMonth() + 1)).slice(-2) + '-' +
            ('00' + value.getDate()).slice(-2) + ' ' +
            ('00' + value.getHours()).slice(-2) + ':' +
            ('00' + value.getMinutes()).slice(-2) + ':' +
            ('00' + value.getSeconds()).slice(-2);

        value = '"' + value + '"';
        escapedDate = true;
    }

    switch (key) {

        case '<':
        case 'lessThan':
            if (_.isString(value) && !escapedDate) {
                value = '"' + sql.escapeString(value) + '"';
            }
            str = '< ' + value;
            break;

        case '<=':
        case 'lessThanOrEqual':
            if (_.isString(value) && !escapedDate) {
                value = '"' + sql.escapeString(value) + '"';
            }
            str = '<= ' + value;
            break;

        case '>':
        case 'greaterThan':
            if (_.isString(value) && !escapedDate) {
                value = '"' + sql.escapeString(value) + '"';
            }
            str = '> ' + value;
            break;

        case '>=':
        case 'greaterThanOrEqual':

            if (_.isString(value) && !escapedDate) {
                value = '"' + sql.escapeString(value) + '"';
            }
            str = '>= ' + value;
            break;

        case '!':
        case 'not':
            if (value === null) {
                str = 'IS NOT NULL';
            } else {
                if (Array.isArray(value)) {
                    str = 'NOT IN (';
                    value.forEach(function(val) {
                        if (_.isString(val)) {
                            val = '"' + sql.escapeString(val) + '"';
                        }
                        str += val + ',';
                    });

                    str = str.slice(0, -1) + ')';
                } else {
                    if (_.isString(value)) {
                        value = '"' + sql.escapeString(value) + '"';
                    }
                    str = '<> ' + value;
                }
            }
            break;

        case 'like':

            comparator = 'LIKE';
            str = comparator + ' ' + sql.escapeName(value, '"');
            break;

        case 'contains':

            comparator = 'LIKE';
            str = comparator + ' ' + sql.escapeName('%' + value + '%', '"');
            break;

        case 'startsWith':

            comparator = 'LIKE';
            str = comparator + ' ' + sql.escapeName(value + '%', '"');
            break;

        case 'endsWith':

            comparator = 'LIKE';
            str = comparator + ' ' + sql.escapeName('%' + value, '"');
            break;
    }

    this.queryString += str;
};

sql.parser.parseSelect = function(fields, table) {

    table = table && (sql.escapeName(table, sql.escapeCharacter) + '.') || '';

    if (!fields)
        fields = table + ' * '
    else {
        fields = fields.map(function(f) {
            return table + sql.escapeName(f, sql.escapeCharacter);
        });
    }
    return fields;
};

sql.parser.toSql = function(options) {
    var self = this;
    self.alias = self.alias || 'a';

    if (self instanceof sql.select) {

        var _sql = ['SELECT '];
        var _tj = self.joinSqls && self.joinSqls.length;
        if (options && options.join)
            _sql.push(self.parseSelect(null));
        else
            _sql.push(self.parseSelect(self.fields, self.alias));

        if (_tj) {
            self.joinSqls.forEach(function(_jnObj, i) {
                _jnObj.alias = self.alias + i;
                _sql.push(', ', self.parseSelect(_jnObj.fields, self.alias + i));
            });
        }
        let db = _fw.config.connections[self.model.connection].database;
        if (options && options.join)
            _sql.push(' FROM ', sql.escapeName(db, sql.escapeCharacter) + '.', sql.escapeName(self.table, sql.escapeCharacter));
        else
            _sql.push(' FROM ', sql.escapeName(db, sql.escapeCharacter) + '.', sql.escapeName(self.table, sql.escapeCharacter), ' AS `', self.alias, '`');

        if (_tj) {
            self.joinSqls.forEach(function(_jnObj, i) {
                _sql.push(' LEFT JOIN (', _jnObj.toSql({
                    join: true
                }), ') AS `a' + i + '` ON `a`.', sql.escapeName(_jnObj.foreignKey, sql.escapeCharacter), '=`a', i, '`.', sql.escapeName(_jnObj.model.primaryKey, sql.escapeCharacter));
            });
        }

        if (self._queryString && !_.isEmpty(self._queryString)) {
            _sql.push(' WHERE ' + self.parseWhere(self._queryString, self.alias).slice(0, -5));
        }
        if (self.group) {
            _sql.push(self.parseGroupBy(self.group, self.alias));
        }
        if (self.sort) {
            _sql.push(self.parseSort(self.sort, self.alias));
        }
        if (self._limit) {
            _sql.push(self._limit);
        }
        if (self._skip) {
            _sql.push(self._skip);
        }

        return _sql.join('');

    } else if (self instanceof sql.insert) {
        log.debug('insert');
    } else if (self instanceof sql.update) {
        log.debug('update');
    } else if (self instanceof sql.delete) {
        log.debug('delete');
    }

};

module.exports = sql;
