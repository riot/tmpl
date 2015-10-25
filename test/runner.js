var isNode = typeof window === 'undefined'

describe('Observable Tests', function() {
  if (isNode) {
    expect = require('expect.js')
    tmpl = require('../dist/tmpl').tmpl
    brackets = require('../dist/tmpl').brackets
    require('./specs/core.specs.js')
    require('./specs/brackets.specs.js')
  }
})
