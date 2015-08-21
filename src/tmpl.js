/*
//// How it works?


Three ways:

1. Expressions: tmpl('{ value }', data).
   Returns the result of evaluated expression as a raw object.

2. Templates: tmpl('Hi { name } { surname }', data).
   Returns a string with evaluated expressions.

3. Filters: tmpl('{ show: !done, highlight: active }', data).
   Returns a space separated list of trueish keys (mainly
   used for setting html classes), e.g. "show highlight".


// Template examples

tmpl('{ title || "Untitled" }', data)
tmpl('Results are { results ? "ready" : "loading" }', data)
tmpl('Today is { new Date() }', data)
tmpl('{ message.length > 140 && "Message is too long" }', data)
tmpl('This item got { Math.round(rating) } stars', data)
tmpl('<h1>{ title }</h1>{ body }', data)


// Falsy expressions in templates

In templates (as opposed to single expressions) all falsy values
except zero (undefined/null/false) will default to empty string:

tmpl('{ undefined } - { false } - { null } - { 0 }', {})
// will return: " - - - 0"

*/

/*#norm:
  -----------------------------------------------------------------------------
  tmpl.js
*/

// IIFE for tmpl()
var tmpl = (function () {

  var cache = {},           // cache of template getters

    // Invalid Unicode code points (ICH_) used for hide some parts of the expression
    ICH_QSTRING = '\uFFF1',

    // Matches hidden quoted string or regexp markers, $1 capture the index to the item
    // into the hqb array (it is the qstring index in the whole template string, too).
    RE_QSMARKER = /@(\d+)\uFFF1/g,

    // Matches literal strings and regexps
    RE_QBLOCKS = /("[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*')|((?:^|[-\+\*%~^&\|!=><\?:{\(\[,;]|\/\s)\s*)(\/(?!\/)(?:\[[^\]]*\]|\\.|[^/\[\\]+)*\/[igm]*)/g,
                 // $1: string - big regexp but secure and fast!     | $2 matches valid token before regexp      | $3 the regexp

    RE_RMCOMMS = newRegExp(
      RE_QBLOCKS.source +
      '|/\\*[^*]*\\*+(?:[^/*][^*]*\\*+)*/',
      REGLOB
    )


  ////------------------------------------------------------------------------
  //// PUBLIC ENTRY POINT
  ////------------------------------------------------------------------------


  /**
   * Exposed tmpl() function.
   * Build a template (or get it from cache), render with data
   *
   * NOTE: Nested expressions are not supported. Yo don't need escape inner brackets
   *       in expressions, except very specific cases.
   *
   * NOTE: There are only two contexts accesible to the returned function: `this`,
   *       asigned to the 'data' parameter received by tmpl, and the global context
   *       `global` (for node.js) or `window` (on browsers)
   *
   * @private
   */
  function _tmpl(str, data) {

    // by using .call(data,data) there's no need to wrap `this`
    return str && (cache[str] || (cache[str] = _create(str))).call(data, data)

  }
  // end _tmpl() [entry point]


  ////-----------------------------------------------------------------------------------
  //// GETTER CREATION
  ////-----------------------------------------------------------------------------------


  /**
   * Creates a function instance for get a value from the received template string.
   *
   * @param {string} str - The template string, can include zero or more expressions.
   * @return {Function} - An instance of Function with the compiled template.
   * @private
   */
  function _create(str) {

    // Optimize code for str without expressions
    if (str.indexOf(brackets(0)) < 0) {
      str = str.replace(/\r\n?|\n/g, '\n')
      return function () { return str }
    }

    // Now, we can create the function to return by calling the Function constructor.
    // It'll throw an exception if the generated code has errors (i.e. SyntaxError)
    // The parameter `D` is received by _tmpl, which uses it to evaluate the function.

    return new Function('D', 'return ' + _getExpr(str) + ';')
  }
  // end _create()


  /**
   * Creates the code for return the value of the template.
   *
   * @param {string} str - The template string, can include zero or more expressions.
   * @return {string} - Code for the getter body.
   * @private
   */
  function _getExpr(str) {

    // You can drop debugging blocks in your minimized version by using uglify
    // conditional compilation options: `-c -d DEBUG=false`

    /*#if ($DEBUG)
    if (console && console.info) console.info(' in: \'' +
      str.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t') + '\'')
    #end#*/

    // Empty strings never get here. This function is only called from _tmpl,
    // and _tmpl returns falsy values before calling here.

    var
      hqb = [],                     // holds the hidden, literal regexps and strings
      expr,
      i,
      parts = _splitByPairs(
        str.replace(RE_RMCOMMS, function (_, qs, r1, r2) {
          return qs || (r1 + r2) || ' '
        }))                         // splits str into ttext/expressions parts and
                                    // unescape escaped brackets in both

    // By hiding regexps and strings and convert comments here we avoid complications
    // through all the code without affecting the logic.
    // $1: qstring
    // $2: dangling part for regexp
    // $3: regexp

    for (i = 1; i < parts.length; i += 2) {

      parts[i] = parts[i].replace(RE_QBLOCKS, function (match, qstr, prere, regex) {

        if (match.length > 2) {       // comment or non-empty qblock?

          // Replace comment with space or qstring with a marker that includes its
          // original position as an index into the array of replaced qstrings.

          match = (qstr || regex) ?
            (prere || '') + '@' + (hqb.push(regex || match) - 1) + ICH_QSTRING :
            ' '                       // replace comment with a space
        }

        return match
      })
    }

    // Generates the js expression to return a value with the returned function.
    // Single expressions return raw values, template/shorthands returns strings.

    if (parts.length > 2 || parts[0]) {

      var j, list = []

      for (i = j = 0; i < parts.length; ++i) {

        expr = parts[i]

        if (expr && (expr =

              i & 1 ?                           // every odd element is an expression

              _parseExpr(expr, 1, hqb) :         // mode 1 convert falsy values to "",
                                                // except zero

              '"' + expr                        // ttext: convert to js literal string
                .replace(/\r?\n|\r/g, '\\n')    // normalize and preserve EOLs
                .replace(/"/g, '\\"') +         // escape inner double quotes
              '"'                               // enclose double quotes

          )) list[j++] = expr

      }

      expr = j > 1 ?                            // optimize code for 0-1 parts
             '[' + list.join(',') + '].join("")' :
             j ? '""+' + list[0] : '""'

    }
    else {

      expr = _parseExpr(parts[1], 0, hqb)        // single expressions as raw value

    }

    // Restore hidden regexps and strings

    expr = expr.replace(RE_QSMARKER, function (_, pos) {
            return hqb[pos | 0]                 // get original string/regexp by index
              .replace(/\n/g, '\\n')            // escape eol chars, since these
              .replace(/\r/g, '\\r')            // breaks the Function ctor
          })

    /*#if ($DEBUG)
    if (console && console.info) console.info('OUT: ' +
      expr.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t'))
    #end#*/

    return expr

  }
  // end of _getExpr()


  ////-----------------------------------------------------------------------------------
  //// PARSERS
  ////-----------------------------------------------------------------------------------

  /**
   * Splits the received string in its template text and expression parts.
   * Search one by one the next expression in str, and save each result by pairs as
   * `[ttext], [expression]` in the returned array.
   * So, if str have one unique expression, the result is `['', expression]`, for
   * text without expressions, the result is `[ttext]`
   *
   * @param {string} str - The template string with zero or more expressions.
   * @returns {Array}
   * @private
   */
  function _splitByPairs(str) {

    /*
      About inner unescaped (and unbalanced) brackets detection

      Template text is easy: closing brackets are ignored, all we have to do is find
      the first unescaped bracket. The real work is in the expressions...

      Expressions are not so easy. We can already ignore opening brackets, but finding
      the correct closing bracket is tricky.
      Think about literal strings and regexps, they can contain almost any combination
      of characters. We can't deal with these complexity with our regexps, so let's
      hide and ignore these*. From there, all we need is to detect the bracketed parts
      and skip them, as they contains most of common chars used by riot brackets.
      With that, we have a 90% reliability in the detections, although (hope few) some
      custom brackets still requires to be escaped (e.g. `<< x \\>> 1 >>`) :(

      * The template comes with regexps hidden, and haveQBlock hides qstrings here.
    */

    var
      parts = [],                 // holds the resulting parts
      start,                      // start position of current template or expression
      match,                      // reused by both outer and nested searches
      pos,                        // current position (exec() result)
      isexpr,                     // we are in ttext (0) or expression (1)
      eb  = brackets(4),          // regexp, matches current escaped riot brackets
      re  = brackets(5),          // regexp, matches opening bracket
                                  // regexp for riot brackets
      REs = [re, newRegExp(brackets(6) + '|' + RE_QBLOCKS.source, REGLOB)]
                                  // brackets[6] will find the opening brackets
                                  // before the regexps
    start = isexpr = 0

    while (match = re.exec(str)) {

      pos = match.index

      // We are in expression.
      // All brackets inside qblocks, and js braces by pairs, are ignored.
      // This works even if the opening bracket of riot is the same as a js bracket,
      // because we already skipped the first one (that switched to expression mode).

      // $1: optional escape character
      // $2: opening js bracket `{[(`
      // $3: closing riot bracket
      // $4, $5, $6: qblocks

      if (isexpr) {

        if (match[2]) {                         // if we have a js opening bracket

          // Skip bracketed block, pos is shifted by the escape char length
          re.lastIndex = skipBracketedPart(str, match[2], !!match[1] + pos, 1)
          continue
        }

        if (!match[3])
          continue
      }

      // At this point, we expect an _unescaped_ openning bracket in $2 for text mode,
      // or a closing bracket in $3 for expression.

      if (!match[1]) {                          // ignore it if have an escape char

        unescapeStr(str.slice(start, pos))      // push part, even if empty

        start = re.lastIndex                    // next position is the new start
        re = REs[isexpr ^= 1]                   // switch mode and swap regexp
        re.lastIndex = start                    // update the regexp pointer
      }
    }

    if (start < str.length)                     // push remaining part, if we have one
      unescapeStr(str.slice(start))

    return parts

    //// Helpers -----

    /**
     * Unescape escaped brackets and store the qstring in the parts array.
     * `eb` is `/\\?({|})/g`, so `$1` excludes the escape character.
     *
     * @param {string} str - The string to store.
     * @inner
     */
    function unescapeStr(str) {
      parts.push(str && str.replace(eb, '$1'))
    }
    // end unescapeStr()

    /**
     * Find the closing bracket for the current js openning bracket
     *
     * @inner
     */
    function skipBracketedPart(str, opench, chpos) {

      var
        level = 0,
        match,
        recch = newRegExp((
                  opench === '(' ? '(\\(|\\))' :
                  opench === '[' ? '(\\[|\\])' : '({|})'
                  ) + '|' + RE_QBLOCKS.source,
                REGLOB)

      recch.lastIndex = chpos

      while (match = recch.exec(str)) {

        if (match[1]) {
          if (match[1] === opench)
            ++level
          else if (!--level)
            break
        }
      }

      return match ? recch.lastIndex : str.length
    }

  }
  // end _splitByPairs()

  /**
   * @description
   * Parses `{ expression }` or `{ name: expression, ... }`
   *
   * For simplicity, and due to RegExp limitations, riot supports a limited subset (closer
   * to CSS1 that CSS2) of the full w3c/html specs for non-quoted identifiers of shorthand
   * names. This simplified regexp is used for the recognition:
   *
   *   `/-?[_A-Za-z\xA0-\xFF][-\w\xA0-\xFF]`
   *
   * The regexp accept all ISO-8859-1 characters that are valid within an html identifier.
   * The names must begin with one underscore (\x5F), one alphabetic ascii (A-Z, a-z),
   * or one ISO-8859-1 character in the range 160 to 255, optionally prefixed with one
   * dash (\x2D).
   *
   * NOTE: Although you can use Unicode code points beyond \u00FF by quoting the names
   *       (not recommended), only use whitespace as separators since, within names,
   *       riot converts these into spaces.
   *
   * @see {@link http://www.w3.org/TR/CSS21/grammar.html#scanner}
   *      {@link http://www.w3.org/TR/CSS21/syndata.html#tokenization}
   *
   * @param {string} expr
   * @param {number} mode
   * @param {Array} qstr
   * @return {string}
   * @private
   */
  function _parseExpr(expr, mode, qstr) {

    /*
      Convert inner whitespace to compact-spaces and trims the space surrounding the
      expression and various other tokens, mainly brackets and separators.
      We need convert embedded '\r' and '\n' as these chars breaks js code evaluation.
      This replacement is secure, expr already lacks strings, regexp, and comments.

      WARNING:
        Trim and compact is not strictly necessary, but it allows optimized regexps.
        e.g. we can use /:/ instead /\s*:\s*\/
        Many regexps in tmpl code depend on this, so do not touch the next line
        until you know how, and which, regexps are affected.
    */
    expr = expr
          .replace(/\s+/g, ' ')
          .replace(/^ | ?([\(\[{},\?\.:]) ?| $/g, '$1')

    if (!expr) return ''

    // Expression only:   mode == 0 -- nonull == false
    // Text + expression: mode == 1 -- nonull == true

    // Detect class shorthands, csinfo is filled with [qstring-idx, name, expr] els
    var
      csinfo = [],
      cslist

    if (!_extractCSList(expr, csinfo)) {

      // `expr` does not begin with "name:", let's assume js expression.
      // Here, the "mode" parameter itself is significant
      return _wrapExpr(expr, mode)
    }

    // We have a class shorthand list, something that looks like a literal js object, in
    // the format '{ name: expr, ... }', but with HTML/CSS identifiers as names, and its
    // surrounding brackets already removed by the caller.
    // At runtime, the code generated here returns a space-delimited list of the names
    // for those expressions with trueish values.
    // E.g.: `{ show: isOpen(), done: item.done }` --> "show done"

    cslist = csinfo.map(function (kv) {

      // Be carefull, the `name` element can be a hidden quoted string marker. We must
      // check this for replacing the marker with the original string here, 'cause the
      // processing of whitespace and quote chars on names (HTML identifiers) differs
      // to that of the other strings on the expressions (js code).
      // Once replaced, the marker will not be available anymore. This is desired, as
      // well as the restoration of the strings does not overwrite these names.

      if (kv[0])                                // is name a quoted string marker?
        kv[1] = qstr[kv[0] | 0]                 // retrieve string by index
          .slice(1, -1)                         //  and unquote it
          .replace(/\s+/g, ' ').trim()          // compact whitespace between names

      return '(' +                              // wrap all parts to ignore errors.
          _wrapExpr(kv[2], 0) +                  // use raw mode
          ')?"'  + kv[1]  + '":""'              // all error/falsy values returns ""

    })

    return cslist.length < 2 ?                  // optimize 'one element' cases
       cslist[0] :
      '[' + cslist.join(',') + '].join(" ").trim()'

  }
  // end _parseExpr()


  // Matches the `name:` part of a class shorthand
  var CSNAME_PART = newRegExp(
        '^(' +                            // always at 0, we are searching rightContext
        RE_QSMARKER.source +              // $1: qstring marker + $2: str index, or...
        '|-?[_A-Za-z][-\\w]*' +           // $1: literal indentifier
        '):'                              // skip colon, expression follows
      )

  /**
   * Helper function for _parseExpr()
   * If `str` is a shorthand list, return an array with its parts, or falsy if is not.
   * This function cares about nested commas.
   *
   * @param {string} str
   * @param {Array} list
   * @return {number} - Count of shorthands, zero if str is not a shorthand list
   * @private
   */
  function _extractCSList(str, list) {

    var
      re = /,|([\[{\(])|$/g,    // matches comma or openning brace, $1: js bracket
      GRE = RegExp,             // the global RegExp object
      match,                    // CSNAME_PART results
      end,                      // CSPART_END results
      ch,                       // js bracket, or empty for comma or end of str
      n = 0                     // count of extracted shorthands

    // Try to match the first name testing `match !== null && match.index === 0`

    while (str &&                               // search in the ramaining substring
          (match = str.match(CSNAME_PART)) &&   // null matches or
          !match.index                          // index > 0 means error
      ) {

      str = GRE.rightContext                    // skip the `name:` part
      re.lastIndex = 0

      // Search the next comma, outside brackets, or the end of str.
      // If js bracket is found ($1), skip the bracketed part.

      while ((end = re.exec(str)) && (ch = end[1])) {

        var
          rr = ch === '(' ? /[\(\)]/g : ch === '[' ? /[\[\]]/g : /[{}]/g,
          lv = 1,
          mm

        rr.lastIndex = end.index + 1            // skip opench

        while (lv && (mm = rr.exec(str))) {
          mm[0] === ch ? ++lv : --lv
        }

        re.lastIndex = lv ? str.length : rr.lastIndex
      }

      // match still valid, push...
      list[n++] = [
          match[2],                             // 0: hidden qstring index
          match[1],                             // 1: unquoted name
          str.slice(0, end.index)               // 2: expression
        ]

      str = GRE.rightContext
    }

    return n

  }
  // end _extractCSList()


  ////-----------------------------------------------------------------------------------
  //// WRAPPERS
  ////-----------------------------------------------------------------------------------

  var
    // String for context detection
    VAR_CONTEXT = '"in D?D:' + (typeof window === 'object' ? 'window' : 'global') + ').',

    // String for RegExp, matches var names (ASCII only)
    SRE_VARNAME = '[$_A-Za-z][$\\w]*',

    // Matches a var name alone. Used by _wrapExpr with successive string.match
    // Note:  We are using negative lookahead to exclude properties without capture, so
    //        it works fine with test() or match(). Gotcha is that we are left with a
    //        dangling character in $1. prefixVar() returns it to the str.
    // base: /(^\s*|[^$\w\.])(?!(?:typeof|in|instanceof|void|true|new|function)[^$\w])([$_A-Za-z][$\w]*)/
    JS_VARSTART = newRegExp(
        '(^ *|[^$\\w\\.])' +              // $1: non var name nor dot char. dot|name follows?
        '(?!(?:typeof|in|instanceof|void|new|function)[^$\\w]|true(?:[^$\\w]|$))' +
                                          // negative lookahead, fail the match on some js keywords
        '(' + SRE_VARNAME + ')'           // $2: var name or falsy primitive (JS_FALY)
      ),

    // Matches key names of literal objects
    JS_OBJKEYS = newRegExp(
        '(?=[,{]'   +                     // lookehead for start or separator of k:v pair
        SRE_VARNAME +                     // match a name, but only capture in...
        ':)(.)',                          // $1: the bracket or separator
        REGLOB                            // needed, this is for replace()
      )

  /**
   * Generates js code to get an expression value, wrapped in a try..finally block
   * to avoid break on errors or undefined vars.
   * The generated code will be inserted in an array, returned by _parseExpr()
   *
   * @param {string} expr
   * @param {bool} asText
   * @private
   */
  function _wrapExpr(expr, asText) {

    var okeys = ~expr.indexOf('{')
    if (okeys)                              // prefix '0' avoids confuse w/var names
      expr = expr.replace(JS_OBJKEYS, '$1\uFFF30')

    var match = expr.match(JS_VARSTART)
    if (match) {

      var
        ss = [],
        mvar,
        wrap = 0,
        GRE = RegExp

      do {

        // string.match() with regexp without the global flag returns submatches
        // $1: character not part of the var name, must be pushed before wrap
        // $2: var name
                                            // save left context and dangling part
        ss.push(GRE.leftContext + (match[1] || ''))
        expr = GRE.rightContext             // to be processed later
        mvar = match[2]

        // In Chrome, [].indexOf is faster than `v in object` or regexps searches

        if (~['undefined', 'false', 'null', 'NaN'].indexOf(mvar))
          ss.push(asText ? '""' : mvar)     // mode 1 (text) returns ''

        else {
          ss.push(~['this', 'window', 'global'].indexOf(mvar) ?
            mvar : '("' + mvar + VAR_CONTEXT + mvar)

          wrap = wrap || asText || /^[\[\(\.]/.test(expr)
        }

      } while (match = expr.match(JS_VARSTART))

      expr = (ss.join('') + expr).trim()

      if (wrap) {
        expr = '(function(D,v){try{v=' + expr +
               '}catch(e){e}return ' + (asText ? 'v||v===0?v:""' : 'v') + '}).call(D,D)'
      }
    }
    // end _wrapExpr()

    return okeys ? expr.replace(/\uFFF30/g, '') : expr

  }

  //_tmpl.getCode = _getExpr

  return _tmpl

})()
// end of IIFE for tmpl
