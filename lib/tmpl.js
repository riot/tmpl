// riot-tmpl module
// ================
// `tmpl         ` - Root function, returns the template value, render with data<br>
// `tmpl.hasExpr ` - Test the existence of a _precompiled expression_<br>
// `tmpl.loopKeys` - Get the keys for an 'each' loop (used by `_each`)<br>
// `tmpl.insert  ` - Insert getters into the cache (used by `tag2`)<br>
// `tmpl.compile ` - Precompiles expressions (used by the riot-compiler and the `riot.tag` function)

// IIFE for tmpl()
var tmpl = (function () {

//#ifndef $_PCE_TEST          // included in regexp.js
  var                         // make linters happy
    $_PCE_TEST  = /{#\d+#}/,
    $_PCE_ALONE = /^{(#\d+)#}$/,
    $_PCE_REPL  = /{(#\d+)#}/g,
    $_PCE_LOOP  = /^([$\w]+),([^,]*),({#\d+#})/,
    $_E_UNDEF   = '{#00#}',
    $_E_NUMBER  = '{#01#}'
//#endif

  var
    GLOBAL = typeof window !== 'object' ? global : window,

    _cache = {
      '#00': function () { return undefined },
      '#01': function () { return 'number' }
    }

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
    var x, v
    if (!str) return str

    //#if DEBUG
    if (data && data._debug_) {
      data._debug_ = 0
      var rs = typeof riot === 'undefined' ?
        '(riot undefined)' : JSON.stringify(riot.settings)
      console.error('--- DEBUG' +
        '\n riot.settings: ' + rs + '\n data: ' + JSON.stringify(data))
    }
    //#endif

    // The expressions in the template were replaced with markers pointing to
    // functions in _cache.
    // Alone expressions, returns raw values, templates returns str with the
    // markers replaced with a string (empty for falsy values, except zero).
    // Shorthand list are evaluated by shList() and returns text, too.

    if (x = str.match($_PCE_ALONE)) {
      try {
        v = _cache[x[1]].call(data, GLOBAL, shList)
      } catch (e) {
        logErr(e, x[1], data)
      }
      return v    // raw value
    }

    return str.replace($_PCE_REPL, function (_, n) {
      var s
      try {
        s = _cache[n].call(data, GLOBAL, shList)
      } catch (e) {
        logErr(e, n, data)
      }
      return s || s === 0 ? s : ''  // text
    })
  }

  // Shorthand list parser, called with `[key,expr,key,expr,...]`
  function shList(data, list) {
    var i, s, cs = ''

    for (i = 0; i < list.length; ++i) {
      try {
        if (s = list[i].call(data, GLOBAL))
          cs += (cs ? ' ' : cs) + s
      } catch (e) {
        logErr(e, 0, data)
      }
    }
    return cs
  }

  // Output an error message through the `_tmpl.errorHandler` function,
  // throw if missing expression and errorHandler is none.
  function logErr(err, n, D) {
    var s = n && !_cache[n] || _tmpl.errorHandler ? 'riot:' : ''
    if (!s) return

    // add the tag data
    if (D) {
      s += ' ' + (D && D.root && D.root.tagName || '-no-name-')
      s += ':' + ('_riot_id' in D ? D._riot_id : '-')   // WARNING: _is is base 0
    } else
      s += ' -no-data-:-'

    // add the stack or message
    s += ' : ' + (err.stack || err)

    // call handler, if no handler, throw the missing pcexpr
    if (_tmpl.errorHandler)
      _tmpl.errorHandler(s)
    else
      throw new Error(s + ' : Missing expression "' + n + '"')
  }

  /**
   * Check the existence of a _compiled expression_ inside a string.
   *
   * @param   {string } str - String to check on
   * @returns {boolean} `true` if str contains an expression
   */
  _tmpl.hasExpr = function hasExpr(str) {
    return $_PCE_TEST.test(str)
  }

  /**
   * Extract the parts from an each attribute value matching 'item,i,#@n#'.
   * Used by browser/tag/each.js
   *
   * @param   {string} expr - The value of the 'each' attribute.
   * @returns {Object} Expression with optional loop keys.
   */
  _tmpl.loopKeys = function loopKeys(expr) {
    var m = expr.match($_PCE_LOOP)
    return m ? { key: m[1], pos: m[2], val: m[3] } : { val: expr }
  }

  /**
   * Insert getters into the cache.
   *
   * @param {Object} pcexpr - Key is the hash, value is the function
   */
  _tmpl.insert = function insert(pcexpr) {
    for (var hash in pcexpr) {    // eslint-disable-line guard-for-in
      _cache[hash] = pcexpr[hash]
    }
  }

  //#ifndef PURE_PCEXPR

  // ## Compilation
  // --------------
  // NOTE: This code is not necessary for pure precompiled expressions.

  //#define $_EACH_EXPR /^(?:\^\s*)?([$\w]+)(?:\s*,\s*(\S+))?\s+in\s+(\S+)$/
  //#define $_EACH_ATTR /(^|\s)each\s*=\s*['"]?$/i
  //#define $_EACH_LOOK /\beach\s*=/i
  //#if 0
  var
    // Regexes for detection of the riot attribute 'each'
    $_EACH_EXPR = /^(?:\^\s*)?([$\w]+)(?:\s*,\s*(\S+))?\s+in\s+(\S+)$/,
    $_EACH_ATTR = /(^|\s)each\s*=\s*['"]?$/i,
    $_EACH_LOOK = /(^|\s)each\s*=/i
  //#endif

  /**
   * Parses an expression or template with zero or more expressions enclosed with
   * user brackets. Called from the compiler and the `riot.tag` function.
   *
   * @param   {string  } str    - Raw template string, without comments.
   * @param   {Object  } [opts] - User options.
   * @param   {Array   } [pcex] - String of hash:function pairs for the getters (out).
   * @param   {Function} [fn]   - Function to preprocess expressions, from compiler.parsers.
   * @returns {string  } Processed template, ready for insertion in the tag definition.
   */
  _tmpl.compile = function compile(str, opts, pcex, fn) {
    if (!str) return str
    var
      exprIDs = [],   // rev 2015-10-03, avoid duplicate pcexpr
      look,
      expr,
      each,
      hash,
      parts = brackets.split(str, opts && opts._b)  // get text/expr parts

    look = $_EACH_LOOK.test(str)      // this paid, `each` is not common

    // We can have almost anything as expressions, except comments... hope
    for (var i = 1; i < parts.length; i += 2) {
      expr = parts[i].trim()
      if (!expr) {
        parts[i] = $_E_UNDEF
        continue
      }
      each = look && expr.match($_EACH_EXPR)

      // Convert "each" from `{ item,i in items }` to `item,i,{#00#}`
      if (each && $_EACH_ATTR.test(parts[i - 1])) {
        parts[i - 1] += each[1] + ',' + (each[2] || '') + ','
        expr = each[3]
      }
      else if (expr[0] === '^') {     // trick to avoid preprocessing
        expr = expr.slice(1).trim()   // ...this expression
      }
      else if (fn) {                  // from compiler.parser
        expr = fn(expr, opts)
      }

      parts[i] = '{' + (hash = hashCode(expr)) + '#}'

      if (~exprIDs.indexOf(hash)) continue
      exprIDs.push(hash)

      expr = parseExpr(expr)

      //#if DEBUG
      if (opts === 1)
        console.log('--- DEBUG: expr ' + i + ' is `' + expr + '`')
      //#endif

      // pcex is received from the riot compiler, returns strings to create an object
      if (pcex)
        pcex.push('"' + hash + '":function(G,F){return ' + expr + '}')
      else
        _cache[hash] = new Function('G,F', 'return ' + expr + ';')
    }

    return parts.join('')
  }

  // Adapted from http://www.partow.net/programming/hashfunctions/index.html
  // Custom SDBMHash function using full native js signed integers.
  function hashCode(str) {
    var i, hash

    for (i = hash = 0; i < str.length; ++i) {
      hash = str.charCodeAt(i) + (hash << 6) + (hash << 16) - hash
    }
    return hash < 0 ? '#0' + hash * -1 : '#' + hash // preserve values >32 bits
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

  // Regexes for `parseExpr` and `getCSList`
  var
    RE_QBLOCK = regEx(regEx.S_QBSRC, 'g'),
    RE_QBMARK = /\x01(\d+)~/g,    // string or regex marker, $1: array index
    CS_IDENT  = /^(?:(-?[_A-Za-z\xA0-\xFF][-\w\xA0-\xFF]*)|\x01(\d+)~):/

  /**
   * Parses `{ expression }` or `{ name: expression, ... }`
   *
   * @param   {string} expr - The expression, without brackets
   * @returns {string} Code for evaluate the expression
   */
  function parseExpr(expr) {

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

    var qstr = []

    expr = expr
          .replace(RE_QBLOCK, function (str, div) {   // hide strings & regexes
            return str.length > 2 && !div ? '\x01' + (qstr.push(str) - 1) + '~' : str
          })
          .replace(/\s+/g, ' ').trim()
          .replace(/\ ?([[\({},?\.:])\ ?/g, '$1')

    if (expr) {
      var list = getCSList(expr, qstr)

      // For shorthands, the generated code returns an array with expression-name pairs
      expr = list ? 'F(this,[' + list.join(',') + '])' : wrapExpr(expr)

      // Restore quoted strings and regexes
      if (qstr[0]) {
        expr = expr.replace(RE_QBMARK, function (_, pos) {
          return qstr[pos].replace(/\r/g, '\\r').replace(/\n/g, '\\n')
        })
      }
    }
    return expr
  }

  // If the expression is a shorthand list, getCSList returns a list with
  // `expression,"name"` elements, else returns zero.
  function getCSList(expr, qstr) {
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
        if (lv) return 0
        re.lastIndex = ir.lastIndex
      }

      jsb  = expr.slice(0, match.index)
      expr = RegExp.rightContext

      list[cnt++] = 'function(){return (' + wrapExpr(jsb) + ')?"' + key + '":""}'
    }

    return cnt && list
  }

  // Matches a varname, excludes object keys. $1: lookahead, $2: variable name
  var JS_VARNAME =
    /[,{][$\w]+:|(^ *|[^$\w\.])(?!(?:this|global|typeof|true|false|null|in|instanceof|is(?:Finite|NaN)|void|NaN|new|Date|RegExp|Math)(?![$\w]))([$_A-Za-z][$\w]*)/g

  // Generates code to evaluate an expression avoiding breaking on undefined vars.
  function wrapExpr(expr) {
    // "window" is replaced by `window` or `global` at runtime
    return expr.replace(JS_VARNAME, function (match, p, mvar) {
      if (mvar)
        match = p + (mvar === 'window' ? 'G' : '("' + mvar + '"in this?this:G).' + mvar)
      return match
    })
  }

  //#if DEBUG
  _tmpl.cache = function cache(expr) {
    var a = []
    expr.replace($_PCE_REPL, function (m, n) {
      a.push(_cache[n])
    })
    return a
  }
  //#endif

  // Code for runtime parsing and compilation of expressions ends here

  //#endif // PURE_PCEXPR

  return _tmpl

})()
