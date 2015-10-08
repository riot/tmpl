// Brackets Management
// ===================

// The brackets function returns a string or regex based on the current or internal
// riot brackets.
// WARNING: recreated regexes discards the `/i` and `/m` flags.

//#define $_RIX_TEST  4
//#define $_RIX_ESC   5
//#define $_RIX_LOOP  6
//#define $_RIX_OPEN  7
//#define $_RIX_CLOSE 8
//#define $_RIX_PAIR  9

//#ifndef $_RIX_TEST
  // DONT'T FORGET MODIFY THE #defines TOO!!!
var
  $_RIX_TEST  = 4,
  $_RIX_ESC   = 5,
  $_RIX_LOOP  = 6,
  $_RIX_OPEN  = 7,
  $_RIX_CLOSE = 8,
  $_RIX_PAIR  = 9
//#endif

var brackets = (function () {

  // We use the closure to store information about the current brackets
  // and two arrays, `_bp` with static strings and predefined regexes for
  // the default riot brackets, and `_pairs` for the custom user brackets.
  // This cache is initialized on first use and on bracket changes.

  var
    cachedBrackets = '',    // full brackets string in use, for change detection
    _regex,                 // for regex convertion of default brackets
    _pairs,                 // cache for custom brackets and regexes
    _bp = [                 // eslint-disable-line no-redeclare
      '{', '}',
      '{', '}',
      /{[^}]*}/,            // 4: search for expression - NOTE: don't use '\{'
      /\\({|})/g,           // 5: matches escaped brackets
      /^\s*{\^?\s*([$\w]+)(?:\s*,\s*(\S+))?\s+in\s+(\S+)\s*}/, // 6: for tmpl.loopKeys
      /(\\?)({)/g           // 7: for _split(), matches openning bracket
    ],
    REGLOB = 'g'

  // Rewrite regex with the default brackets replaced with the custom ones.
  function reWrite(r, p) {
    return new RegExp(
      r.source.replace(/{/g, p[2]).replace(/}/g, p[3]), r.global ? REGLOB : ''
    )
  }

  // Finish the array with a regex, used by `_slipt`, which matches closing brackets.
  function bFinish(b) {
    b[$_RIX_CLOSE] = regEx('(\\\\?)(?:([[({])|(' + b[3] + '))|' + regEx.S_QBSRC, REGLOB)
  }

  // Initialize _pairs to the defaults, using a passthrough for regex convertion
  _regex = _bp._re = function (r) { return r }
  _pairs = _bp
  bFinish(_bp)

  // Regexes for matching JavaScript brackets and quoted strings
  var FINDBRACES = {
    '(': regEx('([()])|'   + regEx.S_QBSRC, REGLOB),
    '[': regEx('([[\\]])|' + regEx.S_QBSRC, REGLOB),
    '{': regEx('([{}])|'   + regEx.S_QBSRC, REGLOB)
  }

  // Splits the received string in its template text and expression parts
  // using unbalanced brackets detection.
  function _split(str, bp) {

    // Template text is easy: closing brackets are ignored, all we have to do is find
    // the first unescaped bracket. The real work is with the expressions...
    //
    // Expressions are not so easy. We can already ignore opening brackets, but finding
    // the correct closing bracket is tricky.
    // Strings and regexes can contain almost any combination of characters and we
    // can't deal with these complexity with our regexes, so let's hide and ignore
    // these. From there, all we need is to detect the bracketed parts and skip
    // them, as they contains most of the common characters used by riot brackets.
    // With that, we have a 90% reliability in the detection, although (hope few) some
    // custom brackets still requires to be escaped.

    if (!bp) bp = _pairs          // defaults to the current custom brackets
    var
      parts = [],                 // holds the resulting parts
      match,                      // reused by both outer and nested searches
      isexpr,                     // we are in ttext (0) or expression (1)
      start,                      // start position of current template or expression
      pos,                        // current position (exec() result)
      re = bp[$_RIX_OPEN]         // start with opening bracket

    isexpr = start = 0

    while (match = re.exec(str)) {

      pos = match.index

      if (isexpr) {
        // $1: optional escape character,
        // $2: opening js bracket `{[(`,
        // $3: closing riot bracket,
        // $4 & $5: qblocks

        if (match[2]) {                     // if have a javascript opening bracket,
          re.lastIndex = skipBraces(match[2], re.lastIndex)
          continue                          // skip the bracketed block and loop
        }

        if (!match[3])                      // if don't have a closing bracket
          continue                          // search again
      }

      // At this point, we expect an _unescaped_ openning bracket in $2 for text,
      // or a closing bracket in $3 for expression.

      if (!match[1]) {                      // ignore it if have an escape char
        unescapeStr(str.slice(start, pos))  // push part, even if empty
        start = re.lastIndex                // next position is the new start
        re = bp[$_RIX_OPEN + (isexpr ^= 1)] // switch mode and swap regexp
        re.lastIndex = start                // update the regex pointer
      }
    }

    if (str && start < str.length) {        // push remaining part, if we have one
      unescapeStr(str.slice(start))
    }

    return parts

    // Inner Helpers for _split()

    // Unescape escaped brackets and store the string in the array `parts`.
    function unescapeStr(str) {
      parts.push(str && str.replace(bp[$_RIX_ESC], '$1'))
    }

    // Find the js closing bracket for the current block.
    // Skips strings, regexes, and other inner blocks.
    function skipBraces(ch, pos) {
      var
        match,
        recch = FINDBRACES[ch],
        level = 1
      recch.lastIndex = pos

      while (match = recch.exec(str)) {
        if (match[1] &&
          !(match[1] === ch ? ++level : --level)) break
      }
      return match ? recch.lastIndex : str.length
    }
  }

  // Creates an array with strings and premaked regexes.
  // For default or empty brackets, uses the original `_bp` array.
  function _create(pair) {
    var bp = _bp

    if (pair && pair !== '{ }') {
      // Save the new unescaped/escaped pairs
      bp = pair.split(' ')
      if (bp.length !== 2 || /[\x00-\x1F<>a-zA-Z0-9'",;\\]/.test(pair)) {
        throw new Error('Unsupported brackets "' + pair + '"')
      }
      bp = bp.concat(pair.replace(/(?=[[\]()*+?.^$|])/g, '\\').split(' '))
      bp[$_RIX_TEST] = reWrite(bp[1].length > 1 ? /{.*?}/ : _bp[$_RIX_TEST], bp)
      bp[$_RIX_ESC] = reWrite(_bp[$_RIX_ESC], bp)
      bp[$_RIX_LOOP] = reWrite(_bp[$_RIX_LOOP], bp)
      bp[$_RIX_OPEN] = reWrite(_bp[$_RIX_OPEN], bp)
      bFinish(bp)
    }
    return bp
  }

  // The array function for internal use, defaults to the current brackets
  function _array(pair) {
    return pair ? _create(pair) : _pairs
  }

  // Set the brackets to the given string
  function _set(pair) {
    if (cachedBrackets !== pair) {
      _pairs = _create(pair)
      _regex = _pairs._re || reWrite  // only `_bp` has the _re property
      _brackets.settings.brackets = cachedBrackets = pair
    }
    //#if DEBUG
    if (arguments.length > 1)
      console.log('--- DEBUG riot.settings object: ' + JSON.stringify(riot.settings))
    //#endif
  }

  // With a numeric parameter, brackets() returns
  // the current left (0) or right (1) brackets characters,
  // the current left (2) or right (3) _escaped_ brackets characters,
  // or a regex matching an expression with default or custom brackets (4).
  //
  // With a regex, returns the original regex if the current brackets are the defaults,
  // or a new one with the default brackets replaced by the current custom brackets.

  function _brackets(reOrIdx) {
    _set(_brackets.settings.brackets)
    return reOrIdx instanceof RegExp ? _regex(reOrIdx, _pairs) : _pairs[reOrIdx]
  }

  // For use by *riot only*, plase don't depend on this functions.
  _brackets.array = _array            // read-only array data
  _brackets.split = _split

  // Mirrors the riot.settings, you can assign this if riot is not in context
  _brackets.settings = typeof riot !== 'undefined' && riot.settings || {}
  _brackets.set = _set                // or better, use this function

  _brackets.E_NUMBER = '{#@001#}'     // shared by tmpl & compiler

  return _brackets

})()
