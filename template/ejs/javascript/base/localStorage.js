(function(root, factory) {

    'use strict';

    if (typeof define === 'function' && define.amd) {
        define(factory);
    } else if (typeof exports !== 'undefined') {
        module.exports = factory;
    } else {
        root.localCache = function(key) {
            return root.localCache[key] || (root.localCache[key] = factory(key, window.localStorage));
        };
        root.localSession = function(key) {
            return root.localSession[key] || (root.localSession[key] = factory(key, window.sessionStorage));
        };
    }
}(this, function(_key, _windowStorage) {

    'use strict';

    var VERSION = '0.0.2';

    var _storage = false;
    var _storage_size = 0;
    var _storage_available = false;
    var _ttl_timeout = null;

    var _lsStatus = 'OK';
    var LS_NOT_AVAILABLE = 'LS_NOT_AVAILABLE';
    var LS_DISABLED = 'LS_DISABLED';
    var LS_QUOTA_EXCEEDED = 'LS_QUOTA_EXCEEDED';

    var _flag = _windowStorage === window.localStorage;

    function _init() {

        _storage_available = _checkAvailability();

        _loadStorage();

        if (_flag) _handleTTL();

        _setupUpdateObserver();

        if ('addEventListener' in window) {
            window.addEventListener('pageshow', function(event) {
                if (event.persisted) {
                    _reloadData();
                }
            }, false);
        }

        _storage_available = true;
    }

    /**
     * Sets up a storage change observer
     */
    function _setupUpdateObserver() {
        if ('addEventListener' in window) {
            window.addEventListener('storage', _reloadData, false);
        } else {
            document.attachEvent('onstorage', _reloadData);
        }
    }

    /**
     * Reload data from storage when needed
     */
    function _reloadData() {
        try {
            _loadStorage();
        } catch (E) {
            _storage_available = false;
            return;
        }
        if (_flag) _handleTTL();
    }

    function _loadStorage() {
        var source = _windowStorage.getItem(_key);

        try {
            _storage = JSON.parse(source) || {};
        } catch (E) {
            _storage = {};
        }

        _storage_size = _get_storage_size();
    }

    function _save() {
        try {
            _windowStorage.setItem(_key, JSON.stringify(_storage));
            _storage_size = _get_storage_size();
        } catch (E) {
            return _formatError(E);
        }
        return true;
    }

    function _get_storage_size() {
        var source = _windowStorage.getItem(_key);
        return source ? String(source).length : 0;
    }

    function _handleTTL() {
        var curtime, i, len, expire, keys, nextExpire = Infinity,
            expiredKeysCount = 0;

        clearTimeout(_ttl_timeout);

        if (!_storage || !_storage.__storage_meta || !_storage.__storage_meta.TTL) {
            return;
        }

        curtime = +new Date();
        keys = _storage.__storage_meta.TTL.keys || [];
        expire = _storage.__storage_meta.TTL.expire || {};

        for (i = 0, len = keys.length; i < len; i++) {
            if (expire[keys[i]] <= curtime) {
                expiredKeysCount++;
                delete _storage[keys[i]];
                delete expire[keys[i]];
            } else {
                if (expire[keys[i]] < nextExpire) {
                    nextExpire = expire[keys[i]];
                }
                break;
            }
        }

        // set next check
        if (nextExpire !== Infinity) {
            _ttl_timeout = setTimeout(_handleTTL, Math.min(nextExpire - curtime, 0x7FFFFFFF));
        }

        // remove expired from TTL list and save changes
        if (expiredKeysCount) {
            keys.splice(0, expiredKeysCount);

            _cleanMetaObject();
            _save();
        }
    }

    function _setTTL(key, ttl) {
        var curtime = +new Date(),
            i, len, added = false;

        ttl = Number(ttl) || 0;

        // Set TTL value for the key
        if (ttl !== 0) {
            // If key exists, set TTL
            if (_storage.hasOwnProperty(key)) {

                if (!_storage.__storage_meta) {
                    _storage.__storage_meta = {};
                }

                if (!_storage.__storage_meta.TTL) {
                    _storage.__storage_meta.TTL = {
                        expire: {},
                        keys: []
                    };
                }

                _storage.__storage_meta.TTL.expire[key] = curtime + ttl;

                // find the expiring key in the array and remove it and all before it (because of sort)
                if (_storage.__storage_meta.TTL.expire.hasOwnProperty(key)) {
                    for (i = 0, len = _storage.__storage_meta.TTL.keys.length; i < len; i++) {
                        if (_storage.__storage_meta.TTL.keys[i] === key) {
                            _storage.__storage_meta.TTL.keys.splice(i);
                        }
                    }
                }

                // add key to keys array preserving sort (soonest first)
                for (i = 0, len = _storage.__storage_meta.TTL.keys.length; i < len; i++) {
                    if (_storage.__storage_meta.TTL.expire[_storage.__storage_meta.TTL.keys[i]] > (curtime + ttl)) {
                        _storage.__storage_meta.TTL.keys.splice(i, 0, key);
                        added = true;
                        break;
                    }
                }

                // if not added in previous loop, add here
                if (!added) {
                    _storage.__storage_meta.TTL.keys.push(key);
                }
            } else {
                return false;
            }
        } else {
            // Remove TTL if set
            if (_storage && _storage.__storage_meta && _storage.__storage_meta.TTL) {

                if (_storage.__storage_meta.TTL.expire.hasOwnProperty(key)) {
                    delete _storage.__storage_meta.TTL.expire[key];
                    for (i = 0, len = _storage.__storage_meta.TTL.keys.length; i < len; i++) {
                        if (_storage.__storage_meta.TTL.keys[i] === key) {
                            _storage.__storage_meta.TTL.keys.splice(i, 1);
                            break;
                        }
                    }
                }

                _cleanMetaObject();
            }
        }

        // schedule next TTL check
        clearTimeout(_ttl_timeout);
        if (_storage && _storage.__storage_meta && _storage.__storage_meta.TTL && _storage.__storage_meta.TTL.keys.length) {
            _ttl_timeout = setTimeout(_handleTTL, Math.min(Math.max(_storage.__storage_meta.TTL.expire[_storage.__storage_meta.TTL.keys[0]] - curtime, 0), 0x7FFFFFFF));
        }

        return true;
    }

    function _cleanMetaObject() {
        var updated = false,
            hasProperties = false,
            i;

        if (!_storage || !_storage.__storage_meta) {
            return updated;
        }

        // If nothing to TTL, remove the object
        if (_storage.__storage_meta.TTL && !_storage.__storage_meta.TTL.keys.length) {
            delete _storage.__storage_meta.TTL;
            updated = true;
        }

        // If meta object is empty, remove it
        for (i in _storage.__storage_meta) {
            if (_storage.__storage_meta.hasOwnProperty(i)) {
                hasProperties = true;
                break;
            }
        }

        if (!hasProperties) {
            delete _storage.__storage_meta;
            updated = true;
        }

        return updated;
    }

    /**
     * Checks if _windowStorage is available or throws an error
     */
    function _checkAvailability() {
        var err;
        var items = 0;

        // Firefox sets _windowStorage to 'null' if support is disabled
        // IE might go crazy if quota is exceeded and start treating it as 'unknown'
        if (_windowStorage === null || typeof _windowStorage === 'unknown') {
            err = new Error(typeof _windowStorage + ' is disabled');
            err.code = LS_DISABLED;
            throw err;
        }

        // There doesn't seem to be any indication about _windowStorage support
        if (!_windowStorage) {
            err = new Error(typeof _windowStorage + ' not supported');
            err.code = LS_NOT_AVAILABLE;
            throw err;
        }

        try {
            items = _windowStorage.length;
        } catch (E) {
            throw _formatError(E);
        }

        try {
            // we try to set a value to see if _windowStorage is really usable or not
            _windowStorage.setItem('__storageInitTest', (+new Date).toString(16));
            _windowStorage.removeItem('__storageInitTest');
        } catch (E) {
            if (items) {
                // there is already some data stored, so this might mean that storage is full
                throw _formatError(E);
            } else {
                // we do not have any data stored and we can't add anything new
                // so we are most probably in Private Browsing mode where
                // _windowStorage is turned off in some browsers (max storage size is 0)
                err = new Error(typeof _windowStorage + ' is disabled');
                err.code = LS_DISABLED;
                throw err;
            }
        }

        return true;
    }

    function _formatError(E) {
        var err;

        // No more storage:
        // Mozilla: NS_ERROR_DOM_QUOTA_REACHED, code 1014
        // WebKit: QuotaExceededError/QUOTA_EXCEEDED_ERR, code 22
        // IE number -2146828281: Out of memory
        // IE number -2147024882: Not enough storage is available to complete this operation
        if (E.code === 22 || E.code === 1014 || [-2147024882, -2146828281, -21474675259].indexOf(E.number) > 0) {
            err = new Error(typeof _windowStorage + ' quota exceeded');
            err.code = LS_QUOTA_EXCEEDED;
            return err;
        }

        // SecurityError, _windowStorage is turned off
        if (E.code === 18 || E.code === 1000) {
            err = new Error(typeof _windowStorage + ' is disabled');
            err.code = LS_DISABLED;
            return err;
        }

        // We are trying to access something from an object that is either null or undefined
        if (E.name === 'TypeError') {
            err = new Error(typeof _windowStorage + ' is disabled');
            err.code = LS_DISABLED;
            return err;
        }

        return E;
    }

    // Sets value for _lsStatus
    function _checkError(err) {
        if (!err) {
            _lsStatus = 'OK';
            return err;
        }

        switch (err.code) {
            case LS_NOT_AVAILABLE:
            case LS_DISABLED:
            case LS_QUOTA_EXCEEDED:
                _lsStatus = err.code;
                break;
            default:
                _lsStatus = err.code || err.number || err.message || err.name;
        }

        return err;
    }

    ////////////////////////// PUBLIC INTERFACE /////////////////////////

    try {
        _init();
    } catch (E) {
        _checkError(E);
    }

    var res = {

        version: VERSION,

        status: _lsStatus,

        canUse: function() {
            return _lsStatus === 'OK' && !!_storage_available;
        },

        set: function(key, value, options) {
            if (key === '__storage_meta') {
                return false;
            }

            if (!_storage) {
                return false;
            }

            // undefined values are deleted automatically
            if (typeof value === 'undefined') {
                return this.deleteKey(key);
            }

            options = options || {};

            // Check if the value is JSON compatible (and remove reference to existing objects/arrays)
            try {
                value = JSON.parse(JSON.stringify(value));
            } catch (E) {
                return _formatError(E);
            }

            _storage[key] = value;

            if (_flag) _setTTL(key, options.TTL || 0);

            return _save();
        },

        hasKey: function(key) {
            return !!this.get(key);
        },

        get: function(key) {
            if (!_storage) {
                return false;
            }

            if (_windowStorage === window.sessionStorage) return _storage[key];

            if (_storage.hasOwnProperty(key) && key !== '__storage_meta') {
                // TTL value for an existing key is either a positive number or an Infinity
                if (this.getTTL(key)) {
                    return _storage[key];
                }
            }
        },

        deleteKey: function(key) {

            if (!_storage) {
                return false;
            }

            if (key in _storage) {
                delete _storage[key];

                if (_flag) _setTTL(key, 0);

                return _save();
            }

            return false;
        },

        setTTL: function(key, ttl) {
            if (!_storage) {
                return false;
            }

            _setTTL(key, ttl);

            return _save();
        },

        getTTL: function(key) {
            var ttl;

            if (!_storage) {
                return false;
            }

            if (_storage.hasOwnProperty(key)) {
                if (_storage.__storage_meta &&
                    _storage.__storage_meta.TTL &&
                    _storage.__storage_meta.TTL.expire &&
                    _storage.__storage_meta.TTL.expire.hasOwnProperty(key)) {

                    ttl = Math.max(_storage.__storage_meta.TTL.expire[key] - (+new Date()) || 0, 0);

                    return ttl || false;
                } else {
                    return Infinity;
                }
            }

            return false;
        },

        flush: function() {
            if (!_storage) {
                return false;
            }

            _storage = {};
            try {
                _windowStorage.removeItem(_key);
                return true;
            } catch (E) {
                return _formatError(E);
            }
        },

        index: function() {
            if (!_storage) {
                return false;
            }

            var index = [],
                i;
            for (i in _storage) {
                if (_storage.hasOwnProperty(i) && i !== '__storage_meta') {
                    index.push(i);
                }
            }
            return index;
        },

        length: function() {
            return this.index().length;
        },

        getAll: function() {
            if (!_storage) {
                return false;
            }

            var list = [],
                i;
            for (i in _storage) {
                if (_storage.hasOwnProperty(i) && i !== '__storage_meta') {
                    list.push(_storage[i]);
                }
            }
            return list;
        },

        storageSize: function() {
            return _storage_size;
        }
    };

    if (_flag) return res;
    else {
        delete res.setTTL;
        delete res.getTTL;
        return res;
    }
}));
