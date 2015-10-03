if (typeof tmpl === 'undefined') {
  var
    expect = require('expect.js'),
    tmpl = require('tmpl'),
    brackets = tmpl.brackets,
    regEx = tmpl.regEx
  tmpl = tmpl.tmpl
}

globalVar = 5

var data = {}     // generated code run in this context

function generateData() {
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
    fn: function(s) { return ['hi', s].join(' ') },
    _debug_: 0
  }
  return data
}

// send 1 or 2 in 'err' to enable internal information
function render(str, dbg) {
  var expr = dbg ? tmpl.compile(str, 1) : tmpl.compile(str)

  if (dbg) {
    var cache = tmpl.cache(expr)
    data._debug_ = 1
    console.log('--- Expressions in `' + expr + '`')
    for (var i = 0; i < cache.length; ++i) {
      console.log('[' + i + '] ' + cache[i])
    }
  }
  return tmpl(expr, data)
}

function setBrackets(s) {
  brackets.set(s)
}

function resetBrackets() {
  brackets.set()
}

describe('riot-tmpl', function() {

  generateData()

  describe('compiles specs', function() {

    this.timeout(5000)

    //// return values

    it('expressions always return a raw value', function () {
      expect(render('{ 1 }')).to.equal(1)
      expect(render('{ x }')).to.equal(2)
      expect(render('{ str }')).to.equal(data.str)
      expect(render('{ obj }')).to.equal(data.obj)
      expect(render('{ arr }')).to.equal(data.arr)
      expect(render('{ fn }')).to.equal(data.fn)
      expect(render('{ null }')).to.equal(null)
      expect(render('{ no }')).to.equal(false)
      expect(render('{ yes }')).to.equal(true)
    })

    it('templates always return a string value', function () {
      expect(render('{ 1 } ')).to.equal('1 ')
      expect(render('{ obj } ')).to.equal('[object Object] ')
    })

    //// empty arguments

    it('empty expressions equal to undefined', function () {
      expect(render()).to.be(undefined)
      expect(render('{}')).to.be(undefined)
      expect(render('{ }')).to.be(undefined)
    })

    it('empty templates equal to empty string', function () {
      expect(render('')).to.equal('')
      expect(render('{ } ')).to.equal(' ')
    })

    //// undefined values

    it('undefined vars are catched in expressions and returns undefined', function () {
      expect(render('{ nonExistingVar }')).to.be(undefined)
      expect(render('{ !nonExistingVar }')).to.equal(true)
      expect(render('{ nonExistingVar ? "yes" : "no" }')).to.equal('no')
      expect(render('{ !nonExistingVar ? "yes" : "no" }')).to.equal('yes')
    })

    it('in templates, false and undefined values result in empty string', function () {
      expect(render(' { nonExistingVar }')).to.equal(' ')
      expect(render(' { no }')).to.equal(' ')
    })

    //// expressions

    it('expressions are just regular JavaScript', function () {
      expect(render('{ obj.val }')).to.be(2)
      expect(render('{ obj["val"] }')).to.be(2)
      expect(render('{ arr[0] }')).to.be(2)
      expect(render('{ arr[0]; }')).to.be(2)
      expect(render('{ arr.pop() }')).to.be(2)
      expect(render('{ fn(str) }')).to.be('hi x')
      expect(render('{ yes && "ok" }')).to.be('ok')
      expect(render('{ no && "ok" }')).to.be(false)
      expect(render('{ false || null || !no && yes }')).to.be(true)
      expect(render('{ !no ? "yes" : "no" }')).to.be('yes')
      expect(render('{ !yes ? "yes" : "no" }')).to.be('no')
      expect(render('{ /^14/.test(+new Date()) }')).to.be(true)
      expect(render('{ typeof Math.random() }')).to.be('number')
      expect(render('{ fn("there") }')).to.be('hi there')
      expect(render('{ str == "x" }')).to.be(true)
      expect(render('{ /x/.test(str) }')).to.be(true)
      expect(render('{ true ? "a b c" : "foo" }')).to.be('a b c')
      expect(render('{ true ? "a \\"b\\" c" : "foo" }')).to.be('a "b" c')
      expect(render('{ str + " y" + \' z\'}')).to.be('x y z')
      expect(render('{ esc }')).to.be(data.esc)
      expect(render('{ $a }')).to.be(0)
      expect(render('{ $a + $b }')).to.be(1)
      expect(render('{ this.str }')).to.be('x')
    })

    it('global variables are supported in expressions', function () {
      expect(render('{ globalVar }')).to.be(globalVar)
    })

    it('all comments in expressions are stripped from the output (not anymore)', function () {
      expect(render('{ /* comment */ /* as*/ }')).to.be(undefined)
      expect(render(' { /* comment */ }')).to.equal(' ')
      expect(render('{ 1 /* comment */ + 1 }')).to.equal(2)
      expect(render('{ 1 /* comment */ + 1 } ')).to.equal('2 ')
    })

    //// templates

    it('all expressions are evaluted in template', function () {
      expect(render('{ 1 }{ 1 }')).to.equal('11')
      expect(render('{ 1 }{ 1 } ')).to.equal('11 ')
      expect(render(' { 1 }{ 1 }')).to.equal(' 11')
      expect(render('{ 1 } { 1 }')).to.equal('1 1')
    })

    it('both templates and expressions are new-line-friendly', function () {
      expect(render('\n  { yes \n ? 2 \n : 4} \n')).to.equal('\n  2 \n')
    })

    //// class shorthands

    describe('class shorthands', function () {

      it('names can be single-quoted, double-quoted, unquoted', function () {
        expect(render('{ ok : yes }')).to.equal('ok')
        expect(render('{ "a" : yes, \'b\': yes, c: yes }')).to.equal('a b c')
        expect(render('{ a_b-c3: yes }')).to.equal('a_b-c3')
      })

      it('even dashed names can be unquoted', function () {
        expect(render('{ my-class: yes }')).to.equal('my-class')
      })

      it('set two classes with one expression', function () {
        expect(render('{ "a b": yes }')).to.equal('a b')
      })

      it('errors in expressions are catched silently', function () {
        expect(render('{ loading: !nonExistingVar.length }')).to.equal('')
      })

      it('expressions are just regular JavaScript', function () {
        expect(render('{ a: !no, b: yes }')).to.equal('a b')
        expect(render('{ y: false || null || !no && yes }')).to.equal('y')
        expect(render('{ y: 4 > 2 }')).to.equal('y')
        expect(render('{ y: fn() }')).to.equal('y')
        expect(render('{ y: str == "x" }')).to.equal('y')
        expect(render('{ y: new Date() }')).to.equal('y')
      })

      it('even function calls, objects and arrays are no problem', function () {
        expect(render('{ ok: fn(1, 2) }')).to.equal('ok')
        expect(render('{ ok: fn([1, 2]) }')).to.equal('ok')
        expect(render('{ ok: fn({a: 1, b: 1}) }')).to.equal('ok')
      })

    })

  })

  describe('2.3', function () {

    it('few errors in recognizing complex expressions', function () {
      data.$a = 0
      data.$b = 0
      data.parent = { selectedId: 0 }
      // FIX #784 - The shorthand syntax for class names doesn't support parentheses
      expect(render('{ primary: (parent.selectedId === $a)  }')).to.be('primary')
      // a bit more of complexity. note: using the comma operator requires parentheses
      expect(render('{ ok: ($b++, ($a > 0) || ($b & 1)) }')).to.be('ok')
    })

    it('unwrapped keywords `void`, `window` and `global`, in addition to `this`', function () {
      data.$a = 5
      expect(render('{' + (typeof window === 'object' ? 'window' : 'global') +'.globalVar }')).to.be(5)
      expect(render('{ this.$a }')).to.be(5)
      expect(render('{ void 0 }')).to.be(undefined)
      // without unprefixed global/window, default convertion to `new (D).Date()` throws here
      data.Date = typeof window !== 'object' ? 'global' : 'window'
      expect(render('{ new ' + data.Date + '.Date() }')).to.be.a('object')
      delete data.Date
    })

    //// Better recognition of literal regexps inside template and expressions.
    it('better recognition of literal regexps', function () {
      expect(render('{ /{}\\/\\n/.source }')).to.be('{}\\/\\n')
      expect(render('{ ok: /{}\\/\\n/.test("{}\\/\\n") }')).to.be('ok')
      // in quoted text, openning riot bracket and backslashes need to be escaped!
      expect(render('str = "/\\{}\\/\\n/"')).to.be('str = "/{}\\/\\n/"')
      // handling quotes in regexp is not so complicated :)
      expect(render('{ /"\'/.source }')).to.be('"\'')
      expect(render('{ ok: /"\'/.test("\\\"\'") }')).to.be('ok')
      expect(render('rex = /\\\"\'/')).to.be('rex = /\\\"\'/')      // rex = /\"\'/
      expect(render('str = "/\\\"\'/"')).to.be('str = "/\\\"\'/"')  // str = "\"\'"
      // no confusion with operators
      data.x = 2
      expect(render('{ 10 /x+10/ 1 }')).to.be(15)
      expect(render('{ x /2+x/ 1 }')).to.be(3)
      expect(render('{ x /2+"abc".search(/c/) }')).to.be(3)
      // in expressions, there's no ASI
      expect(render('{ x\n /2+x/ 1 }')).to.be(3)

    })

    //// Better recognition of comments, including empty ones.
    //// (moved to 2.4, now tmpl does not support comments)

    it('you can include almost anything in quoted shorhand names', function () {
      expect(render('{ "_\u221A": 1 }')).to.be('_\u221A')
      expect(render('{ (this["\u221A"] = 1, this["\u221A"]) }')).to.be(1)
    })

    //// Mac/Win EOL's normalization avoids unexpected results with some editors.
    //// (moved to 2.4, now tmpl don't touch non-expression parts)

    it('whitespace is compacted to a space in expressions', function () {
      // you need see at generated code
      expect(render(' { yes ?\n\t2 : 4} ')).to.be(' 2 ')
      expect(render('{ \t \nyes !== no\r\n }')).to.be(true)
    })

    it('whitespace is compacted and trimmed in quoted shorthand names', function () {
      expect(render('{ " \ta\n \r \r\nb\n ": yes }')).to.be('a b')
    })

    it('whitespace is preserved in literal javascript strings', function () {
      expect(render('{ "\r\n \n \r" }')).to.be('\r\n \n \r')
      expect(render('{ ok: "\r\n".charCodeAt(0) === 13 }')).to.be('ok')
    })

    //// Extra tests

    it('correct handling of quotes', function () {
      expect(render("{filterState==''?'empty':'notempty'}")).to.be('notempty')
      expect(render('{ "House \\"Atrides\\" wins" }')).to.be('House "Atrides" wins')
      expect(render('{ "Leto\'s house" }')).to.be("Leto's house")
      expect(render(" In '{ \"Leto\\\\\\\'s house\" }' ")).to.be(" In 'Leto\\\'s house' ")  // « In '{ "Leto\\\'s house" }' » --> In 'Leto\'s house'
      expect(render(' In "{ "Leto\'s house" }" ')).to.be(' In "Leto\'s house" ')            // « In "{ "Leto's house" }"    » --> In "Leto's house"
      expect(render(' In "{ \'Leto\\\'s house\' }" ')).to.be(' In "Leto\'s house" ')        // « In "{ 'Leto\'s house' }"   » --> In "Leto's house"
    })

    //// Consistency?

    it('main inconsistence between expressions and class shorthands are gone', function () {
      expect(render('{ !nonExistingVar.foo ? "ok" : "" }')).to.equal(undefined) // ok
      expect(render('{ !nonExistingVar.foo ? "ok" : "" } ')).to.equal(' ')      // ok
    //expect(render('{ ok: !nonExistingVar.foo }')).to.equal('ok')              // what?
      expect(render('{ ok: !nonExistingVar.foo }')).to.equal('')                // ok ;)
    })

  })


  describe('2.4', function() {

    it('support for 8 bit, ISO-8859-1 charset in shorthand names', function () {
      expect(render('{ neón: 1 }')).to.be('neón')
      expect(render('{ -ä: 1 }')).to.be('-ä')               // '-ä' is a valid class name
      expect(render('{ ä: 1 }')).to.be('ä')
    })

    it('automatic use de `global` instead `window` in non-browser environment', function () {
      expect(render('{ window.globalVar }')).to.be(5)       // w/o new feature, this fail in node
      data.Date = '{}'
      expect(render('{ +new window.Date() }')).to.be.a('number')
      delete data.Date
    })

    it('more unwrapped keywords: isFinite, isNaN, Date, RegExp and Math', function () {
      var i, a = ['isFinite', 'isNaN', 'Date', 'RegExp', 'Math']
      for (i = 0; i < a.length; ++i)
        data[a[i]] = 0

      expect(render('{ isFinite(1) }')).to.be(true)
      expect(render('{ isNaN({}) }')).to.be(true)
      expect(render('{ Date.parse }')).to.be.a('function')
      expect(render('{ RegExp.$1 }')).to.be.a('string')
      expect(render('{ Math.floor(0) }')).to.be.a('number')

      for (i = 0; i < a.length; ++i)
        delete data[a[i]]
    })

    //// now tmpl don't touch non-expression parts
    it('win and mac eols are NOT normalized in template text', function () {
      expect(render('\r\n \n \r \n\r')).to.be('\r\n \n \r \n\r')
      expect(render('\r\n { 0 } \r\n')).to.be('\r\n 0 \r\n')
      // ...even in their quoted parts
      expect(render('style="\rtop:0\r\n"')).to.be('style="\rtop:0\r\n"')
    })

    describe('support for comments has been dropped', function () {
      // comments within expresions are converted to spaces, in concordance with js specs
      it('if included, the expression may work, but...', function () {
        expect(render('{ typeof/**/str === "string" }')).to.be(true)
        expect(render('{ 1+/* */+2 }')).to.be(3)

        // comments in template text is preserved
        expect(render(' /*/* *\/ /**/ ')).to.be(' /*/* *\/ /**/ ')
        expect(render('/*/* "note" /**/')).to.be('/*/* "note" /**/')

        // riot parse correctamente empty and exotic comments
        expect(render('{ /**/ }')).to.be(undefined)               // empty comment
        expect(render('{ /*/* *\/ /**/ }')).to.be(undefined)      // nested comment sequences
        expect(render('{ /*dummy*/ }')).to.be(undefined)

        // there's no problem in shorthands
        expect(render('{ ok: 0+ /*{no: 1}*/ 1 }')).to.be('ok')

        // nor in the template text, comments inside strings are preserved
        expect(render('{ "/* ok */" }')).to.be('/* ok */')
        expect(render('{ "/*/* *\/ /**/" }')).to.be('/*/* *\/ /**/')
        expect(render('{ "/* \\"comment\\" */" }')).to.be('/* "comment" */')
      })

      it('something like `{ ok:1 /*,no:1*/ } give incorrect result ("no")', function () {
        expect(render('{ ok: 1 /*, no: 1*/ }')).to.be('no')
      })

      it('others can break your application, e.g. { ok/**/: 1 }', function () {
        expect(render).withArgs('{ ok/**/: 1 }').to.throwError()
      })
    })

    describe('catch errors in expressions with tmpl.errorHandler', function () {

      it('using a custom function', function () {
        var result, message = ''

        tmpl.errorHandler = function (s) { message = s }
        result = tmpl(tmpl.compile('{ undefined.var }'))  // pass no data
        tmpl.errorHandler = null

        expect(result).to.be(undefined)
        expect(message).to.match(/^riot: -no-data-:- : /)
      })

      it('parsing the message with a regex', function () {
        var result, parts = []

        tmpl.errorHandler = function (msg) {
          parts = msg.match(/^riot\: ([^:]+):(-|\d+)? : (.+)/)
        }
        data.root = {tagName: 'div'}
        data._riot_id = 1                           // eslint-disable-line camelcase
        result = render('{ undefined.var }')        // render as normal
        tmpl.errorHandler = null
        delete data.root
        delete data._riot_id

        expect(result).to.be(undefined)
        expect(parts.slice(1, 3)).to.eql(['div', 1])
      })

      it('do not duplicate the same precompiled expression (exact after trim)', function () {
        var pcex = []     // pass to compiler.html to get pcexpr list

        result = tmpl.compile('<p a={a<b} b={ a<b } >', {}, pcex)
        expect(pcex).to.have.length(1)
        // this is different
        pcex = []
        result = tmpl.compile('<p a={a <b} b={ a<b } >', {}, pcex)
        expect(pcex).to.have.length(2)
      })

    })

    describe('new helper functions in tmpl 2.4', function () {

      it('tmpl.hasExpr: test for precompiled expressions', function () {

        expect(tmpl.hasExpr('{#123#}')).to.be(true)
        expect(tmpl.hasExpr('{#123}')).to.be(false)
        expect(tmpl.hasExpr('{#-123#}')).to.be(false)
        expect(tmpl.hasExpr('{#123')).to.be(false)
        expect(tmpl.hasExpr('{##}')).to.be(false)
      })

      it('tmpl.loopKeys: extract keys from the value (for `each`)', function () {

        expect(tmpl.loopKeys('k,i,{#123#}')).to.eql({key: 'k', pos: 'i', val: '{#123#}'})
        expect(tmpl.loopKeys('k,,{#123#}')).to.eql({key: 'k', pos: '', val: '{#123#}'})
        expect(tmpl.loopKeys('{#123#}')).to.eql({val: '{#123#}'})
        expect(tmpl.loopKeys('#123').val).to.be('#123')    // val is expected
        expect(tmpl.loopKeys('{##}').val).to.be('{##}')
      })

    })

  })
  // end of tmpl 2.4

})


describe('brackets', function () {

  generateData()

  function bracketPair() {
    return brackets(8)
  }

  // reset brackets to defaults
  after(resetBrackets)
  beforeEach(resetBrackets)
  resetBrackets()

  it('default to { } if setting to undefined, null, or an empty string', function () {
    var ab = [null, '']
    for (var i = 0; i < 3; ++i) {
      setBrackets(ab[i])
      expect(bracketPair()).to.equal('{ }')
      expect(render('{ x }')).to.equal(2)
    }
  })

  //// custom brackets
  it('single and multi character custom brackets', function () {

    // single character brackets
    brackets.set('[ ]')
    expect(bracketPair()).to.equal('[ ]')
    expect(render('[ x ]')).to.equal(2)
    expect(render('[ str\\[0\\] ]')).to.equal('x')

    // multi character brackets
    setBrackets('{{ }}')
    expect(bracketPair()).to.equal('{{ }}')
    expect(render('{{ x }}')).to.equal(2)

    // asymmetric brackets
    setBrackets('${ }')
    expect(bracketPair()).to.equal('${ }')
    expect(render('${ x }')).to.equal(2)
  })

  describe('using brackets inside expressions', function () {

    it('brackets in expressions can always be escaped', function () {
      expect(render('{ "\\{ 1 \\}" }')).to.equal('{ 1 }')
      expect(render('\\{ 1 }')).to.equal('{ 1 }')
      expect(render('{ "\\}" }')).to.equal('}')
      expect(render('{ "\\{" }')).to.equal('{')
    })

    it('though escaping is optional', function () {
      expect(render('{ JSON.stringify({ x: 5 }) }')).to.equal('{"x":5}')
      expect(render('a{ "b{c}d" }e { "{f{f}}" } g')).to.equal('ab{c}de {f{f}} g')

      // for custom brackets as well
      setBrackets('[ ]')
      expect(render('a[ "b[c]d" ]e [ "[f[f]]" ] g')).to.equal('ab[c]de [f[f]] g')

      setBrackets('{{ }}')
      expect(render('a{{ "b{{c}}d" }}e {{ "{f{{f}}}" }} g')).to.equal('ab{{c}}de {f{{f}}} g')

      //setBrackets('<% %>')
      //expect(render('a<% "b<%c%>d" %>e <% "<%f<%f%>%>" %> g')).to.equal('ab<%c%>de <%f<%f%>%> g')

      setBrackets('[[ ]]')
      expect(render('a[[ "b[[c]]d" ]]e [["[[f[f]]]"]]g[[]]')).to.equal('ab[[c]]de [[f[f]]]g')
    })

  })

  describe('2.3', function () {

    //// Better recognition of nested brackets, escaping is almost unnecessary.
    //// (include escaped version for compatibility)

    describe('escaping is almost unnecessary', function () {

      // ...unless you're doing something very special?
      it('no problem with brackets inside strings', function () {
        //, e.g. { "{" } or { "}" }
        expect(render('a{ "b{" }c')).to.equal('ab{c')
        expect(render('a{ "b\\{" }c')).to.equal('ab{c')
        expect(render('a{ "{b" }c')).to.equal('a{bc')
        expect(render('a{ "\\{b" }c')).to.equal('a{bc')

        expect(render('a{ "b}" }c')).to.equal('ab}c')
        expect(render('a{ "b\\}" }c')).to.equal('ab}c')
        expect(render('a{ "}b" }c')).to.equal('a}bc')
        expect(render('a{ "\\}b" }c')).to.equal('a}bc')

        expect(render('{"{"}')).to.equal('{')
        expect(render('{"\\{"}')).to.equal('{')
        expect(render('{"}"}')).to.equal('}')
        expect(render('{"\\}"}')).to.equal('}')

        expect(render('{{a:"{}}"}}')).to.eql({ a: '{}}' })
        expect(render('{{a:"{\\}\\}"}}')).to.eql({ a: '{}}' })
      })

      it('with custom brackets to "[ ]" (bad idea)', function () {
        setBrackets('[ ]')
        expect(render('[ str[0] ]')).to.be('x')
        expect(render('[ [1].pop() ]')).to.be(1)
        expect(render('a,[["b", "c"]],d')).to.be('a,b,c,d')
      })

      it('with custom brackets to "( )" (another bad idea)', function () {
        setBrackets('( )')
        expect(render('(str.charAt(0))')).to.be('x')
        expect(render('((1 + 1))')).to.be(2)
        expect(render('a,(("b"),("c")),d')).to.be('a,c,d')
      })

      it('with multi character brackets {{ }}, e.g. on "{{{a:1}}}"', function () {
        setBrackets('{{ }}')
        // note: '{{{\\}}}' generate Parse error, this equals to '{{ {\\} }}'
        expect(render('{{{ a:1 }}}')).to.eql({ a: 1 })
        expect(render('{{{a: {}}}}')).to.eql({ a: {} })
        expect(render('{{{a: {\\}}}}')).to.eql({ a: {} })
        expect(render(' {{{}}}')).to.eql(' [object Object]')
      })

      it('with multi character brackets (( ))', function () {
        setBrackets('(( ))')
        expect(render('((({})))')).to.eql({})
        expect(render('(((("o"))))="o"')).to.be('o="o"')
        expect(render('((( ("o") )))="o"')).to.be('o="o"')
      })

      // - you're using asymmetric custom brackets, e.g.: ${ } instead of { }, [ ], {{ }}, <% %>
      it('with asymmetric brackets, e.g. ${ {a:1} } instead of ${ {a:1\\} }',
        function () {
          setBrackets('${ }')
          expect(render('${ {a:1} }')).to.eql({ a: 1 })
          expect(render('${ {a:1\\} }')).to.eql({ a: 1 })
        })

      it('silly brackets? good luck', function () {
        setBrackets('[ ]]')
        expect(render('a[ "[]]"]]b')).to.be('a[]]b')
        expect(render('[[[]]]]')).to.eql([[]])

        setBrackets('( ))')
        expect(render('a( "b))" ))c')).to.be('ab))c')
        expect(render('a( (("bc))")) ))')).to.be('abc))')
        expect(render('a( ("(((b))") ))c')).to.be('a(((b))c')
        expect(render('a( ("b" + (")c" ))))')).to.be('ab)c')    // test skipBracketedPart()
      })

      it('please find a case when escaping is still needed!', function () {
        //expect(render).withArgs('{ "}" }').to.throwError()
        expect(render('{ "}" }')).to.equal('}')
      })

    })
    // end of 2.3 scaping is almost...

    it('escaped brackets, some 8 bit, iso-8859-1 characters', function () {
      var vals = [
      // source    brackets(2) + brackets(3)
      //['<% %>',  '<% %>'    ],      // angle brackets unsupported from 2.4
        ['[! !]',  '\\[! !\\]'],
        ['·ʃ ʃ',   '·ʃ ʃ'     ],
        ['{$ $}',  '{\\$ \\$}'],
        ['_( )_',  '_\\( \\)_']
      ]
      var rs, bb, i

      rs = new RegExp('{x}')
      setBrackets('{ }')              // same as defaults
      expect(brackets(rs)).to.be(rs)      // must returns the same object (to.be)
      expect(brackets(0)).to.equal('{')
      expect(brackets(1)).to.equal('}')
      expect(brackets(2)).to.equal('{')
      expect(brackets(3)).to.equal('}')

      for (i = 0; i < vals.length; i++) {
        // set the new brackets pair
        rs = vals[i]
        setBrackets(rs[0])
        bb = rs[0].split(' ')
        rs = rs[1]
        expect(brackets(/{ }/g).source).to.equal(rs)
        expect(brackets(0)).to.equal(bb[0])
        expect(brackets(1)).to.equal(bb[1]); bb = rs.split(' ')
        expect(brackets(2)).to.equal(bb[0])
        expect(brackets(3)).to.equal(bb[1])
      }
    })

  })
  // end of brackets 2.3


  describe('2.4', function () {

    it('don\'t use characters in the set [\\x00-\\x1F<>a-zA-Z0-9\'",;\\]',
      function () {
        expect(setBrackets).withArgs(', ,').to.throwError()
        expect(setBrackets).withArgs('" "').to.throwError()
        expect(setBrackets).withArgs('a[ ]a').to.throwError()
        expect(bracketPair()).to.be('{ }')
      })

    it('you can\'t use the pretty <% %> anymore', function () {
      expect(setBrackets).withArgs('<% %>').to.throwError()
    })

    describe('brackets.split', function () {

      it('the new kid in the town is a key function', function () {
        var
          str = '<tag att="{a}" expr1={a<1} expr2={a>2}>\n{body}\r\n</tag>\n'

        resetBrackets()             // set brackets to default
        a = brackets.split(str)

        expect(a).to.have.length(9)
        expect(a[1]).to.be('a')
        expect(a[3]).to.be('a<1')
        expect(a[5]).to.be('a>2')
        expect(a[7]).to.be('body')
        expect(a[8]).to.contain('</tag>')
      })

      it('can use different brackets that current ones', function () {
        var
          str = '<tag att1="$[a]" att2=$[a<1] att3=$[a>2]>\n{body}\r\n</tag>\n',
          b = brackets.array('$[ ]'),   // get the custom brackets
          a
        resetBrackets()
        a = brackets.split(str, b)

        expect(a).to.have.length(7)
        expect(a[1]).to.be('a')
        expect(a[3]).to.be('a<1')
        expect(a[5]).to.be('a>2')
        expect(a[6]).to.contain('{body}')
      })

      it('handle single or double quotes inside quoted expressions', function () {
        var
          str = '<tag att1="{"a"}" att2={"a"} att3={\'a\'}>\'{\'a\'}\'</tag>',
          a
        resetBrackets()
        a = brackets.split(str)

        expect(a).to.have.length(9)
        expect(a[1]).to.be('"a"')
        expect(a[3]).to.be('"a"')
        expect(a[5]).to.be("'a'")
        expect(a[7]).to.be("'a'")
        expect(a[8]).to.contain('</tag>')
      })

      it('recognizes difficult literal regexes', function () {
        var
          str = 'att1={a+5/ /./} att2={x/y/z} att3={a++/b/g} att4={/[///[]/} att5={/\\/[\\]]/}',
          a
        resetBrackets()
        a = brackets.split(str)

        expect(a).to.have.length(10)
        expect(a[1]).to.be('a+5/ /./')
        expect(a[3]).to.be('x/y/z')
        expect(a[5]).to.be('a++/b/g')
        expect(a[7]).to.be('/[///[]/')
        expect(a[9]).to.be('/\\/[\\]]/')
      })

    })
    // end of brackets.split

  })
  // end of brackets 2.4 suite

})


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

  it('helper regex to match precompiled expressions', function () {

    expect(regEx.PCE_TEST.test(regEx.E_NUMBER)).to.be(true)
    expect(regEx.PCE_TEST.test('{#123#}')).to.be(true)
    expect(regEx.PCE_TEST.test('{#123}')).to.be(false)
    expect(regEx.PCE_TEST.test('{#-123#}')).to.be(false)
    expect(regEx.PCE_TEST.test('{#123')).to.be(false)
    expect(regEx.PCE_TEST.test('{##}')).to.be(false)
  })

})
