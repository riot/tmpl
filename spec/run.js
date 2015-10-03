var
  jasmine = new (require('jasmine'))(),
  SpecReporter = require('jasmine-spec-reporter'),
  path = require('path')

jasmine.configureDefaultReporter({print: function () {}})
jasmine.loadConfigFile(path.join(__dirname, 'support', 'jasmine.json'))
jasmine.addReporter(new SpecReporter())
jasmine.execute(process.argv.slice(2))
