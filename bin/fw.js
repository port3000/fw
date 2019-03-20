#!/usr/bin/env node

'use strict';

var program = require('commander');
var path = require('path');
var mysql = require('mysql');
var fs = require('fs');
var request = require('request');
var zlib = require('zlib');
var tar = require("tar");
var _ = global._ = require('lodash');
var proc = require('child_process');


var currPath = process.cwd();
var fwPath = path.resolve(__dirname, '../');
var pkg = require(path.resolve(fwPath, 'package.json'));

process.env._logger = false;
var fw = require(path.resolve(fwPath, 'lib/fw'));
process.env._logger = true;

program
    .command('v')
    .description('查看版本号')
    .action(function() {
        log.warn(pkg.name, pkg.version);
        process.exit(1);
    });

program
    .command('conf')
    .description('查看当前项目配置')
    .action(function() {
        log.warn(fw.config);
        process.exit(1);
    });

program
    .command('ls')
    .description('查看当前项目模块')
    .action(function() {

        var getLatest = function(p) {
            if (p.scope == '/') return log.gray('-');
            var s = '';
            try {
                s = proc.execSync('npm dist-tag ls ' + p.pkg.name).toString('utf8');
                s = s.replace(/latest:\s/, '').replace(/\n/g, '');
            } catch (e) {}
            return s == p.pkg.version ? s : log.green(s);
        };
        log.warn('=[scope]==[name]======[version]==[latest]=====');
        _.forEach(fw.plus.list, (p) => {
            log.warn('  ', _.padEnd(p.scope, 7), _.padEnd(p.name, 12), _.padEnd(p.pkg.version, 9), getLatest(p));
        });
        process.exit(1);
    });

program
    .command('update')
    .description('更新当前项目所有模块')
    .action(function() {

        var getLatest = function(p) {
            if (p.scope == '/') return log.gray('-');
            var s = '';
            try {
                s = proc.execSync('npm dist-tag ls ' + p.pkg.name).toString('utf8');
                s = s.replace(/latest:\s/, '').replace(/\n/g, '');
            } catch (e) {}
            return s;
        };

        log.warn('************系统正在升级所有模块************');
        let flag = false;

        _.forEach(fw.plus.list, (p) => {
            let lastVersion = getLatest(p);

            if (p.scope == '/' || p.pkg.version.replace(/[^0-9]/ig, "") == lastVersion.replace(/[^0-9]/ig, "")) return true;

            log.warn(log.bold.italic.underline.red('系统正在自动升级模块：[ ' + p.pkg.name + '@' + lastVersion + ' ]'));

            let cmd = 'npm i -S ' + p.pkg.name + '@' + lastVersion;
            proc.execSync(cmd).toString('utf8');

            flag = true;
            log.sys('> 模块 ' + p.pkg.name + ' 安装完毕！');
        });
        if (!flag) log.sys('> 太棒了 ^_^，所有模块为最新版本！');
        process.exit(1);
    });

program
    .command('new [name]')
    .description('创建模块项目')
    .option('-ejs, --ejs', 'ejs view engine')
    .option('-pug, --pug', 'jade view engine')
    .action(function(name, options) {

        let copySync = function(src, dst) {
            let _copy = (src, dst) => {
                let paths = fs.readdirSync(src);
                _.forEach(paths, (path, i) => {
                    if (['.DS_Store'].indexOf(path) > -1) return;
                    var _src = src + '/' + path,
                        _dst = dst + '/' + path,
                        readable, writable;
                    let st = fs.statSync(_src);
                    if (st.isFile()) {
                        if (_src.indexOf('/views/') > -1) {
                            fs.readFile(_src, function(err, html) {
                                if (err) throw err;
                                html = html.toString().replace(/\$\{__plusname\}/g, name);
                                fs.writeFile(_dst, html, function(err) {
                                    if (err) throw err;
                                });
                            });
                        } else {
                            readable = fs.createReadStream(_src);
                            writable = fs.createWriteStream(_dst);
                            readable.pipe(writable);
                        }
                    } else if (st.isDirectory()) {
                        copySync(_src, _dst);
                    }
                });
            };
            if (fs.existsSync(dst)) {
                _copy(src, dst);
            } else {
                fs.mkdirSync(dst);
                _copy(src, dst);
            }
        };

        copySync(path.resolve(fwPath, (options.ejs ? 'template/ejs' : 'template/pug')), path.resolve(currPath, name));
        var cmd = 'npm config set init-version 0.0.1 && npm init --scope=dev -y && npm link @fw/fw';
        proc.execSync(cmd, {
            cwd: path.resolve(currPath, name),
            stdio: 'inherit'
        });
        log.sys('> fw 安装完毕！');

        cmd = 'npm link gulp && npm link gulp-uglify && npm link gulp-concat && npm link gulp-sourcemaps';
        proc.execSync(cmd, {
            cwd: path.resolve(currPath, name),
            stdio: 'inherit'
        });
        log.sys('> gulp gulp-uglify gulp-concat gulp-sourcemaps 安装完毕！');

        cmd = 'npm link gulp-clean-css && npm link gulp-postcss && npm link autoprefixer';
        proc.execSync(cmd, {
            cwd: path.resolve(currPath, name),
            stdio: 'inherit'
        });
        log.sys('> gulp-clean-css gulp-postcss autoprefixer 安装完毕！');

        log.sys(log.bold.italic.underline.red('> 艰巨的时刻到了！！！开始安装 gulp-sass'));
        cmd = 'npm link gulp-sass && npm link gulp-inject';
        proc.execSync(cmd, {
            cwd: path.resolve(currPath, name),
            stdio: 'inherit'
        });

        log.sys('> 全部完毕！');
        setTimeout(() => {
            process.exit(1);
        }, 1000);
    });

program
    .command('map [database] [table]')
    .description('从数据库映射生成一个数据模型到项目')
    .action(function(database, table) {

        if (!database || !table) {
            log.error('> 参数错误');
            return process.exit(1);
        }

        var _cf, _conn;
        _.each(fw.config.connections, function(_cfs, k) {
            if (_cfs.database == database) {
                _cf = _cfs;
                _conn = k;
            }
        });
        if (!_cf) {
            log.error('> 在项目配置中找不到数据库：', database, '的配置。');
            return process.exit(1);
        }

        log.info(_cf);
        var connection = mysql.createConnection(_cf);
        connection.query('describe ' + table + ';', function(err, results) {

            connection.end();
            if (err) {
                log.error(err);
                return process.exit(1);
            }

            var _model = _.camelCase(table.substring(table.indexOf('_') + 1)),
                _columns = [],
                _pri;

            _model = _model[0].toUpperCase() + _model.substr(1);

            _.each(results, function(f) {
                if (f.Key == 'PRI') {
                    _pri = f.Field;
                }
                _columns.push(f.Field);
            });

            fs.readFile(path.resolve(fwPath, 'lib/model.js'), function(err, data) {
                if (err) throw err;
                var compiled = _.template(data);
                var fpath = path.resolve(currPath, 'controllers/' + _model + '.js');

                if (!fs.existsSync(path.resolve(currPath, 'controllers'))) {
                    fs.mkdirSync(path.resolve(currPath, 'controllers'));
                }

                fs.exists(fpath, function(exists) {
                    if (!exists) {
                        fs.writeFile(fpath, compiled({
                                connection: _conn,
                                tableName: table,
                                primaryKey: _pri,
                                fields: '[\'' + _columns.join('\', \'') + '\']'
                            }),
                            function(err) {
                                if (err) throw err;
                                log.sys('created controller: ', _model + '.js');
                                return process.exit(1);
                            });
                    } else {
                        log.error('创建失败！Controller: ' + _model + '.js 文件已存在');
                        return process.exit(1);
                    }
                });
            });
        });

    });

program
    .command('clone <@scope>/<name>@<version>')
    .description('从远程仓库拷贝一个模块到当前目录')
    .action(function(args) {

        if (args.indexOf('@') < 0 || args.indexOf('/') < 0) {
            log.error('> 只支持从私有仓库拷贝');
            return process.exit(1);
        }

        if (fs.existsSync(path.resolve(currPath, 'node_modules'))) {
            log.error('> 拷贝到项目根目录是不被允许的 (在当前目录发现node_modules文件夹)');
            return process.exit(1);
        }

        let stdout = _.trim(proc.execSync('npm config get userconfig'));
        let home = process.env.HOME;
        let npmcr = fs.readFileSync(stdout, 'utf8');

        args = args.match(/[@\/]([^@\/])+/g).map(o => o.substr(1));

        let scope = '@' + args[0];
        let name = args[1];
        let pkgUrl;
        let tmp = '@' + args[0] + ':registry=';
        npmcr.split(/\n/g).forEach(function(ca) {
            if (ca.indexOf(tmp) == 0) {
                pkgUrl = ca.substr(tmp.length);
            }
        });

        let token;
        tmp = pkgUrl.substr('http:'.length) + ':_authToken=';
        npmcr.split(/\n/g).forEach(function(ca) {
            if (ca.indexOf(tmp) == 0) {
                token = ca.substring((tmp).length + 1, ca.length - 1);
            }
        });

        let version = args[2];
        if (!version) {
            try {
                version = proc.execSync('npm dist-tag ls ' + scope + '/' + name).toString('utf8');
                version = version.replace(/latest:\s/, '').replace(/\n/g, '');
            } catch (e) {
                version = '';
            }
        }

        request({
            url: `${pkgUrl}${scope}%2f${name}/-/${name}-${version}.tgz`,
            encoding: null,
            headers: {
                authorization: 'Bearer ' + token
            }
        }, function(error, response, body) {
            var tgzFile = path.resolve(currPath, name + '-' + version + '.tgz');

            fs.writeFile(tgzFile, body, function(err) {
                if (err) throw err;
                fs.createReadStream(tgzFile).on('error', function(err) {
                        log.error(err);
                    })
                    .pipe(zlib.Gunzip())
                    .pipe(tar.Extract({
                        path: currPath
                    }).on('error', function(err) {
                        log.error(err);
                    }).on('end', function() {

                        if (fs.existsSync(path.resolve(currPath, name))) {
                            if (!fs.existsSync(path.resolve(home, '.Trash'))) {
                                fs.mkdirSync(path.resolve(home, '.Trash'));
                            }
                            fs.rename(path.resolve(currPath, name), path.resolve(home, '.Trash', name + (+new Date())));
                        }
                        fs.unlinkSync(tgzFile);

                        fs.rename(path.resolve(currPath, 'package'), path.resolve(currPath, name), function() {
                            log.star('> got ' + scope + '/' + name + '@' + version);

                            var cmd = 'npm link @fw/fw && npm i';
                            proc.execSync(cmd, {
                                cwd: path.resolve(currPath, name),
                                stdio: 'inherit'
                            });
                            log.sys('> finished!');
                            return process.exit(1);
                        });
                    }));
            });
        });
    });

program
    .command('init')
    .description('初始化项目')
    .action(function() {

        var cmd = 'npm link @fw/fw';
        proc.execSync(cmd, {
            cwd: path.resolve(currPath),
            stdio: 'inherit'
        });
        log.sys('> fw 安装完毕！');

        cmd = 'npm link gulp && npm link gulp-uglify && npm link gulp-concat && npm link gulp-sourcemaps';
        proc.execSync(cmd, {
            cwd: path.resolve(currPath),
            stdio: 'inherit'
        });
        log.sys('> gulp gulp-uglify gulp-concat gulp-sourcemaps 安装完毕！');

        cmd = 'npm link gulp-clean-css && npm link gulp-postcss && npm link autoprefixer';
        proc.execSync(cmd, {
            cwd: path.resolve(currPath),
            stdio: 'inherit'
        });
        log.sys('> gulp-clean-css gulp-postcss autoprefixer 安装完毕！');

        log.sys(log.bold.italic.underline.red('> 艰巨的时刻到了！！！开始安装 gulp-sass'));
        cmd = 'npm link gulp-sass && npm link gulp-inject';
        proc.execSync(cmd, {
            cwd: path.resolve(currPath),
            stdio: 'inherit'
        });

        log.sys('> finished');
        setTimeout(() => {
            process.exit(1);
        }, 1000);

    });

program
    .command('map2 [database] [table]')
    .description('从数据库映射生成一个数据模型到项目')
    .action(function(database, table) {

        if (!database || !table) {
            log.error('> 参数错误');
            return process.exit(1);
        }

        var _cf, _conn;
        _.each(fw.config.connections, function(_cfs, k) {
            if (_cfs.database == database) {
                _cf = _cfs;
                _conn = k;
            }
        });
        if (!_cf) {
            log.error('> 在项目配置中找不到数据库：', database, '的配置。');
            return process.exit(1);
        }

        log.info(_cf);
        var connection = mysql.createConnection(_cf);
        connection.query('show full columns from ' + table + ';', function(err, results) {

            connection.end();
            if (err) {
                log.error(err);
                return process.exit(1);
            }

            var _model = _.camelCase(table.substring(table.indexOf('_') + 1));

            _model = _model[0].toUpperCase() + _model.substr(1);

            let _columns = {};
            let _uniKeys = [];
            let _primaryKey = [];
            let _requiredKeys = [];

            _.forEach(results, (f) => {
                if (f.Key == 'UNI') _uniKeys.push(f.Field);
                if (f.Key == 'PRI') _primaryKey.push(f.Field);
                if (f.Null == 'NO' && f.Extra.toLowerCase() != 'auto_increment') _requiredKeys.push(f.Field);
                _columns[f.Field] = f.Comment;
            });

            fs.readFile(path.resolve(fwPath, 'lib/model2.js'), function(err, data) {
                if (err) throw err;
                var compiled = _.template(data);
                var fpath = path.resolve(currPath, 'controllers/' + _model + '2.js');

                if (!fs.existsSync(path.resolve(currPath, 'controllers'))) {
                    fs.mkdirSync(path.resolve(currPath, 'controllers'));
                }

                fs.exists(fpath, function(exists) {
                    if (!exists) {
                        fs.writeFile(fpath, compiled({
                                connection: _conn,
                                tableName: table,
                                uniKeys: JSON.stringify(_uniKeys),
                                primaryKey: JSON.stringify(_primaryKey),
                                columns: JSON.stringify(_columns).replace(/,/g, ',\n\t\t\t').replace(/{/, '{\n\t\t\t').replace(/}/, '\n\t\t}'),
                                requiredKeys: JSON.stringify(_requiredKeys),
                            }),
                            function(err) {
                                if (err) throw err;
                                log.sys('created controller: ', _model + '.js');
                                return process.exit(1);
                            });
                    } else {
                        log.error('创建失败！Controller: ' + _model + '.js 文件已存在');
                        return process.exit(1);
                    }
                });
            });
        });

    });

program
    .command('*')
    .description('未定义')
    .action(function(env) {
        console.log('undefined "%s"', env);
        return process.exit(1);
    });

program.parse(process.argv);
if (!program.args.length) program.help();