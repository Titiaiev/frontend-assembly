'use strict';
//gulp info - показать подсказку по доступным задачам
/* НАСТРОЙКИ */
/* настройки ftp */
var hostname = 'default',         //домен проекта, например example.com
    username = 'default',         //логин, например admin
    userpassword = 'default',     //пароль, например password
    webpath = 'public_html';      //удалённая папка, например public_html

var sourceFolder = 'source',                   //папка с исходниками
    tempFolder = 'temp_'+sourceFolder,         //промежуточная папка
    resultFolder = 'dest_'+sourceFolder,       //папка назначения
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
    sourcemaps = require('gulp-sourcemaps'),
    rigger = require('gulp-rigger'),
    htmlhint = require("gulp-htmlhint"),
    sass = require('gulp-sass'),
    less = require('gulp-less'),
    cssmin = require('gulp-minify-css'),
    csscomb = require('gulp-csscomb'),
    prefixer = require('gulp-autoprefixer'),
    uglify = require('gulp-uglify'),
    imagemin = require('gulp-imagemin'),
    pngquant = require('imagemin-pngquant'),
    ftp = require('vinyl-ftp'),
    zip = require('gulp-zip'),
    size = require('gulp-filesize'),
    cache = require('gulp-cache'),
    del = require('del'),
    runSequence = require('run-sequence'),
    newer = require('gulp-newer'),
    browserSync = require("browser-sync"),
    reload = browserSync.reload;

/* объект с путями*/
var path = {
    build: {
        html: tempFolder + '/',
        js: tempFolder + '/js/',
        css:tempFolder + '/css/',
        img: tempFolder + '/img/',
        fonts: tempFolder + '/fonts/'
    },
    finish: {
        html: resultFolder + '/',
        js: resultFolder + '/js/',
        css:resultFolder + '/css/',
        img: resultFolder + '/img/',
        fonts: resultFolder + '/fonts/'
    },
    src: {
        html: sourceFolder + '/*.html',
        js: sourceFolder + '/js/main.js',
        sass: sourceFolder + '/style/main.scss',
        less: sourceFolder + '/style/main.less',
        img: sourceFolder + '/img/**/*.+(png|jpg|jpeg|gif|svg)',
        fonts: sourceFolder + '/fonts/**/*.*'
    },
    watch: {
        html: sourceFolder + '/**/*.html',
        js: sourceFolder + '/js/**/*.js',
        style: watchStyle,
        img: sourceFolder + '/img/**/*.*',
        fonts: sourceFolder + '/fonts/**/*.*'
    },
    clean: {
        dest: './'+resultFolder,
        temp: './'+tempFolder
    }
};


/* запуск вебсервера */
gulp.task('webserver:local', function () {
    browserSync({
    server: {
        baseDir: "./" + tempFolder
    },
    tunnel: false,
    host: 'localhost',
    port: 9000,
    logPrefix: "Frontend_Assembly"
});
});

gulp.task('webserver:tunnel', function () {
    browserSync({
    server: {
        baseDir: "./" + resultFolder
    },
    tunnel: projectname || true,//Demonstration page: http://projectname.localtunnel.me
    host: 'localhost',
    port: 9000,
    logPrefix: "Frontend_Assembly"
});
});


/* удаление папок и чистка */
gulp.task('remove:temp', function (callback) {
    del(path.clean.temp);
    return cache.clearAll(callback(console.log('-- Удалена временная рабочая папка, без очистки кеша!')));
});
gulp.task('remove:dest', function (callback) {
    del(path.clean.dest, callback(console.log('-- Удалена финальная папка проекта, кеш очищен!')));
});
gulp.task('remove:all', function (callback) {
    del(['dest_*','temp_*', 'arhive_*'], callback(console.log('-- Удалены все временные папки и папки дестрибутивов!')));
});
gulp.task('clean:temp', function(callback){
    del([tempFolder+'/**/*', '!'+tempFolder+'/img', '!'+tempFolder+'/img/**/*'], callback(console.log('-- Временная папка отчищена от файлов и папок, !!!кроме изображений!!!')));
});

    
/* сборка html */
gulp.task('html:build', function () {
    gulp.src(path.src.html)
        .pipe(newer(path.build.html))
        .pipe(rigger())
        .pipe(gulp.dest(path.build.html))
        .pipe(htmlhint())
        .pipe(htmlhint.reporter())
        .pipe(gulp.dest(path.finish.html))
        .pipe(size())
        .pipe(reload({stream: true}));
});

/* сборка js */
gulp.task('js:build', function () {
    gulp.src(path.src.js)
        .pipe(newer(path.build.js))
        .pipe(rigger()) 
        .pipe(gulp.dest(path.build.js))
        .pipe(size())
        .pipe(sourcemaps.init()) 
        .pipe(uglify()) 
        .pipe(sourcemaps.write()) 
        .pipe(gulp.dest(path.finish.js))
        .pipe(size())
        .pipe(reload({stream: true}));
});

/* сборка sass */
gulp.task('sass:build', function () {
    gulp.src(path.src.sass)
        .pipe(newer(path.build.css))
        .pipe(sass({
            includePaths: [sourceFolder + '/style/'],
            outputStyle: 'compressed',
            sourceMap: true,
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
        .pipe(csscomb())
        .pipe(gulp.dest(path.build.css))
        .pipe(size())
        .pipe(sourcemaps.init())
        .pipe(cssmin())
        .pipe(sourcemaps.write())
        .pipe(gulp.dest(path.finish.css))
        .pipe(size())
        .pipe(reload({stream: true}));
});

/* сборка less */
gulp.task('less:build', function () {
    gulp.src(path.src.less)
        .pipe(newer(path.build.css))
        .pipe(less({
            includePaths: [sourceFolder + '/style/less/'],
            outputStyle: 'compressed',
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
        .pipe(csscomb())
        .pipe(gulp.dest(path.build.css))
        .pipe(size())
        .pipe(sourcemaps.init())
        .pipe(cssmin())
        .pipe(sourcemaps.write())
        .pipe(gulp.dest(path.finish.css))
        .pipe(size())
        .pipe(reload({stream: true}));
});

/* оптимизация графики */
gulp.task('image:build', function () {
    gulp.src(path.src.img)
        .pipe(newer(path.build.img))
        .pipe(cache(imagemin({
            progressive: true,
            svgoPlugins: [{removeViewBox: false}],
            use: [pngquant()],
            interlaced: true
        })))
        .pipe(gulp.dest(path.build.img))
        .pipe(gulp.dest(path.finish.img))
        .pipe(size())
        .pipe(reload({stream: true}));
});

/* сборка шрифтов */
gulp.task('fonts:build', function() {
    gulp.src(path.src.fonts)
        .pipe(newer(path.build.fonts))
        .pipe(gulp.dest(path.build.fonts))
        .pipe(gulp.dest(path.finish.fonts))
        .pipe(size());
});


/* следить за изменением файлов */
gulp.task('watch', function(){
    gulp.watch(path.watch.html, ['html:build']);
    gulp.watch(path.watch.style, [sassOrLess]);
    gulp.watch(path.watch.js, ['js:build']);
    gulp.watch(path.watch.img, ['image:build']);
    gulp.watch(path.watch.fonts, ['fonts:build']);
});


/* сборка html, стилей, js, шрифтов, оптимизация графики */
gulp.task('build', [
    'html:build',
    'js:build',
    sassOrLess,
    'fonts:build',
    'image:build'
]);
/* сборка для работы */
gulp.task('dev', function () {
  runSequence('build','watch','webserver:local')
});
/**/
gulp.task('present', function () {
  runSequence('build','watch','webserver:tunnel')
});
/* сборка по дефолту */
gulp.task('default', ['info']);


/* ftp загрузка на сервер */
gulp.task('deploy:final', function() {
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
        .pipe(zip('dev_' + sourceFolder + '.zip'))
        .pipe(gulp.dest('arhive_'+sourceFolder))
    gulp.src(tempFolder + '/**/*.*')
        .pipe(zip(tempFolder + '.zip'))
        .pipe(gulp.dest('arhive_'+sourceFolder));
});


/* показать текущую конфигурацию */
gulp.task('config', function(){
    console.log('------------------------------------------------' );
    console.log('имя проекта               - ' + projectname);
    console.log('папка исходников          - ' + sourceFolder);
    console.log('временная папка           - ' + tempFolder);
    console.log('финальная папка           - ' + resultFolder);
    console.log('используемый препроцесор  - ' + prepro);
    console.log('ftp хост                  - ' + hostname);
    console.log('ftp логин                 - ' + username);
    console.log('ftp пароль                - ' + userpassword);
    console.log('ftp удалённая директория  - ' + webpath);
//    console.log('  - ' + );
    console.log('------------------------------------------------' );
/* непонятно правильней ли так будет, быстрее ли? замеры не ответили на эти вопросы */
//gulp.task('config', function(){
//    console.log('------------------------------------' );
//    console.log('имя проекта               - ' + projectname +'\n'+
//    'папка исходников          - ' + sourceFolder +'\n'+
//    'папка назначения          - ' + resultFolder +'\n'+
//    'используемый препроцесор  - ' + prepro +'\n'+
//    'ftp хост                  - ' + hostname +'\n'+
//    'ftp логин                 - ' + username +'\n'+
//    'ftp пароль                - ' + userpassword +'\n'+
//    'ftp удалённая директория  - ' + webpath);
////    console.log('  - ' + );
//    console.log('------------------------------------' );
});
/* показать подсказку со списком доступных задач*/
gulp.task('info', function(){
    console.log('---------------------------------------------------------------------------------' );
    console.log('* gulp                  - показать эту подсказку с именами тасков');
    console.log('* gulp dev              - сборка для работы, запуск локального сервера');
    console.log('* gulp present          - сборка для презентации, запуск сервера с тунелем');
    console.log('* gulp info             - показать эту подсказку с именами тасков');
    console.log('* gulp config           - показать текущую конфигурацию');
    console.log('* gulp build            - собрать всё');
    console.log('* gulp watch            - следить за изменениями файлов');
    console.log('* gulp webserver:local  - запустить вебсервер локально');
    console.log('* gulp webserver:tunnel - запустить вебсервер с тунелем');
    console.log('* gulp deploy:final     - загрузить собраный проект по ftp');
    console.log('* gulp source:zip       - архивировать исходники');
    console.log('* gulp remove:temp      - удалить текущую временную папку');
    console.log('* gulp remove:dest      - удалить текущую финальную папку');
    console.log('* gulp remove:all       - удалить все временные и финальные папки');
    console.log('* gulp clean:temp       - очистить временную папку от всего, кроме изображений');
    console.log('* gulp html:build | sass:build | less:build | js:build | fonts:build | image:build\n-- собрать что-то одно (html, sasss, less, js, fonts, images)');
    console.log('---------------------------------------------------------------------------------' );
})
