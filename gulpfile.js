'use strict';
//внести свои настройки
//добавить имя(строку, например 'projectname') проекта для тунеля,
//который будет выглядить так - http://projectmane.localtunnel.me
var projectname = '';

//настройки ftp
var hostname = 'example.com',//домен проекта, например example.com
    username = 'login',//логин, например admin
    userpassword = 'password',//пароль, например password
    webpath = 'public_html';//удалённая папка, например public_html

var sourceFolder = 'src',//указать папку с исходниками
    resultFolder = 'dest';//папка с результатом (будет создана)

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
    reload = browserSync.reload;

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
        style: sourceFolder + '/style/main.scss',
        img: sourceFolder + '/img/**/*.*',
        fonts: sourceFolder + '/fonts/**/*.*'
    },
    watch: {
        html: sourceFolder + '/**/*.html',
        js: sourceFolder + '/js/**/*.js',
        style: sourceFolder + '/style/**/*.scss',
        img: sourceFolder + '/img/**/*.*',
        fonts: sourceFolder + '/fonts/**/*.*'
    },
    clean: './'+resultFolder
};

var config = {
    server: {
        baseDir: "./" + resultFolder
    },
    tunnel: projectname || true,//Demonstration page: http://projectmane.localtunnel.me
    host: 'localhost',
    port: 9000,
    logPrefix: "Frontend_Assembly"
};

gulp.task('webserver', function () {
    browserSync(config);
});

gulp.task('clean', function (cb) {
    rimraf(path.clean, cb);
});

gulp.task('html:build', function () {
    gulp.src(path.src.html) 
        .pipe(rigger())
        .pipe(gulp.dest(path.build.html))
        .pipe(reload({stream: true}));
});

gulp.task('js:build', function () {
    gulp.src(path.src.js) 
        .pipe(rigger()) 
        .pipe(sourcemaps.init()) 
        .pipe(uglify()) 
        .pipe(sourcemaps.write()) 
        .pipe(gulp.dest(path.build.js))
        .pipe(reload({stream: true}));
});

gulp.task('style:build', function () {
    gulp.src(path.src.style) 
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

gulp.task('fonts:build', function() {
    gulp.src(path.src.fonts)
        .pipe(gulp.dest(path.build.fonts))
});

gulp.task('build', [
    'html:build',
    'js:build',
    'style:build',
    'fonts:build',
    'image:build'
]);


gulp.task('watch', function(){
    watch([path.watch.html], function(event, cb) {
        gulp.start('html:build');
    });
    watch([path.watch.style], function(event, cb) {
        gulp.start('style:build');
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


//ftp загрузка на сервер
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


gulp.task('default', ['build', 'webserver', 'watch']);