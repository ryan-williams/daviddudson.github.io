const gulp = require('gulp');
const csso = require('gulp-csso');
const uglify = require('gulp-uglify');
const concat = require('gulp-concat');
const sass = require('gulp-sass');
const plumber = require('gulp-plumber');
const cp = require('child_process');
const imagemin = require('gulp-imagemin');
const browserSync = require('browser-sync');
const del = require('del');
const html2pdf = require('gulp-html2pdf');
const rename = require('gulp-rename');
const sanitize = require('sanitize-filename');
const babel = require('gulp-babel');

const jekyllCommand = (/^win/.test(process.platform)) ? 'jekyll.bat' : 'jekyll';

// Don't even bother logging, its not worth the effort with pdf gen.
const swallowError = function(err) {
	this.emit('end');
};

/*
 * Build the Jekyll Site
 * runs a child process in node that runs the jekyll commands
 */
gulp.task('jekyll-build', function (done) {
	return cp.spawn(jekyllCommand, ['build', 'pdf'], {stdio: 'inherit'})
		.on('close', done);
});

/*
 * Generate pdf of index page
 */
gulp.task('pdf', function (cb) {
	gulp.src('_site/index.html')
		.pipe(plumber())
        .pipe(html2pdf())
        .on('error', swallowError)
		.pipe(rename(sanitize('DavidDudsonCV.pdf')))
		.pipe(gulp.dest('assets/pdf/'));
	cb()
});

/*
 * Rebuild Jekyll & reload browserSync
 */
gulp.task('jekyll-rebuild', gulp.series('jekyll-build', function () {
	browserSync.reload();
}));


/*
 * Build the jekyll site and launch browser-sync
 */
gulp.task('browser-sync', gulp.series('jekyll-build', function() {
	browserSync({
		server: {
			baseDir: '_site'
		}
	});
}));

/*
* Compile and minify sass
*/
gulp.task('sass', function(cb) {
  gulp.src('src/styles/**/*.scss')
    .pipe(plumber())
    .pipe(sass())
    .pipe(csso())
    .pipe(gulp.dest('assets/css'));
  cb()
});

/*
 * Minify images
 */
gulp.task('imagemin', function() {
	gulp.src('src/img/**/*.{jpg,png,gif}')
		.pipe(plumber())
		.pipe(imagemin({ optimizationLevel: 3, progressive: true, interlaced: true }))
		.pipe(gulp.dest('assets/img/'));
});

/**
 * Compile and minify js
 */
gulp.task('js', function(cb) {
	gulp.src('src/js/**/*.js')
		.pipe(plumber())
        .pipe(babel({ presets: ['env'] }))
		.pipe(concat('main.js'))
		.pipe(uglify())
		.pipe(gulp.dest('assets/js/'));
	cb()
});

gulp.task('watch', function(cb) {
  gulp.watch('src/styles/**/*.scss', gulp.series('sass', 'reload'));
  gulp.watch('src/js/**/*.js', gulp.series('js'));
  gulp.watch('src/img/**/*.{jpg,png,gif}', gulp.series('imagemin'));
  gulp.watch(['*html', '_includes/*html', '_layouts/*.html'], gulp.series('jekyll-rebuild'));
  gulp.watch(['_data/*.yml', '_includes/*.yml', '_config.yml'], gulp.series('jekyll-rebuild'));
  cb()
});

gulp.task('cpToSrc', function(cb) {
    gulp.src('_site/**/*', {base: './_site'})
        .pipe(gulp.dest('./'));
    cb()
});

gulp.task('reload', gulp.series(gulp.parallel('js', 'pdf'), 'jekyll-rebuild'));

gulp.task('build', gulp.series(gulp.parallel('js', 'sass'), 'jekyll-build'));

gulp.task('default', gulp.series('build', 'browser-sync', 'watch'));

gulp.task('clean', function (cb) {
    del([
        'src/**/*',
        'assets/**/*',
        '_data/**/*',
        '_includes/**/*',
        '_layouts/**/*',
        'gulpfile.js',
        'index.html',
        '.DS_Store',
        '.travis.yml',
        'package.json'
    ]);
    cb()
});

const deploy = gulp.series('build', 'clean', 'cpToSrc');

gulp.task('deploy', deploy);
