var isNode = typeof window === 'undefined'

describe('Tmpl Tests', function () {
  if (isNode) {
    var _ =  require('../dist/tmpl')
    expect = require('expect.js')
    tmpl = _.tmpl
    brackets = _.brackets
    require('./specs/core.specs.js')
    require('./specs/brackets.specs.js')
  }
})
