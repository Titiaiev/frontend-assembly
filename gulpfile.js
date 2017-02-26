'use strict';
/*
* gulp           - собрать всё, запустить вебсервер, следить за изменениями файлов
* gulp build     - собрать всё
* gulp clean     - удалить папку назначения
* gulp watch     - следить за изменениями файлов
* gulp webserver - запустить вебсервер
* gulp deploy    - загрузить собраный проект по ftp
* gulp html:build | sass:build | less:build | js:build | fonts:build | image:build
*/
/* НАСТРОЙКИ */
/* 
*добавить имя(строку, например 'projectname') проекта для тунеля,
*который будет выглядить так - http://projectmane.localtunnel.me
*/
var projectname = '';

/* настройки ftp */
var hostname = 'example.com', //домен проекта, например example.com
    username = 'admin',         //логин, например admin
    userpassword = 'pass',     //пароль, например password
    webpath = 'public_html';         //удалённая папка, например public_html

var sourceFolder = 'src',       //папка с исходниками
    resultFolder = 'dest',      //папка назначения
    useSass = false,            //выбрать Sass или Less
    useLess = true;
/* КОНЕЦ НАСТРОЕК */

/* для обработки выбора между sass и less */
var sassOrLess,
    watchStyle;
if (useSass) {
    watchStyle = sourceFolder + '/style/**/*.scss';
    sassOrLess = 'sass:build';
}
else if (useLess) {
    watchStyle = sourceFolder + '/style/**/*.less';
    sassOrLess = 'less:build';
}
else console.log('Ошибка! Выбирете один из препроцесоров!');

/* переменные с плагинами */
var gulp = require('gulp'),
    watch = require('gulp-watch'),
    prefixer = require('gulp-autoprefixer'),
    uglify = require('gulp-uglify'),
    sass = require('gulp-sass'),
    sourcemaps = require('gulp-sourcemaps'),
    rigger = require('gulp-rigger'),
    cssmin = require('gulp-minify-css'),
    imagemin = require('gulp-imagemin'),
    pngquant = require('imagemin-pngquant'),
    rimraf = require('rimraf'),
    ftp = require('vinyl-ftp'),
    browserSync = require("browser-sync"),
    less = require('gulp-less'),
    reload = browserSync.reload;

/* объект с путями*/
var path = {
    build: {
        html: resultFolder + '/',
        js: resultFolder + '/js/',
        css: resultFolder + '/css/',
        img: resultFolder + '/img/',
        fonts: resultFolder + '/fonts/'
    },
    src: {
        html: sourceFolder + '/*.html',
        js: sourceFolder + '/js/main.js',
        sass: sourceFolder + '/style/main.scss',
        less: sourceFolder + '/style/main.less',
        img: sourceFolder + '/img/**/*.*',
        fonts: sourceFolder + '/fonts/**/*.*'
    },
    watch: {
        html: sourceFolder + '/**/*.html',
        js: sourceFolder + '/js/**/*.js',
        style: watchStyle,
        img: sourceFolder + '/img/**/*.*',
        fonts: sourceFolder + '/fonts/**/*.*'
    },
    clean: './'+resultFolder
};

/* конфигурация вебсервера */
var config = {
    server: {
        baseDir: "./" + resultFolder
    },
    tunnel: projectname || true,//Demonstration page: http://projectname.localtunnel.me
    host: 'localhost',
    port: 9000,
    logPrefix: "Frontend_Assembly"
};

/* запуск вебсервера */
gulp.task('webserver', function () {
    browserSync(config);
});

/* удаление папки назначения */
gulp.task('clean', function (cb) {
    rimraf(path.clean, cb);
});

/* сборка html */
gulp.task('html:build', function () {
    gulp.src(path.src.html) 
        .pipe(rigger())
        .pipe(gulp.dest(path.build.html))
        .pipe(reload({stream: true}));
});

/* сборка js */
gulp.task('js:build', function () {
    gulp.src(path.src.js) 
        .pipe(rigger()) 
        .pipe(sourcemaps.init()) 
        .pipe(uglify()) 
        .pipe(sourcemaps.write()) 
        .pipe(gulp.dest(path.build.js))
        .pipe(reload({stream: true}));
});

/* сборка sass */
gulp.task('sass:build', function () {
    gulp.src(path.src.sass) 
        .pipe(sourcemaps.init())
        .pipe(sass({
            includePaths: [sourceFolder + '/style/'],
            outputStyle: 'compressed',
            sourceMap: true,
            errLogToConsole: true
        }))
        .pipe(prefixer())
        .pipe(cssmin())
        .pipe(sourcemaps.write())
        .pipe(gulp.dest(path.build.css))
        .pipe(reload({stream: true}));
});

/* сборка less */
gulp.task('less:build', function () {
    gulp.src(path.src.less)
//        .pipe(sourcemaps.init())
        .pipe(less({
            includePaths: [sourceFolder + '/style/less/'],
            outputStyle: 'compressed',
//            sourceMap: true,
            errLogToConsole: true
        }))
        .pipe(prefixer())
//        .pipe(cssmin())
//        .pipe(sourcemaps.write())
        .pipe(gulp.dest(path.build.css))
        .pipe(reload({stream: true}));
//        .pipe(gulp.dest('./public/css'));
});

/* оптимизация графики */
gulp.task('image:build', function () {
    gulp.src(path.src.img) 
        .pipe(imagemin({
            progressive: true,
            svgoPlugins: [{removeViewBox: false}],
            use: [pngquant()],
            interlaced: true
        }))
        .pipe(gulp.dest(path.build.img))
        .pipe(reload({stream: true}));
});

/* сборка шрифтов */
gulp.task('fonts:build', function() {
    gulp.src(path.src.fonts)
        .pipe(gulp.dest(path.build.fonts))
});

/* сборка html, стилей, js, шрифтов, оптимизация графики */
gulp.task('build', [
    'html:build',
    'js:build',
    sassOrLess,
    'fonts:build',
    'image:build'
]);

/* следить за изменением файлов */
gulp.task('watch', function(){
    watch([path.watch.html], function(event, cb) {
        gulp.start('html:build');
    });
    watch([path.watch.style], function(event, cb) {
        gulp.start(sassOrLess);
    });
    watch([path.watch.js], function(event, cb) {
        gulp.start('js:build');
    });
    watch([path.watch.img], function(event, cb) {
        gulp.start('image:build');
    });
    watch([path.watch.fonts], function(event, cb) {
        gulp.start('fonts:build');
    });
});

/* ftp загрузка на сервер */
gulp.task('deploy', function() {

	var conn = ftp.create({
		host:      hostname,
		user:      username,
		password:  userpassword,
		parallel:  10
//		log: gutil.log
	});

	var globs = [
	resultFolder + '/**',
	resultFolder + '/.htaccess',
	];
	return gulp.src(globs, {buffer: false})
	.pipe(conn.newer(webpath))
	.pipe(conn.dest(webpath));

});

/* сборка по дефолту */
gulp.task('default', ['build', 'webserver', 'watch']);