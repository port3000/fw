'use strict';

var https = require('https');
var fs = require('fs');
var path = require('path');
var gulp = require('gulp');
var uglify = require('gulp-uglify');
var concat = require('gulp-concat');
var sourcemaps = require('gulp-sourcemaps');
var cleanCSS = require('gulp-clean-css');
var postcss = require('gulp-postcss');
var autoprefixer = require('autoprefixer');
var sass = require('gulp-sass');
var inject = require('gulp-inject');

var fw = require('@fw/fw');
var app = require('./index');

app.defaultLocals = app.defaultLocals || {};
app.defaultLocals = {
    pretty: true,
};

fw.app.listen(fw.config.port, () => {
    log.info(`env: ${app.get('env')}`);
    log.info(`Server started on: http://localhost:${fw.config.port}`);
});

// css 编译
gulp.task('sass', function() {
    log.info('>>> scss to css ...');
    gulp.src(['!./scss/comps/**', './scss/**/*.scss'])
        .pipe(sourcemaps.init())
        .pipe(sass().on('error', sass.logError))
        .pipe(postcss([autoprefixer({ browsers: ['last 2 versions'] })]))
        .pipe(cleanCSS())
        .pipe(sourcemaps.write('./maps'))
        .pipe(gulp.dest('./public/css'));
});

// js 合并压缩
gulp.task('js', function() {
    log.info('>>> minify js ...');

    gulp.src([
            './javascript/base/jquery-1.12.4.js',
            './javascript/base/jquery.pjax.js',
            './javascript/base/semantic.js',
            './javascript/base/base.js',
            './javascript/base/localStorage.js',
            './javascript/base/tmpl.js',
            './javascript/base/api.js',
        ])
        .pipe(sourcemaps.init())
        .pipe(concat('base.js'))
        .pipe(uglify())
        .pipe(sourcemaps.write('./maps'))
        .pipe(gulp.dest('./public/js'));

    return gulp.src(['!./javascript/base/**', './javascript/**/*.js'])
        .pipe(sourcemaps.init())
        .pipe(uglify())
        .pipe(sourcemaps.write('./maps'))
        .pipe(gulp.dest('./public/js'));
});

// 
// gulp.task('tmpl', function() {
//     return gulp.src('./javascript/base/tmpl.js')
//         .pipe(inject(gulp.src('./views/tmpl/*.jade'), {
//             starttag: '//- inject:js',
//             endtag: '//- endinject',
//             transform: function(filePath, file) {
//                 return '"' + path.basename(filePath, '.jade') + '": "' + Utils.checksum(file.contents.toString('utf8')) + '",';
//             }
//         }))
//         .pipe(gulp.dest('./javascript/base'));
// });

gulp.run(['sass', 'js']);
// gulp.run(['sass', 'tmpl', 'js']);

setTimeout(function() {
    gulp.watch('./scss/**/*.scss', ['sass']);
    gulp.watch('./javascript/**/*.js', ['js']);
    // gulp.watch('./views/tmpl/*.jade', ['tmpl']);
}, 3000);
