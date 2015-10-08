// riot-tmpl module
// ================
// `tmpl          ` - Root function, returns the template value, render with data<br>
// `tmpl.parse    ` - Must be called for transform user user brackets to the internals<br>
// `tmpl.hasExpr  ` - Test the existence of a expression with internal brackets<br>
// `tmpl.loopKeys ` - Get the keys for an 'each' loop (used by `_each`)<br>

//#define $_TRY_RET 'try{return '

// IIFE for tmpl()
var tmpl = (function () {
  var
    GLOBAL = typeof window !== 'object' ? global : window,
    _cache = {},
    _b = brackets.array('{# #}')

  _b[$_RIX_TEST] = /\{#[^#]*(?:#[^}][^#]*)*#+}/ // more performant regex

  // brackets has E_NUMBER so the compiler don't need require tmpl
  _cache[brackets.E_NUMBER] = function () { return 'number' }

//#ifndef $_TRY_RET
  var $_TRY_RET = 'try{return '
//#endif

  // ## Runtime Functions
  // --------------------

  /**
   * Function to handle errors.
   * You can set errorHandler to console.log or another function, it will receive
   * a message with the format `riot: %T:%I : %E`, where
   * - %T - is the tag name where error happens (-no-name- for unnamed tags)
   * - %I - is the _id property of the tag ('-' if _id is missing)
   * - %E - full error stack or message
   *
   * You can parse this text with the regex /^riot\: ([^:]+):(-|\d+)? : ([\s\S]+)/
   * the 3 parts are captured.
   */
  _tmpl.errorHandler = null

  /**
   * Exposed tmpl() function.
   * Return the template value from the cache, render with data.
   *
   * @param   {string} str  - Expression or template with zero or more expressions
   * @param   {Object} data - For setting the context
   * @returns {*} Raw value of the expression or the template to render
   * @private
   */
  function _tmpl(str, data) {
    if (!str) return str

    //#if DEBUG
    var fn = _cache[str]

    if (data && data._debug_) {
      if (!fn) fn = _create(str, 1)
      data._debug_ = 0
      var rs = typeof riot === 'undefined' ?
        '(riot undefined)' : JSON.stringify(riot.settings)
      console.error('--- DEBUG' +
        '\n riot.settings: ' + rs + '\n data: ' + JSON.stringify(data))
    }
    else if (!fn)
      fn = _create(str)
    return fn.call(data, GLOBAL, logErr)
    //#endif

    // The expressions in the template were replaced with markers pointing to
    // functions in _cache.
    // Alone expressions, returns raw values, templates returns str with the
    // markers replaced with a string (empty for falsy values, except zero).
    // Shorthand list are evaluated by shList() and returns text, too.

    return (_cache[str] || (_cache[str] = _create(str))).call(data, GLOBAL, logErr) // eslint-disable-line
  }

  /**
   * Creates a function instance for get a value from the received template string.
   *
   * @param {string} str - The template string, can include zero or more expressions.
   * @returns {Function} - An instance of Function with the compiled template.
   * @private
   */
  function _create(str) {

    // Optimize code for str without expressions
    if (!_b[$_RIX_TEST].test(str)) {
      str = str.replace(/\r\n?/g, '\n')
      return function () { return str }
    }

    var expr = _getTmpl(str)
    if (expr.slice(0, 11) !== $_TRY_RET) expr = 'return ' + expr

//#if DEBUG
    if (arguments.length > 1) {
      console.log('--- getter: -----------------------------------------------')
      console.log('    `' + s + '`')
      console.log('---')
    }
//#endif

    // Now, we can create the function to return by calling the Function constructor.
    // It'll halt the app if the expression has errors (Parse Error or SyntaxError).
    // The parameter `E` is the error handler for runtime only.
//#if SHOW_PARSE_ERRORS
    try {
//#endif
    return new Function('G,E', expr + ';')  // eslint-disable-line indent
//#if SHOW_PARSE_ERRORS
    }
    catch (e) {
      console.error('riot: ' + e + '\ncreating function (G,E) {\n' + expr + '\n;}')
      //return function () { return '**Error**' }
      throw e
    }
//#endif
  }
  // end _create()

  /*
    Output an error message through the `_tmpl.errorHandler` function
  */
  function logErr(err, D) {

    if (_tmpl.errorHandler) {
      var s = 'riot:'

      // add the tag data
      if (D) {
        s += ' ' + (D && D.root && D.root.tagName || '-no-name-')
        s += ':' + ('_riot_id' in D ? D._riot_id : '-')   // WARNING: base 0
      } else
        s += ' -no-data-:-'

      // add the stack or message and call the handler
      s += ' : ' + (err.stack || err)
      _tmpl.errorHandler(s)
    }
  }

  /**
   * Trims the expression and replaces the user brackets with the internal ones.
   * Right now this function does nothing more, but in the future can be used for
   * another business or as a central point to filter user errors.
   *
   * @param   {string}   str  - The template string, can include zero or more expressions.
   * @param   {Array}   [_b]  - Brackets array, allows use different brackets that current ones.
   * @param   {boolean} [attr]- `true` (or 1) if the str comes from attributes.
   * @returns {Function} - An instance of Function with the compiled template.
   */
  _tmpl.parse = function parse(str, _b, attr) {
    if (!_b) _b = brackets.array()

    if (_b[$_RIX_TEST].test(str)) {
      var parts = brackets.split(str, _b)
      for (var i = 1; i < parts.length; i += 2)
        parts[i] = '{#' + parts[i].trim() + '#}'
      str = parts.join('')
      //if (!attr) str = str.replace(/"/g, '&quot;')
    }
    return str
  }

  /**
   * Check the existence of a expression inside a string (internal brackets).
   *
   * @param   {string } str - String to check on
   * @returns {boolean} `true` if str contains an expression
   */
  _tmpl.hasExpr = function hasExpr(str) {
    return _b[$_RIX_TEST].test(str)
  }

  /**
   * Extract the parts from an `each` attribute value as '{#key,pos in expr#}'.
   * Used by browser/tag/each.js
   *
   * @param   {string} expr - The value of the 'each' attribute.
   * @returns {Object} Expression with optional loop keys.
   */
  _tmpl.loopKeys = function loopKeys(expr) {
    var m = expr.match(_b[$_RIX_LOOP])
    return m ? { key: m[1], pos: m[2], val: _b[0] + m[3] + _b[1] } : { val: expr }
  }

  // ## Compilation
  // --------------

  // Regexes for `parseExpr` and `getCSList`
  var
    RE_QBLOCK = regEx(regEx.S_QBSRC, 'g'),
    RE_QBMARK = /\x01(\d+)~/g,    // string or regex marker, $1: array index
    CS_IDENT  = /^(?:(-?[_A-Za-z\xA0-\xFF][-\w\xA0-\xFF]*)|\x01(\d+)~):/

  /**
   * Parses an expression or template with zero or more expressions enclosed with
   * user brackets. Called from the compiler and the `riot.tag` function.
   *
   * @param   {string  } str - Raw template string, without comments.
   * @returns {string  } Processed template, ready for insertion in the tag definition.
   * @private
   */
  function _getTmpl(str) {
    var
      qstr = [],                      // hidden qblocks
      expr,
      parts = brackets.split(str, _b) // get text/expr parts

    // We can have almost anything as expressions, except comments... hope
    if (parts.length > 2 || parts[0]) {

      var i, j, list = []

      for (i = j = 0; i < parts.length; ++i) {

        expr = parts[i]

        if (expr && (expr = i & 1 ?             // every odd element is an expression

              _parseExpr(expr, 1, qstr) :       // mode 1 convert falsy values to "",
                                                // except zero
              '"' + expr                        // ttext: convert to js literal string
                .replace(/\r\n?|\n/g, '\\n')    // normalize eols
                .replace(/"/g, '\\"') +         // escape inner double quotes
              '"'                               // enclose double quotes

          )) list[j++] = expr

      }

      expr = j < 2 ? list[0] || '""' :          // optimize code for 0-1 parts
             '[' + list.join(',') + '].join("")'

    }
    else {

      expr = _parseExpr(parts[1], 0, qstr)      // single expressions as raw value

    }

    // Restore quoted strings and regexes
    if (qstr[0])
      expr = expr.replace(RE_QBMARK, function (_, pos) {
        return qstr[pos].replace(/\r/g, '\\r').replace(/\n/g, '\\n')
      })

    return expr
  }

  // For  shorthand names, riot supports a limited subset of the full w3c/html specs
  // for non-quoted identifiers (closer to CSS1 that CSS2).
  // This is the regex used for recognition:
  //
  //   `-?[_A-Za-z\xA0-\xFF][-\w\xA0-\xFF]*`
  //
  // The regex accepts almost all ISO-8859-1 alphanumeric characters within an html
  // identifier. Doesn't works with escaped codepoints.
  // You can use Unicode code points beyond `\u00FF` by quoting the names (not recommended).
  //
  // See:<br>
  // http://www.w3.org/TR/CSS21/grammar.html#scanner<br>
  // http://www.w3.org/TR/CSS21/syndata.html#tokenization

  /**
   * Parses `{ expression }` or `{ name: expression, ... }`
   *
   * @param   {string} expr   - The expression, without brackets
   * @param   {number} asText - 0: raw value, 1: falsy as "", except 0
   * @param   {Array}  qstr   - Where to store hidden quoted strings and regexes
   * @returns {string} Code to evaluate the expression
   * @private
   */
  function _parseExpr(expr, asText, qstr) {

    // Replace non-empty qstrings with a marker that includes its index into the array
    // of replaced qstrings (by hiding regexes and strings here we avoid complications
    // through all the code without affecting the logic).
    //
    // Also, converts whitespace into compacted spaces and trims surrounding spaces
    // and some inner tokens, mainly brackets and separators.
    // We need convert embedded `\r` and `\n` as these chars break the evaluation.
    //
    // WARNING:
    //   Trim and compact is not strictly necessary, but it allows optimized regexes.
    //   Do not touch the next block until you know how/which regexes are affected.

    expr = expr
          .replace(RE_QBLOCK, function (s, div) {   // hide strings & regexes
            return s.length > 2 && !div ? '\x01' + (qstr.push(s) - 1) + '~' : s
          })
          .replace(/\s+/g, ' ').trim()
          .replace(/\ ?([[\({},?\.:])\ ?/g, '$1')

    if (expr) {
      var
        list = [],
        cnt = 0,
        match

      // Try to match the first name in the possible shorthand list
      while (expr &&
            (match = expr.match(CS_IDENT)) &&
            !match.index                          // index > 0 means error
        ) {
        var
          key,
          jsb,
          re = /,|([[{(])|$/g

        expr = RegExp.rightContext                // before replace()
        key  = match[2] ? qstr[match[2]].slice(1, -1).trim().replace(/\s+/g, ' ') : match[1]

        // Search the next unbracketed comma or the end of 'expr'.
        // If a openning js bracket is found ($1), skip the block.

        while (jsb = (match = re.exec(expr))[1]) {
          var
            lv = 1,
            ir = jsb === '(' ? /[()]/g : jsb === '[' ? /[[\]]/g : /[{}]/g

          ir.lastIndex = re.lastIndex

          while (match = ir.exec(expr)) {
            if (match[0] === jsb) ++lv
            else if (!--lv) break
          }
          re.lastIndex = lv ? str.length : ir.lastIndex
        }

        jsb  = expr.slice(0, match.index)
        expr = RegExp.rightContext

        list[cnt++] = _wrapExpr(jsb, 1, key)
      }

      // For shorthands, the generated code returns an array with expression-name pairs
      expr = !cnt ? _wrapExpr(expr, asText) :
          cnt > 1 ? '[' + list.join(',') + '].join(" ").trim()' : list[0]
    }
    return expr
  }

  // Matches a varname, excludes object keys. $1: lookahead, $2: variable name
  var JS_VARNAME =
    /[,{][$\w]+:|(^ *|[^$\w\.])(?!(?:typeof|true|false|null|undefined|in|instanceof|is(?:Finite|NaN)|void|NaN|new|Date|RegExp|Math)(?![$\w]))([$_A-Za-z][$\w]*)/g

  // Generates code to evaluate an expression avoiding breaking on undefined vars.
  function _wrapExpr(expr, asText, key) {
    var tryb = 0

    expr = expr.replace(JS_VARNAME, function (match, p, mvar) {
      // this and global needs try block only,
      // "window" is replaced by `window` or `global` at runtime
      if (mvar) {
        ++tryb
        if (mvar !== 'this' && mvar !== 'global') {
          match = p + (mvar === 'window' ? 'G' : '("' + mvar + '"in this?this:G).' + mvar)
        }
      }
      return match
    })

    if (tryb) {
      expr = $_TRY_RET + expr + '}catch(e){E(e,this)}'
    }

    if (key) {  // shorthands
      // w/try : function(){try{return expr}catch(e){E(e,this)}}.call(this)?"name":""
      // no try: (expr)?"name":""
      // ==> 'return [' + expr_list.join(',') + '].join(" ").trim()'
      expr = (tryb ?
          'function(){' + expr + '}.call(this)' : '(' + expr + ')'
        ) + '?"' + key + '":""'
    }
    else if (asText) {
      // w/try : function(v){try{v=expr}catch(e){E(e,this)};return v||v===0?v:""}.call(this)
      // no try: function(v){return (v=(expr))||v===0?v:""}.call(this)
      // ==> 'return [' + text_and_expr_list.join(',') + '].join("")'
      expr = 'function(v){' + (tryb ?
          expr.replace('return ', 'v=') : 'v=(' + expr + ')'
        ) + ';return v||v===0?v:""}.call(this)'
    }
    // else if (!asText)
    //  no try: return expr
    //  w/try : try{return expr}catch(e){E(e,this)}   // returns undefined if error

    return expr
  }

  return _tmpl

})()
