/*
 * @Author: binchem
 * @Date:   2016-05-24 17:47:46
 * @Last Modified by:   binchem
 * @Last Modified time: 2016-09-01 10:25:08
 * 
 * _api.User() => Object { uid: 1, .... }
 * _api.User.reload() => Object { uid: 1, .... }
 * 
 */

+ function(root, $) {
    'use strict';

    var _api = {};

    _api.Tmpl = function(module, tmpl_id, options) {
        if (!module || !tmpl_id) return false;
        options = options || {};
        var store = _api.Tmpl.store;
        var result;
        if (store.canUse() && (result = store.get(tmpl_id) || {})) {
            if (result.chechsum == _tmpl_checksum[tmpl_id])
                return yy.tmpl(result.tmpl);
        }
        var res = $.ajax({
            url: '/' + module + '/tmpl/' + tmpl_id,
            data: options,
            async: false
        }).responseText;
        if (res && !res.message) {
            res = {
                tmpl: res,
                chechsum: _tmpl_checksum[tmpl_id] || +new Date()
            };
            if (!options.nocache) store.set(tmpl_id, res);
            return yy.tmpl(res.tmpl);
        }
    };
    _api.Tmpl.store = localCache('tmpl');

    for (var k in _api) {
        _api[k].reload = function() {
            if (this.store.canUse()) this.store.flush();
            return this();
        };
    }

    root._api = _api;

}(this, jQuery);
