describe('Tmpl Tests', function () {

  var tmplPath = process.env.CSP_TEST_FLAG ? '../dist/csp.tmpl' : '../dist/tmpl'
  expect   = require('expect.js')
  tmpl     = require(tmplPath).tmpl
  brackets = require(tmplPath).brackets

  require('./specs/core.specs.js')
  require('./specs/brackets.specs.js')
})
