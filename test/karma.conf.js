module.exports = function(config) {

  config.set({
    basePath: '',
    autoWatch: true,
    frameworks: ['mocha'],
    plugins: [
      'karma-mocha',
      'karma-coverage',
      'karma-phantomjs-launcher'
    ],
    files: [
      '../node_modules/mocha/mocha.js',
      '../node_modules/expect.js/index.js',
      '../lib/index.js',
      'specs/core.specs.js'
    ],

    browsers: ['PhantomJS'],

    reporters: ['progress', 'saucelabs', 'coverage'],
    preprocessors: {
      '../lib/index.js': ['coverage']
    },

    coverageReporter: {
      dir: '../coverage/',
      reporters: [{
        type: 'lcov',
        subdir: 'report-lcov'
      }]
    },

    singleRun: true
  })
}
