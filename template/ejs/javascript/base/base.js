/*
 * @Author: binchem
 * @Date:   2016-03-18 22:19:33
 * @Last Modified by:   able
 * @Last Modified time: 2016-07-25 14:01:57
 */

// Check if a new cache is available on page load. 
window.addEventListener('load', function(e) {
    window.applicationCache.addEventListener('updateready', function(e) {
        if (window.applicationCache.status == window.applicationCache.UPDATEREADY) {
            // Browser downloaded a new app cache. 
            // Swap it in and reload the page to get the new hotness. 
            window.applicationCache.swapCache();
            if (confirm('A new version of this site is available. Load it?')) {
                window.location.reload();
            }
        } else {
            // Manifest didn't changed. Nothing new to server. 
        }
    }, false);
}, false);

// pjax
+ function($) {
    $(function() {
        if ($.support.pjax) {
            $.pjax.defaults.timeout = 5000;
            $(document).on('click', 'a[data-pjax]', function(event) {
                var con = $(this).attr('data-pjax');
                con = (!con || con == 'data-pjax') ? '#pjax-content' : con;
                $.pjax.click(event, { container: con });
            });

            $(document).on('pjax:send', function() {
                $.fn.alert('请稍候...');
            });

            $(document).on('pjax:success', function() {
                $.fn.alert.close();
            });
        }
    });
}(jQuery);

// $.fn.tmpl
+ function($) {
    function template(tmpl) {
        if (!(this instanceof template)) return new template(tmpl);
        this.tmpl = tmpl;
    }
    template.prototype.render = function(data) {
        if (!this.tmpl || !this.tmpl.replace) return '';
        return this.tmpl.replace(/\$\{([a-zA-Z0-9_-]+)\}/g, function(capText, value) {
            return data[value];
        });
    };
    $.fn.tmpl = template;
}(jQuery);

// $.fn.uuid
+ function($) {
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
    $.fn.uuid = uuid;
}(jQuery);

// form vierfy & submit
+ function($) {

    $(function() {

        $(document).on('click', "button[type='submit']", function(event) {
            event.preventDefault();
            var btn = $(this).button('loading');
            var form = btn.attr('form') && $(btn.attr('form')) || btn.closest('form');

            if (!form.vierfy()) {
                btn.button('reset');
                return false;
            }

            $.fn.alert('正在提交，请稍候...');
            var formData = form.serializeArray();
            if (btn.attr('name')) formData.push({ name: btn.attr('name'), value: btn.val() });
            var opts = {
                type: "POST",
                data: formData
            };
            if (form.attr('action')) opts['url'] = form.attr('action');

            $.ajax(opts)
                .done(function(res) {
                    if (res.message) {
                        $.fn.alert.type = 'error';
                        $.fn.alert.msg = res.message;
                        btn.button('reset');
                    } else {

                        if (form.attr('location')) {
                            $.fn.alert.msg = '操作成功, 即将跳转页面...';
                            setTimeout(function() {
                                window.location.href = form.attr('location');
                            }, 2000);
                            return;
                        }
                        if (form.attr('callback')) {
                            eval(form.attr('callback'))(res, btn, form);
                        }
                        $.fn.alert.msg = '提交成功';
                        setTimeout(function() {
                            $.fn.alert.close();
                        }, 2000);
                    }
                })
                .fail(function() {
                    $.fn.alert.type = 'error';
                    $.fn.alert.msg = '连接服务器失败';
                    btn.button('reset');
                })
                .always(function() {
                    setTimeout(function() {
                        btn.button('reset');
                    }, 2000);
                });
        });
    });
}(jQuery);

// $.fn.alert
+ function($) {

    function alert(msg, type) {

        alert._getClass = function(type) {
            switch (type) {
                case 'success':
                    return 'alert-success';
                case 'info':
                    return 'alert-info';
                case 'warning':
                    return 'alert-warning';
                case 'error':
                    return 'alert-danger';
                default:
                    return 'alert-success';
            }
        };

        alert._msg = msg;
        alert._type = alert._getClass(type);

        alert._alert = $('<div class="alert pinTop ' + alert._type + ' alert-dismissible" role="alert"><button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button><div role="content"><p>' + msg + '</p></div></div>');
        alert._alert.appendTo(document.body);
        return alert;
    }

    alert.close = function() {
        $('.alert.pinTop>[data-dismiss="alert"]').click();
    };

    Object.defineProperty(alert, 'type', {
        configurable: true,
        enumerable: true,
        get: function() {
            return alert._type;
        },
        set: function(val) {
            alert._type = alert._getClass(val);
            alert._alert.addClass(alert._type);
        },
    });

    Object.defineProperty(alert, 'msg', {
        configurable: true,
        enumerable: true,
        get: function() {
            return alert._msg;
        },
        set: function(val) {
            alert._msg = val;
            alert._alert.find('div[role="content"]:eq(0)').html('<p>' + val + '</p>');
        },
    });

    $.fn.alert = alert;
}(jQuery);

// formFill
+ (function($) {
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
})(jQuery);

// form vierfy
+ (function($) {

    function vierfy(el) {
        el = $(el);
        var regex = el.attr('regex');
        var equalTo = el.attr('equalTo');
        var flag = true;
        if (el.attr('required') && el.val().length < 1) {
            el.parent().addClass('has-error has-feedback');
            flag = false;
        }
        if (regex) {
            if (!new RegExp(regex).test(el.val())) {
                el.parent().addClass('has-error has-feedback');
                flag = false;
            } else {
                el.parent().removeClass('has-error has-feedback');
            }
        }
        if (equalTo) {
            if ($('#' + equalTo).val() != el.val()) {
                el.parent().addClass('has-error has-feedback');
                flag = false;
            } else {
                el.parent().removeClass('has-error has-feedback');
            }
        }
        return flag;
    }

    $.fn.extend({
        vierfy: function(options) {
            var self = this;
            var flag = true;
            self.serializeArray().forEach(function(el) {
                if (!vierfy($('#' + el.name))) {
                    if (flag) $('#' + el.name).focus();
                    flag = false;
                }
            });
            return flag;
        }
    });
})(jQuery);

+ function($) {

    // 对Date的扩展，将 Date 转化为指定格式的String
    // 月(M)、日(d)、小时(h)、分(m)、秒(s)、季度(q) 可以用 1-2 个占位符， 
    // 年(y)可以用 1-4 个占位符，毫秒(S)只能用 1 个占位符(是 1-3 位的数字) 
    // 例子： 
    // (new Date()).Format("yyyy-MM-dd hh:mm:ss.S") ==> 2006-07-02 08:09:04.423 
    // (new Date()).Format("yyyy-M-d h:m:s.S")      ==> 2006-7-2 8:9:4.18 
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

    JSON.tryParse = function(json) {
        if (!json) return null;
        try {
            return JSON.parse(json);
        } catch (e) {
            return null;
        }
    };

}(jQuery);
