/*!
 * express
 * Copyright(c) 2009-2013 TJ Holowaychuk
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 * MIT Licensed
 */

'use strict';

var mime = require('send').mime;
var contentType = require('content-type');
var etag = require('etag');
var proxyaddr = require('proxy-addr');
var qs = require('qs');
var querystring = require('querystring');

exports.getIpAddress = function() {
    var interfaces = require('os').networkInterfaces();
    for (var devName in interfaces) {
        var iface = interfaces[devName];
        for (var i = 0; i < iface.length; i++) {
            var alias = iface[i];
            if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
                return alias.address;
            }
        }
    }
};

exports.gbkLen = function(str) {
    let _gbklen = 0;
    for (var i = str.length - 1; i >= 0; i--) {
        if (/[\u4E00-\u9FA5]|[\uFE30-\uFFA0]/.test(str[i])) {
            _gbklen++;
        }
    }
    return _gbklen;
};

exports.fresh = function(req, res) {
    // defaults
    var etagMatches = true;
    var notModified = true;

    // fields
    var modifiedSince = req['if-modified-since'];
    var noneMatch = req['if-none-match'];
    var lastModified = res['last-modified'];
    var etag = res['etag'];
    var cc = req['cache-control'];

    // unconditional request
    if (!modifiedSince && !noneMatch) return false;

    // check for no-cache cache request directive
    if (cc && cc.indexOf('no-cache') !== -1) return false;

    // parse if-none-match
    if (noneMatch) noneMatch = noneMatch.split(/ *, */);

    // if-none-match
    if (noneMatch) {
        etagMatches = noneMatch.some(function(match) {
            return match === '*' || match === etag || match === 'W/' + etag;
        });
    }

    // if-modified-since
    if (modifiedSince) {
        modifiedSince = new Date(modifiedSince);
        lastModified = new Date(lastModified);
        notModified = lastModified <= modifiedSince;
    }

    return !!(etagMatches && notModified);
};

exports.rangeParser = function(size, str) {
    var valid = true;
    var i = str.indexOf('=');

    if (-1 == i) return -2;

    var arr = str.slice(i + 1).split(',').map(function(range) {
        var range = range.split('-'),
            start = parseInt(range[0], 10),
            end = parseInt(range[1], 10);

        // -nnn
        if (isNaN(start)) {
            start = size - end;
            end = size - 1;
            // nnn-
        } else if (isNaN(end)) {
            end = size - 1;
        }

        // limit last-byte-pos to current length
        if (end > size - 1) end = size - 1;

        // invalid
        if (isNaN(start) || isNaN(end) || start > end || start < 0) valid = false;

        return {
            start: start,
            end: end
        };
    });

    arr.type = str.slice(0, i);

    return valid ? arr : -1;
};

/**
 * Return strong ETag for `body`.
 *
 * @param {String|Buffer} body
 * @param {String} [encoding]
 * @return {String}
 * @api private
 */

exports.etag = function(body, encoding) {
    var buf = !Buffer.isBuffer(body) ? new Buffer(body, encoding) : body;

    return etag(buf, { weak: false });
};

/**
 * Return weak ETag for `body`.
 *
 * @param {String|Buffer} body
 * @param {String} [encoding]
 * @return {String}
 * @api private
 */

exports.wetag = function wetag(body, encoding) {
    var buf = !Buffer.isBuffer(body) ? new Buffer(body, encoding) : body;

    return etag(buf, { weak: true });
};

/**
 * Normalize the given `type`, for example "html" becomes "text/html".
 *
 * @param {String} type
 * @return {Object}
 * @api private
 */

exports.normalizeType = function(type) {
    return ~type.indexOf('/') ? acceptParams(type) : { value: mime.lookup(type), params: {} };
};

/**
 * Normalize `types`, for example "html" becomes "text/html".
 *
 * @param {Array} types
 * @return {Array}
 * @api private
 */

exports.normalizeTypes = function(types) {
    var ret = [];

    for (var i = 0; i < types.length; ++i) {
        ret.push(exports.normalizeType(types[i]));
    }

    return ret;
};

/**
 * Parse accept params `str` returning an
 * object with `.value`, `.quality` and `.params`.
 * also includes `.originalIndex` for stable sorting
 *
 * @param {String} str
 * @return {Object}
 * @api private
 */

function acceptParams(str, index) {
    var parts = str.split(/ *; */);
    var ret = { value: parts[0], quality: 1, params: {}, originalIndex: index };

    for (var i = 1; i < parts.length; ++i) {
        var pms = parts[i].split(/ *= */);
        if ('q' == pms[0]) {
            ret.quality = parseFloat(pms[1]);
        } else {
            ret.params[pms[0]] = pms[1];
        }
    }

    return ret;
}

/**
 * Compile "etag" value to function.
 *
 * @param  {Boolean|String|Function} val
 * @return {Function}
 * @api private
 */

exports.compileETag = function(val) {
    var fn;

    if (typeof val === 'function') {
        return val;
    }

    switch (val) {
        case true:
            fn = exports.wetag;
            break;
        case false:
            break;
        case 'strong':
            fn = exports.etag;
            break;
        case 'weak':
            fn = exports.wetag;
            break;
        default:
            throw new TypeError('unknown value for etag function: ' + val);
    }

    return fn;
}

/**
 * Compile "query parser" value to function.
 *
 * @param  {String|Function} val
 * @return {Function}
 * @api private
 */

exports.compileQueryParser = function compileQueryParser(val) {
    var fn;

    if (typeof val === 'function') {
        return val;
    }

    switch (val) {
        case true:
            fn = querystring.parse;
            break;
        case false:
            break;
        case 'extended':
            fn = parseExtendedQueryString;
            break;
        case 'simple':
            fn = querystring.parse;
            break;
        default:
            throw new TypeError('unknown value for query parser function: ' + val);
    }

    return fn;
}

/**
 * Compile "proxy trust" value to function.
 *
 * @param  {Boolean|String|Number|Array|Function} val
 * @return {Function}
 * @api private
 */

exports.compileTrust = function(val) {
    if (typeof val === 'function') return val;

    if (val === true) {
        // Support plain true/false
        return function() {
            return true
        };
    }

    if (typeof val === 'number') {
        // Support trusting hop count
        return function(a, i) {
            return i < val
        };
    }

    if (typeof val === 'string') {
        // Support comma-separated values
        val = val.split(/ *, */);
    }

    return proxyaddr.compile(val || []);
}

/**
 * Set the charset in a given Content-Type string.
 *
 * @param {String} type
 * @param {String} charset
 * @return {String}
 * @api private
 */

exports.setCharset = function setCharset(type, charset) {
    if (!type || !charset) {
        return type;
    }

    // parse type
    var parsed = contentType.parse(type);

    // set charset
    parsed.parameters.charset = charset;

    // format type
    return contentType.format(parsed);
};

/**
 * Parse an extended query string with qs.
 *
 * @return {Object}
 * @private
 */

function parseExtendedQueryString(str) {
    return qs.parse(str, {
        allowDots: false,
        allowPrototypes: true
    });
}
