var msg = ''

try {
  require.resolve('./runner.js')
  msg = [
    '  Please use `make test` to run the tests.',
    '  See the Makefile.'
  ]
}
catch (e) {
  msg = [
    '  This is a runtime version, please clone the repository to run tests.',
    '',
    '    git clone http://github.com/riot/tmpl.git tmpl',
    '    cd tmpl && npm install',
    '    make test',
    '    make test-mocha'
  ]
}

console.log(msg.join('\n'))
