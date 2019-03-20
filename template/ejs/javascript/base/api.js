+ function(root, $) {
    'use strict';

    var _api = {};

    function defineGetter(obj, name, getter) {
        Object.defineProperty(obj, name, {
            configurable: true,
            enumerable: true,
            get: getter
        });
    }

    defineGetter(_api, 'User', function() {
        var store = localSession('user');
        var result = {};
        var reload = function() {
            var o = JSON.tryParse($.ajax({ url: '/wechat/login/user', async: false }).responseText);
            if (o && o.openid) {
                o.ttl = +new Date() + 1000 * 60 * 5;
                store.set('_', o);
            }
            return o || {};
        };
        if (!store.canUse() || !(result = store.get('_')))
            result = reload();
        if (result.ttl < +new Date()) result = reload();

        result.reload = reload;
        result.update = function(o) {
            if (!o || !o.openid) return false;
            var _o = store.get('_');
            $.extend(_o, o);
            store.set('_', _o);
            return true;
        };
        result.delete = function() {
            return store.flush();
        };
        return result;
    });

    _api.Tmpl = function(module, tmpl_id, options) {
        if (!module || !tmpl_id) return false;
        options = options || {};
        var store = localCache('tmpls');
        var result;
        if (store.canUse() && (result = store.get(tmpl_id) || {})) {
            if (result.chechsum == _tmpl_checksum[tmpl_id])
                return new $.fn.tmpl(result.tmpl);
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
            return new $.fn.tmpl(res.tmpl);
        }
    };

    root._api = _api;

}(this, jQuery);
