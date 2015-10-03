/*
  brackets test suite
  -------------------
*/
// fake the riot object
riot = { settings: { 'fake': 'from test' } }
globalVar = 5
var
  _tmpl = require('../dist/tmpl'),
  tmpl = _tmpl.tmpl,
  brackets = _tmpl.brackets,
  data = {
    yes: true,
    no: false,
    str: 'x',
    obj: {val: 2},
    arr: [2],
    x: 2,
    $a: 0,
    $b: 1,
    esc: '\'\n\\',
    fn: function(s) { return ['hi', s].join(' ') }
  }

// send 1 or 2 in 'err' to enable internal information
function render(str) {
  var expr = tmpl.compile(str, 1)
  data._debug_ = riot.settings.outputErrors = 1
  return tmpl(expr, data)
}

function setBrackets(s) { brackets.set(s) }
function resetBrackets() { brackets.set() }

describe('Throws?', function () {

  it('with custom brackets to "( )" (another bad idea)', function () {
    setBrackets('( )')
    expect(render('(str.charAt(0))')).toBe('x')
    expect(render('((1 + 1))')).toBe(2)
    expect(render('a,(("b"),("c")),d')).toBe('a,c,d')
  })

})
