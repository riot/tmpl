var isNode = typeof window === 'undefined'

describe('Observable Tests', function() {
  if (isNode) {
    require('./specs/core.specs.js')
  } else {
    mocha.run()
  }
})
