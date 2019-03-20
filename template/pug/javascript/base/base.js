/*
 * @Author: binchem
 * @Date:   2016-03-18 22:19:33
 * @Last Modified by:   binchem
 * @Last Modified time: 2016-09-01 10:37:41
 */

+ function($) {

    window.yy = window.yy || {};

    $(document).ready(function() {

        setTimeout(function() {
            $('a.active[pjax]').trigger('click');
        }, 200);

        $('.ui.dropdown').dropdown();
    });

    // nav/tab active
    // 触发change事件
    $(document).on('click', '.navbar-nav a.nav-link,.nav-tabs a.nav-link,a.group-link, .menu a.item', function(event) {
        $(this).parent().trigger("change", [this]).find('.active').removeClass('active');
        $(this).addClass('active'); //.closest('.collapse').removeClass('in');
    });

    try {
        window.addEventListener('load', function(e) {
            window.applicationCache.addEventListener('updateready', function(e) {
                if (window.applicationCache.status == window.applicationCache.UPDATEREADY) {
                    window.applicationCache.swapCache();
                    window.location.reload();
                }
            }, false);
        }, false);
    } catch (e) {}

    // 对Date的扩展，将 Date 转化为指定格式的String
    // 月(M)、日(d)、小时(h)、分(m)、秒(s)、季度(q) 可以用 1-2 个占位符， 
    // 年(y)可以用 1-4 个占位符，毫秒(S)只能用 1 个占位符(是 1-3 位的数字) 
    // 例子： 
    // (new Date()).Format("yyyy-MM-dd hh:mm:ss.S") ==> 2006-07-02 08:09:04.423 
    // (new Date()).Format("yyyy-M-d h:m:s.S")      ==> 2006-7-2 8:9:4.18 
    //不要使用new Date().toLocaleString()格式化为本地时间格式，并非所有的系统环境都是yyyy-MM-dd hh:mm:ss
    //应该使用new Date().format()，这样确保格式为yyyy-MM-dd hh:mm:ss
    Date.prototype.format = function(fmt) { //author: meizz 
        var o = {
            "M+": this.getMonth() + 1, //月份 
            "d+": this.getDate(), //日 
            "h+": this.getHours(), //小时 
            "m+": this.getMinutes(), //分 
            "s+": this.getSeconds(), //秒 
            "q+": Math.floor((this.getMonth() + 3) / 3), //季度 
            "S": this.getMilliseconds() //毫秒 
        };
        if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
        for (var k in o)
            if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
        return fmt;
    };
    // (new Date()).add(1, 'y');
    // (new Date()).add(1, 'm');
    // (new Date()).add(1, 'd');
    Date.prototype.add = function(n, type) {
        var y = this.getFullYear();
        var m = this.getMonth();
        var d = this.getDate();
        if (type === 'y') y += n;
        if (type === 'm') m += n;
        if (type === 'd') d += n;
        return new Date(y, m, d);
    };
    // Date.diff(new Date(), '2016-08-15')
    Date.diff = function(a, b) {
        if (typeof a === 'string') {
            a = a.split('-');
            a[1] -= 1;
            a.unshift('null');
        } else {
            a = [null, a.getFullYear(), a.getMonth(), a.getDate()];
        }
        a = new(Function.prototype.bind.apply(Date, a));
        if (typeof b === 'string') {
            b = b.split('-');
            b[1] -= 1;
            b.unshift('null');
        } else {
            b = [null, b.getFullYear(), b.getMonth(), b.getDate()];
        }
        b = new(Function.prototype.bind.apply(Date, b));
        return Math.ceil((a.getTime() - b.getTime()) / (1000 * 3600 * 24));
    };

    JSON.tryParse = function(json) {
        if (!json) return null;
        try {
            return JSON.parse(json);
        } catch (e) {
            return null;
        }
    };

    window.getQueryString = function(name) {
        var arr, reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)");
        if (arr = window.location.search.substr(1).match(reg))
            return unescape(arr[2]);
        else
            return '';
    };

    // pjax
    $(document).on('click', 'a[pjax]', function(event) {
        var pjax = $(this).attr('pjax');
        pjax = (!pjax || pjax == 'pjax') ? '#pjax-content' : pjax;

        if ($.support.pjax) {
            $.pjax.defaults.timeout = 5000;
            var opts = { container: pjax };
            var push = $(this).attr('push');
            var type = $(this).attr('method');
            var callback = $(this).attr('callback');

            if (push == 'false') {
                opts['push'] = false;
                opts['scrollTo'] = false;
            }

            if (type) opts['type'] = type;
            if (callback) opts['callback'] = callback;
            if (type && type.toLowerCase() != 'get') {
                if (confirm('确定操作?')) {
                    $.pjax.click(event, opts);
                } else return false;
            } else {
                $.pjax.click(event, opts);
            }

        } else {
            event.preventDefault();
            $.get($(this).attr('href'), function(data) {
                $(pjax).html(data);
            });
        }
        return true;
    });


    // $.fn.tmpl (弃用)
    // 改用： yy.tmpl([tmpl string]).render({ .... });
    window.yy.tmpl = function(_tmpl) {
        return {
            render: function(data) {
                if (!_tmpl || !_tmpl.replace) return '';
                var vals = [];
                for (var k in data) { vals.push(data[k]); }
                return _tmpl.replace(/\$\{([^\}]+)\}/g, function(capText, value) {
                    return (Function).apply(null, Object.keys(data).concat(['return ' + value])).apply(null, vals);
                });
            },
        };
    };
    $.fn.tmpl = function() {
        alert('$.fn.tmpl (弃用), 改用： yy.tmpl');
    };

    // parseQuery
    window.yy.parseQuery = function(baseUrl, opts) {
        var url = '';
        for (var k in opts) {
            url += '&' + k + '=' + opts[k];
        }
        return baseUrl + '?' + url.substr(1);
    };

    // $.fn.button
    function button(action) {
        if (action == 'disabled')
            return this.attr('disabled', 'disabled');
        if (action == 'reset')
            return this.removeAttr('disabled');
    }
    $.fn.button = button;

    // yy.tip
    var tip_cpunt = 0;
    var tips = [];

    function tip(msg) {
        var con = $('#yytip,#_yytip');
        if (!con.length) {
            con = $('<div id="_yytip"></div>').appendTo(document.body);
        }
        var atip = tips[tip_cpunt++] = $('<div>' + msg + '</div>').appendTo(con);
        con.show();
        setTimeout(function() {
            atip.fadeOut("slow", function() {
                $(this).remove();
            });
            --tip_cpunt;
            if (tip_cpunt == 0) {
                con.fadeOut("slow");
            }
        }, 4000);
    }
    window.yy.tip = tip;

    // $.fn.uuid (弃用)
    // yy.uuid([生成随机串的长度][,radix])
    // radix 相当于 ：'0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.substring(0,radix)
    function uuid(len, radix) {
        var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');
        var uuid = [];
        var i;
        radix = radix || chars.length;
        if (len) {
            for (i = 0; i < len; i++) uuid[i] = chars[0 | Math.random() * radix];
        } else {
            var r;
            uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-';
            uuid[14] = '4';
            for (i = 0; i < 36; i++) {
                if (!uuid[i]) {
                    r = 0 | Math.random() * 16;
                    uuid[i] = chars[(i == 19) ? (r & 0x3) | 0x8 : r];
                }
            }
        }
        return uuid.join('');
    }
    window.yy.uuid = uuid;
    $.fn.uuid = function() {
        alert('$.fn.uuid (弃用), 改用： yy.uuid');
    };

    // form submit
    $(document).on('click', "button[type='submit']", function(event) {
        event.preventDefault();
        var btn = $(this).button('disabled');
        var form = btn.attr('form') && $(btn.attr('form')) || btn.closest('form');
        var callback = btn.attr('callback') || form.attr('callback');
        var group = btn.attr('group');

        if (!form.vierfy({ group: group })) {
            btn.button('reset');
            return false;
        }

        yy.tip('正在提交，请稍候...');
        var formData = form.serializeArray();
        if (btn.attr('name')) formData.push({ name: btn.attr('name'), value: btn.val() });
        var opts = {
            type: btn.attr('method') || form.attr('method') || 'POST',
            data: $.grep(formData, function(o) {
                return o.value;
            })
        };
        if (form.attr('action')) opts['url'] = form.attr('action');
        if (btn.attr('action')) opts['url'] = btn.attr('action');

        $.ajax(opts)
            .done(function(res) {
                if (callback) {
                    if (yy.callbacks[callback](res, btn, form) === false) return;
                }
                if (res.message) {
                    yy.tip(res.message);
                } else {
                    if (form.attr('location')) {
                        yy.tip('操作成功, 即将跳转页面...');
                        setTimeout(function() {
                            window.location.href = form.attr('location');
                        }, 2000);
                        return;
                    }
                    yy.tip('提交成功');
                }
            })
            .fail(function() {
                yy.tip('连接服务器失败');
            })
            .always(function() {
                setTimeout(function() {
                    btn.button('reset');
                }, 2000);
            });
        return false;
    });

    // formFill
    $.fn.extend({
        fill: function(data, options) {
            var self = this;
            return this.each(function(idx, form) {
                $.each(form, function(i, el) {
                    $(el).val(data && data[el.name] || '').change();
                });
            });
        }
    });

    // form vierfy
    function vierfy(el) {
        el = $(el);
        var regex = el.attr('regex');
        var equalTo = el.attr('equalTo');
        var flag = true;
        if (el.attr('required') && el.val().length < 1) {
            el.addClass('form-control-danger').parent().addClass('has-danger');
            flag = false;
        }
        if (regex) {
            if (el.val().length > 0 && !new RegExp(regex).test(el.val())) {
                el.addClass('form-control-danger').parent().addClass('has-danger');
                flag = false;
            } else {
                el.removeClass('form-control-danger').parent().removeClass('has-danger');
            }
        }
        if (equalTo) {
            if ($('#' + equalTo).val() != el.val()) {
                el.addClass('form-control-danger').parent().addClass('has-danger');
                flag = false;
            } else {
                el.removeClass('form-control-danger').parent().removeClass('has-danger');
            }
        }
        return flag;
    }
    $.fn.extend({
        vierfy: function(opts) {
            var self = this;
            var flag = true;
            $.map(self.serializeArray(), function(el) {
                var o = $('[name="' + el.name + '"]', self);
                if (!o.attr('group') || !opts.group || o.attr('group') == opts.group)
                    if (!vierfy(o)) {
                        if (flag) o.focus();
                        flag = false;
                    }
            });
            return flag;
        }
    });

    yy.callbacks = {
        default_callback: function(event, res) {
            if (!res.message) {
                $.pjax.reload('#pjax-content');
            } else yy.tip(res.message);
        },
        sub_default_callback: function(event, res) {
            if (!res.message) {
                $.pjax.reload('#sub-tb');
            } else yy.tip(res.message);
        },
    };

}(jQuery);
