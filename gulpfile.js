'use strict';
//gulp info - показать подсказку по доступным задачам
/* НАСТРОЙКИ */
/* настройки ftp */
var hostname = 'default',         //домен проекта, например example.com
    username = 'default',         //логин, например admin
    userpassword = 'default',     //пароль, например password
    webpath = 'public_html';      //удалённая папка, например public_html

var sourceFolder = 'source',                   //папка с исходниками
    tempFolder = 'temp-'+sourceFolder,         //промежуточная папка
    resultFolder = 'dest',                     //папка назначения
    useSass = false,                           //выбрать Sass или Less
    useLess = true;
var projectname = '' || sourceFolder; //имя проекта (мин. 4 символа) для тунеля,который будет выглядить так - http://projectmane.localtunnel.me
/* КОНЕЦ НАСТРОЕК */



/* для обработки выбора между sass и less */
var sassOrLess,
    prepro,
    watchStyle;
if (useSass) {
    watchStyle = sourceFolder + '/style/**/*.scss';
    sassOrLess = 'sass:build';
    prepro = 'Sass';
}
else if (useLess) {
    watchStyle = sourceFolder + '/style/**/*.less';
    sassOrLess = 'less:build';
    prepro = 'Less';
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
    csscomb = require('gulp-csscomb'),
    imagemin = require('gulp-imagemin'),
    pngquant = require('imagemin-pngquant'),
    rimraf = require('rimraf'),
    ftp = require('vinyl-ftp'),
    browserSync = require("browser-sync"),
    less = require('gulp-less'),
    zip = require('gulp-zip'),
    size = require('gulp-filesize'),
    pug = require('gulp-pug'),
    htmlhint = require("gulp-htmlhint"),
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
        .pipe(htmlhint())
        .pipe(htmlhint.reporter())
        .pipe(size())
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
        .pipe(size())
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
        .pipe(size())
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
        .pipe(prefixer([
            'Android 2.3',
            'Android >= 4',
            'Chrome >= 20',
            'Firefox >= 24', // Firefox 24 is the latest ESR
            'Explorer >= 8',
            'iOS >= 6',
            'Opera >= 12',
            'Safari >= 6']))
//        .pipe(cssmin())
//        .pipe(sourcemaps.write())
        .pipe(csscomb())
        .pipe(gulp.dest(path.build.css))
        .pipe(size())
        .pipe(reload({stream: true}));
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
        .pipe(size())
        .pipe(reload({stream: true}));
});

/* сборка шрифтов */
gulp.task('fonts:build', function() {
    gulp.src(path.src.fonts)
        .pipe(gulp.dest(path.build.fonts))
        .pipe(size());
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

/* архивация исходников */
gulp.task('source:zip', function(){
    gulp.src(sourceFolder + '/**/*.*')
        .pipe(zip(sourceFolder + '.zip'))
        .pipe(gulp.dest('arhive_'+sourceFolder));
});

/* компиляция pug */
gulp.task('pug:build', function() {
    return gulp.src(sourceFolder + '/**/*.pug')
        .pipe(pug()) 
        .pipe(gulp.dest(resultFolder + '/'))
        .pipe(size());
});


/* сборка по дефолту */
gulp.task('default', ['build', 'webserver', 'watch']);

/* показать текущую конфигурацию */
gulp.task('config', function(){
    console.log('------------------------------------' );
    console.log('имя проекта               - ' + projectname);
    console.log('папка исходников          - ' + sourceFolder);
    console.log('папка назначения          - ' + resultFolder);
    console.log('используемый препроцесор  - ' + prepro);
    console.log('ftp хост                  - ' + hostname);
    console.log('ftp логин                 - ' + username);
    console.log('ftp пароль                - ' + userpassword);
    console.log('ftp удалённая директория  - ' + webpath);
//    console.log('  - ' + );
    console.log('------------------------------------' );
});

/* показать подсказку со списком доступных задач*/
gulp.task('info', function(){
    console.log('---------------------------------------------------------------------------------' );
    console.log('* gulp             - собрать всё, запустить вебсервер, следить за изменениями файлов');
    console.log('* gulp build        - собрать всё');
    console.log('* gulp clean        - удалить папку назначения');
    console.log('* gulp watch        - следить за изменениями файлов');
    console.log('* gulp webserver    - запустить вебсервер');
    console.log('* gulp deploy       - загрузить собраный проект по ftp');
    console.log('* gulp source:zip   - архивировать исходники');
    console.log('* gulp pug:build    - компилировать pug');
    console.log('* gulp config       - показать текущую конфигурацию');
    console.log('* gulp html:build | sass:build | less:build | js:build | fonts:build | image:build');
    console.log('---------------------------------------------------------------------------------' );
});