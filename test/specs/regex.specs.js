if (typeof tmpl === 'undefined') {
  var
    expect = require('expect.js'),
    regEx = require('tmpl').regEx
}

describe('regEx', function () {

  it('literal strings with escaped quotes inside (double quotes)', function () {
    var match = ' """\\"" "x" "a\\" "'.match(regEx.STRINGS)   // STRINGS has global flag

    expect(match).to.have.length(4)
    expect(match[0]).to.be('""')
    expect(match[1]).to.be('"\\""')
    expect(match[2]).to.be('"x"')
    expect(match[3]).to.be('"a\\" "')
  })

  it('literal strings with escaped quotes inside (single quotes)', function () {
    var match = " '''\\'' 'x' 'a\\' '".match(regEx.STRINGS)   // STRINGS has global flag

    expect(match).to.have.length(4)
    expect(match[0]).to.be("''")
    expect(match[1]).to.be("'\\''")
    expect(match[2]).to.be("'x'")
    expect(match[3]).to.be("'a\\' '")
  })

  it('multiline javascript comments in almost all forms', function () {
    var match = ' /* a *//**/ /*/**/ /*//\n*/ /\\*/**/'.match(regEx.MLCOMMS)

    expect(match).to.have.length(5)
    expect(match[0]).to.be('/* a */')
    expect(match[1]).to.be('/**/')
    expect(match[2]).to.be('/*/**/')
    expect(match[3]).to.be('/*//\n*/')
    expect(match[4]).to.be('/**/')
  })

  it('no problema with mixed quoted strings and comments', function () {
    var
      re = regEx(regEx.S_QBSRC + '|' + regEx.MLCOMMS.source, 'g'),
      match = ' /* a */"" /*""*/ "/*\\"*/" \\\'/*2*/\\\'\'\''.match(re)

    expect(match).to.have.length(5)
    expect(match[0]).to.be('/* a */')
    expect(match[1]).to.be('""')
    expect(match[2]).to.be('/*""*/')
    expect(match[3]).to.be('"/*\\"*/"')
    expect(match[4]).to.be("'/*2*/\\\''")   // yes, the match is correct :)
  })

})
