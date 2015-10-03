/*
  riot-tmpl test suite
  --------------------
*/
/* eslint-env node, browser, jasmine */

globalVar = 5               // global, no var keyword

function resetBrackets() {
  brackets.set()
}

describe('riot-tmpl', function() {
  var
    _tmpl    = require('../dist/tmpl'),
    tmpl     = _tmpl.tmpl,
    brackets = _tmpl.brackets,
    regEx    = _tmpl.regEx,
    render   = this.render,
    data     = this.setData({})

  describe('compiles specs', function() {

    //this.timeout(5000)
    //jasmine.DEFAULT_TIMEOUT_INTERVAL = 5000

    //// return values

    it('expressions always return a raw value', function () {
      expect(render('{ 1 }')).toBe(1)
      expect(render('{ x }')).toBe(2)
      expect(render('{ str }')).toBe(data.str)
      expect(render('{ obj }')).toBe(data.obj)
      expect(render('{ arr }')).toBe(data.arr)
      expect(render('{ fn }')).toBe(data.fn)
      expect(render('{ null }')).toBeNull()
      expect(render('{ no }')).toBe(false)
      expect(render('{ yes }')).toBe(true)
    })

    it('templates always return a string value', function () {
      expect(render('{ 1 } ')).toBe('1 ')
      expect(render('{ obj } ')).toEqual(data.obj + ' ')
    })

    //// empty arguments

    it('empty expressions equal to undefined', function () {
      expect(render()).toBeUndefined()
      expect(render('{}')).toBeUndefined()
      expect(render('{ }')).toBeUndefined()
    })

    it('empty templates equal to empty string', function () {
      expect(render('')).toBe('')
      expect(render('{ } ')).toBe(' ')
    })

    //// undefined values

    it('ignore undefined value errors in expressions', function () {
      //catch the error, and set value to undefined
      expect(render('{ nonExistingVar }')).toBeUndefined()
      expect(render('{ !nonExistingVar }')).toBe(true)
      expect(render('{ nonExistingVar ? "yes" : "no" }')).toBe('no')
      expect(render('{ !nonExistingVar ? "yes" : "no" }')).toBe('yes')
    })

    it('in templates, false and undefined values result in empty string', function () {
      expect(render(' { nonExistingVar }')).toBe(' ')
      expect(render(' { no }')).toBe(' ')
    })

    //// expressions

    describe('Expressions', function () {

      it('expressions are just JavaScript', function () {
        expect(render('{ obj.val }')).toBe(data.obj.val)
        expect(render('{ obj["val"] }')).toBe(data.obj.val)
        expect(render('{ arr[0] }')).toBe(data.arr[0])
        expect(render('{ arr[0]; }')).toBe(data.arr[0])
        expect(render('{ arr.pop() }')).toBe(2)
        expect(render('{ fn(str) }')).toBe(data.fn(data.str))
        expect(render('{ yes && "ok" }')).toBe('ok')
        expect(render('{ no && "ok" }')).toBe(false)
        expect(render('{ false || null || !no && yes }')).toBe(true)
        expect(render('{ !no ? "yes" : "no" }')).toBe('yes')
        expect(render('{ !yes ? "yes" : "no" }')).toBe('no')
        expect(render('{ /^14/.test(+new Date()) }')).toBe(/^14/.test(+new Date()))
        expect(render('{ typeof Math.random() }')).toBe('number')
        expect(render('{ fn("there") }')).toBe(data.fn('there'))
        expect(render('{ str == "x" }')).toBe(data.str == 'x')
        expect(render('{ /x/.test(str) }')).toBe(/x/.test(data.str))
        expect(render('{ true ? "a b c" : "foo" }')).toBe('a b c')
        expect(render('{ true ? "a \\"b\\" c" : "foo" }')).toBe('a "b" c')
        expect(render('{ str + " y" + \' z\'}')).toBe(data.str + ' y z')
        expect(render('{ esc }')).toBe(data.esc)
        expect(render('{ $a }')).toBe(data.$a)
        expect(render('{ $a + $b }')).toBe(data.$a + data.$b)
        expect(render('{ this.str }')).toBe(data.str)
        expect(render("{filterState==''?'empty':'notempty'}")).toBe('notempty')
      })

      it('global vars are supported in expressions', function () {
        expect(render('{ globalVar }')).toBe(globalVar)
      })

      // comments are unsupported from v2.4

      xit('all comments in expressions are stripped from the output', function () {
        expect(render('{ /* comment */ /* as*/ }')).toBeUndefined()
        expect(render(' { /* comment */ }')).toBe(' ')
        expect(render('{ 1 /* comment */ + 1 }')).toBe(2)
        expect(render('{ 1 /* comment */ + 1 } ')).toBe('2 ')
        pending('comments in expressions unsupported since v2.4')
      })

    })

    //// templates

    describe('Templates', function () {

      it('all expressions are evaluted in template', function () {
        expect(render('{ 1 }{ 1 }')).toBe('11')
        expect(render('{ 1 }{ 1 } ')).toBe('11 ')
        expect(render(' { 1 }{ 1 }')).toBe(' 11')
        expect(render('{ 1 } { 1 }')).toBe('1 1')
      })

      it('both templates and expressions are new-line-friendly', function () {
        expect(render('\n  { yes \n ? 2 \n : 4} \n')).toBe('\n  2 \n')
      })

    })

    //// class shorthand

    describe('Class shorthands', function () {

      it('names can be single-quoted, double-quoted, unquoted', function () {
        expect(render('{ ok : yes }')).toBe('ok')
        expect(render('{ "a" : yes, \'b\': yes, c: yes }')).toBe('a b c')
        expect(render('{ a_b-c3: yes }')).toBe('a_b-c3')
        // even dashed names can be unquoted
        expect(render('{ my-class: yes }')).toBe('my-class')
      })

      it('set two classes with one expression', function () {
        expect(render('{ "a b": yes }')).toBe('a b')
      })

      it('errors in expressions are silently catched', function () {
        // ...allowing shorter expressions
        expect(render('{ loading: !nonExistingVar.length }')).toBe('')
      })

      it('expressions are just regular JavaScript', function () {
        expect(render('{ a: !no, b: yes }')).toBe('a b')
        expect(render('{ y: false || null || !no && yes }')).toBe('y')
        expect(render('{ y: 4 > 2 }')).toBe('y')
        expect(render('{ y: fn() }')).toBe('y')
        expect(render('{ y: str == "x" }')).toBe('y')
        expect(render('{ y: new Date() }')).toBe('y')
      })

      it('even function calls, objects and arrays are no problem', function () {
        expect(render('{ ok: fn(1, 2) }')).toBe('ok')
        expect(render('{ ok: fn([1, 2]) }')).toBe('ok')
        expect(render('{ ok: fn({a: 1, b: 1}) }')).toBe('ok')
      })

    })

    //// custom brackets

    describe('Custom brackets', function () {

      afterEach(resetBrackets)

      it('single-character brackets', function () {
        brackets.set('[ ]')

        expect(render('[ x ]')).toBe(data.x)
        expect(render('[ str\\[0\\] ]')).toBe(str[0])
      })

      // angle brackets are UNSUPPORTED from v2.4

      xit('multicharacter brackets', function () {
        brackets.set('<% %>')

        expect(render('<% x %>')).toBe(2)
        pending('angle brackets unsupported since v2.4')
      })

      it('asymmetric brackets', function () {
        brackets.set('${ }')

        expect(render('${ x }')).toBe(2)
      })

      it('defaults to { } if setting is undefined, null, or empty', function () {
        brackets.set(null)
        expect(render('{ x }')).toBe(2)
        brackets.set('')
        expect(render('{ x }')).toBe(2)
      })

      //// using brackets inside expressions

      it('brackets in expressions can always be escaped', function () {
        expect(render('{ "\\{ 1 \\}" }')).toBe('{ 1 }')
        expect(render('\\{ 1 }')).toBe('{ 1 }')
        expect(render('{ "\\}" }')).toBe('}')
        expect(render('{ "\\{" }')).toBe('{')
      })

      it('though escaping is optional...', function () {
        expect(render('{ JSON.stringify({ x: 5 }) }')).toBe('{"x":5}')
        expect(render('a{ "b{c}d" }e { "{f{f}}" } g')).toBe('ab{c}de {f{f}} g')
      })

      it('for custom brackets as well', function () {
        brackets.set('[ ]')

        expect(render('a[ "b[c]d" ]e [ "[f[f]]" ] g')).toBe('ab[c]de [f[f]] g')

        brackets.set('{{ }}')
        expect(render('a{{ "b{{c}}d" }}e {{ "{f{{f}}}" }} g')).toBe('ab{{c}}de {f{{f}}} g')

        // UNSUPPORTED since v2.4
        //brackets.set('<% %>')
        //expect(render('a<% "b<%c%>d" %>e <% "<%f<%f%>%>" %> g')).toBe('ab<%c%>de <%f<%f%>%> g')
      })

      // ...unless you're doing something very special. escaping is still needed if:
      it('asymmetric custom brackets needs escaping', function () {
        // - your inner brackets don't have matching closing/opening bracket, e.g. { "{" } instead of { "{ }" }
        expect(render('a{ "b\\{cd" }e')).toBe('ab{cde')

        // - you're using asymmetric custom brackets, e.g.: ${ } instead of { }, [ ], {{ }}, <% %>
        brackets.set('${ }')
        expect(render('a${ "b{c\\}d" }e')).toBe('ab{c}de')
        brackets.set(null)
      })

      resetBrackets()

    })

  })

  describe('- 2.3 update', function() {

    afterAll(resetBrackets)

    it('has few errors in recognizing complex expressions', function () {
      data.$a = 0
      data.$b = 0
      data.parent = { selectedId: 0 }

      // FIX #784 - The shorthand syntax for class names doesn't support parentheses
      expect(render('{ primary: (parent.selectedId === $a)  }')).toBe('primary')

      // a bit more of complexity. note: using the comma operator requires parentheses
      expect(render('{ ok: ($b++, ($a > 0) || ($b & 1)) }')).toBe('ok')
    })

    it('`void` and `global` unprotected, in addition to `this`', function () {
      if (typeof global === 'object' && global.globalVar) {
        globalVar = 5
        expect(render('{ global.globalVar }')).toBe(global.globalVar)
      }
      data.$a = 5
      expect(render('{ this.$a }')).toBe(5)
      expect(render('{ void 0 }')).toBeUndefined()
    })


    resetBrackets()

    it('in quoted text, left bracket and backslashes need to be escaped!', function () {
      expect(render('str = "/\\{}\\\\/\\\\n/"')).toBe('str = "/{}\\/\\n/"')
    })

    //// Better recognition of literal regexps inside template and expressions.

    it('better recognition of literal regexps', function () {

      expect(render('{ /{}\\/\\n/.source }')).toBe('{}\\/\\n')
      expect(render('{ ok: /{}\\/\\n/.test("{}\\/\\n") }')).toBe('ok')

      // handling quotes in regexp is not so complicated :)
      expect(render('{ /"\'/.source }')).toBe('"\'')
      expect(render('{ ok: /"\'/.test("\\\"\'") }')).toBe('ok')
      expect(render('rex = /\\\"\'/')).toBe('rex = /\\\"\'/')      // rex = /\"\'/
      expect(render('str = "/\\\"\'/"')).toBe('str = "/\\\"\'/"')  // str = "\"\'"

      // no confusion with operators
      data.x = 2
      expect(render('{ 10 /x+10/ 1 }')).toBe(15)
      expect(render('{ x /2+x/ 1 }')).toBe(3)
      expect(render('{ x /2+"abc".search(/c/) }')).toBe(3)

      // in expressions, there's no ASI support
      expect(render('{ x\n /2+x/ 1 }')).toBe(3)
    })

    //// Better recognition of comments, including empty ones.
    xit('comments are unsupported from v2.4', function () {

      // comments within expresions are converted to spaces, in concordance with js specs
      expect(render('{ typeof/**/str === "string" }')).toBe(true)
      expect(render('{ 1+/* */+2 }')).toBe(3)

      // comments in template text is preserved
      expect(render(' /*/* *\/ /**/ ')).toBe(' /*/* *\/ /**/ ')
      expect(render('/*/* "note" /**/')).toBe('/*/* "note" /**/')

      // riot parse correctamente empty and exotic comments
      expect(render('{ /**/ }')).toBeUndefined()               // empty comment
      expect(render('{ /*/* *\/ /**/ }')).toBeUndefined()      // nested comment sequences

      // there's no problem in shorthands
      expect(render('{ ok: 0+ /*{no: 1}*/ 1 }')).toBe('ok')
      expect(render('{ ok: 1 /*, no: 1*/ }')).toBe('ok')
      expect(render('{ ok/**/: 1 }')).toBe('ok')

      // nor in the template text, comments inside strings are preserved
      expect(render('{ "/* ok */" }')).toBe('/* ok */')
      expect(render('{ "/*/* *\/ /**/" }')).toBe('/*/* *\/ /**/')
      expect(render('{ "/* \\"comment\\" */" }')).toBe('/* "comment" */')
    })

    it('you can include almost anything in quoted names', function () {
      expect(render('{ "_\u221A": 1 }')).toBe('_\u221A')
      expect(render('{ (this["\u221A"] = 1, this["\u221A"]) }')).toBe(1)
    })

  //// Mac/Win EOL's normalization avoids unexpected results with some editors.

    it('win eols are normalized in template text', function () {
      expect(render('\r\n \n \r \n\r')).toBe('\n \n \n \n\n')
      expect(render('\r\n { 0 } \r\n')).toBe('\n 0 \n')
    })

    it('...even in their quoted parts', function () {
      expect(render('style="\rtop:0\r\n"')).toBe('style="\ntop:0\n"')
    })

    it('whitespace are compacted in expressions', function () {
      expect(render(' { yes ?\n\t2 : 4} ')).toBe(' 2 ')   // see the generated code
      expect(render('{ \t \nyes !== no\r\n }')).toBe(true)
    })

    it('...but is preserved in js quoted strings', function () {
      expect(render('{ "\r\n \n \r" }')).toBe('\r\n \n \r')
      expect(render('{ ok: "\r\n".charCodeAt(0) === 13 }')).toBe('ok')
    })

    it('in shorthand names, whitespace will be compacted', function () {
      expect(render('{ " \ta\n \r \r\nb\n ": yes }')).toBe('a b')
    })

  //// Extra tests

    it('correct handling of quotes', function () {
      expect(render('{ "House \\"Atrides\\" wins" }')).toBe('House "Atrides" wins')
      expect(render('{ "Leto\'s house" }')).toBe("Leto's house")
      expect(render(" In '{ \"Leto\\\\\\\'s house\" }' ")).toBe(" In 'Leto\\\'s house' ")  // « In '{ "Leto\\\'s house" }' » --> In 'Leto\'s house'
      expect(render(' In "{ "Leto\'s house" }" ')).toBe(' In "Leto\'s house" ')            // « In "{ "Leto's house" }"    » --> In "Leto's house"
      expect(render(' In "{ \'Leto\\\'s house\' }" ')).toBe(' In "Leto\'s house" ')        // « In "{ 'Leto\'s house' }"   » --> In "Leto's house"
    })

  //// Consistency?

    it('the main inconsistence between expressions and class shorthands', function () {
      expect(render('{ !nonExistingVar.foo ? "ok" : "" }')).toBeUndefined() // ok
      expect(render('{ !nonExistingVar.foo ? "ok" : "" } ')).toBe(' ')      // ok
  //  expect(render('{ ok: !nonExistingVar.foo }')).toBe('ok')              // what?
      expect(render('{ ok: !nonExistingVar.foo }')).toBe('')                // ok ;)
    })

  })

  //// from v2.4 Date constructor is unprotected
  xit('OBSOLETE', function() {

    // without unprefixed global/window, default convertion to `new (D).Date()` throws here
    data.Date = '?'
    if (typeof window !== 'object')
      expect(render('{ +new global.Date() }')).toBe.a('number')
    else
      expect(render('{ +new window.Date() }')).toBe.a('number')

  })


  //// Support for full ISO-8859-1 charset in js var and class names
  /*
    expect(render('{ neón: 1 }')).toBe('neón')
    expect(render('{ -ä: 1 }')).toBe('-ä')                   // '-ä' is a valid class name
    expect(render('{ ä: 1 }')).toBe('ä')
    expect(render('{ (this["neón"] = 0, ++neón) }')).toBe(1)
    expect(render('{ (this["_ä"] = 1, _ä) }')).toBe(1)       // '-ä'' is not a var name
    expect(render('{ (this["ä"] = 1, ä) }')).toBe(1)
  */

})

describe('regEx', function () {
  /* */
  it('regEx constructor favour code size', function () {
    var s = '/[/$]/'
    expect(regEx(s).source).toBe((new RegExp(s)).source)
  })

})
