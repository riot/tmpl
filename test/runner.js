var isNode = typeof window === 'undefined'

describe('Observable Tests', function() {
  if (isNode) {
    require('./specs/core.specs.js')
    require('./specs/brackets.specs.js')
    require('./specs/regex.specs.js')
  } else {
    mocha.run()
  }
})
