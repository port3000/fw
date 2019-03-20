/*
 * @Author: binchem
 * @Date:   2016-04-20 13:21:44
 * @Last Modified by:   able
 * @Last Modified time: 2016-05-25 15:15:13
 */

'use strict';

// var gulp = require('gulp');
// var uglify = require('gulp-uglify');
// var concat = require('gulp-concat');
// var sourcemaps = require('gulp-sourcemaps');
// var cleanCSS = require('gulp-clean-css');
// var postcss = require('gulp-postcss');
// var autoprefixer = require('autoprefixer');
// var sass = require('gulp-sass');

var fw = require('@fw/fw');
var app = require('./index');

// app.defaultLocals = app.defaultLocals || {};
// _.merge(app.defaultLocals, {
//     pretty: true,
// });

fw.app.listen(fw.config.port, () => {
    log.info(`env: ${app.get('env')}`);
    log.info(`Server started on: http://localhost:${fw.config.port}`);
});


// // css 编译
// gulp.task('sass', function() {
//     log.info('>>> scss to css ...');
//     gulp.src(['!./scss/comps/**', './scss/**/*.scss'])
//         .pipe(sourcemaps.init())
//         .pipe(sass().on('error', sass.logError))
//         .pipe(postcss([autoprefixer({ browsers: ['last 2 versions'] })]))
//         .pipe(cleanCSS())
//         .pipe(sourcemaps.write('./maps'))
//         .pipe(gulp.dest('./public/css'));
// });

// // js 合并压缩
// gulp.task('js', function() {
//     log.info('>>> minify js ...');

//     gulp.src([
//             './javascript/base/jquery.js',
//             './javascript/base/jquery.pjax.js',
//             './javascript/base/bootstrap.js',
//             './javascript/base/holder.js',
//             './javascript/base/localStorage.js',
//             './javascript/base/api.js',
//             './javascript/base/base.js'
//         ])
//         .pipe(sourcemaps.init())
//         .pipe(concat('base.js'))
//         .pipe(uglify())
//         .pipe(sourcemaps.write('./maps'))
//         .pipe(gulp.dest('./public/js'));

//     return gulp.src(['!./javascript/base/**', './javascript/**/*.js'])
//         .pipe(sourcemaps.init())
//         .pipe(uglify())
//         .pipe(sourcemaps.write('./maps'))
//         .pipe(gulp.dest('./public/js'));
// });

// gulp.watch('./scss/**/*.scss', ['sass']);
// gulp.watch('./javascript/**/*.js', ['js']);
// gulp.run(['sass', 'js']);
