var isNode = typeof window === 'undefined'

describe('Observable Tests', function() {
  if (isNode) {
    expect = require('expect.js')
    tmpl = require('tmpl').tmpl
    brackets = require('tmpl').brackets
    require('./specs/core.specs.js')
    require('./specs/brackets.specs.js')
  } else {
    mocha.run()
  }
})
