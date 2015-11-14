/**
 * @module brackets
 *
 * `brackets         ` Returns a string or regex based on its parameter
 * `brackets.settings` Mirrors the `riot.settings` object
 * `brackets.set     ` The recommended option to change the current tiot brackets
 */

//#set $_RIX_TEST  = 4
//#set $_RIX_ESC   = 5
//#set $_RIX_OPEN  = 6
//#set $_RIX_CLOSE = 7
//#set $_RIX_PAIR  = 8
//#set $_RIX_LOOP  = 9
//#ifndef $_RIX_TEST
var
  $_RIX_TEST  = 4,  // DONT'T FORGET SYNC THE #set BLOCK!!!
  $_RIX_ESC   = 5,
  $_RIX_OPEN  = 6,
  $_RIX_CLOSE = 7,
  $_RIX_PAIR  = 8,
  $_RIX_LOOP  = 9
//#endif

var brackets = (function (UNDEF) {

  // Closure data
  // --------------------------------------------------------------------------
  var
    REGLOB  = 'g',

  // `MLCOMMS` - Multiline comments in almost all their forms<br>
  // `STRINGS` - Quoted strings. Don't care about inner eols<br>

    MLCOMMS = /\/\*[^*]*\*+(?:[^*\/][^*]*\*+)*\//g,
    STRINGS = /"[^"\\]*(?:\\[\S\s][^"\\]*)*"|'[^'\\]*(?:\\[\S\s][^'\\]*)*'/g,

  // `S_QBSRC` - `STRINGS` combined with regex sources matching division operators
  // and literal regexes, for use with the RegExp ctor.
  // The resulting regex captures in `$1` and `$2` a single slash, depending if it
  // matches a division operator ($1) or a regex ($2).

    S_QBSRC = STRINGS.source + '|' +
      /(?:[$\w\)\]]|\+\+|--)\s*(\/)(?![*\/])/.source + '|' +
      /\/(?=[^*\/])[^[\/\\]*(?:(?:\[(?:\\.|[^\]\\]*)*\]|\\.)[^[\/\\]*)*?(\/)[gim]*/.source,

  // The predefined riot brackets
    DEFAULT = '{ }',

  // Regexes for matching JavaScript brackets out of quoted strings and regexes.
  // These are heavy, but their performance is acceptable.

    FINDBRACES = {
      '(': _regExp('([()])|'   + S_QBSRC, REGLOB),
      '[': _regExp('([[\\]])|' + S_QBSRC, REGLOB),
      '{': _regExp('([{}])|'   + S_QBSRC, REGLOB)
    }

  // Variable information about the current brackets state, initialized on first use
  // and on bracket changes.
  var
    cachedBrackets = UNDEF,       // full brackets string in use, for change detection
    //#if LOCK_SUPPORT
    _lock,                        // lock to this brackets if not empty
    //#endif
    _regex,                       // for regex convertion of default brackets
    _pairs = []                   // pre-made string and regexes for current brackets

  // Private functions
  // --------------------------------------------------------------------------

  /**
   * Simply wrapper for `new RegExp()`, easy typing and less bytes with minifiers.
   * @param   {string} source  - String with the source of the regex
   * @param   {string} [flags] - One or more of (g)lobal, (m)ultiline, (i)gnore-case
   * @returns {RegExp} - Instance of a RegExp based on the received parameters
   * @private
   */
  function _regExp(source, flags) { return new RegExp(source, flags) }

  /**
   * Dummy function, returns the same regex
   * @param   {RegExp} re RegExp instance
   * @returns {RegExp}    The same regex
   */
  function _loopback(re) { return re }

  /**
   * Rewrite regex with the default brackets replaced with the custom ones.
   * @param   {RegExp} re - RegExp with the default riot brackets
   * @param   {Array}  bp - Custom brackets to replace with
   * @returns {RegExp} - The new regex with the default brackets replaced.
   * @private
   */
  function _rewrite(re) {
    return new RegExp(
      re.source.replace(/{/g, _pairs[2]).replace(/}/g, _pairs[3]), re.global ? REGLOB : ''
    )
  }

  /**
   * Resets the _pairs array with strings and regexes based on its parameter.
   * @param {string} pair - String with the brackets pair to set
   * @private
   */
  function _reset(pair) {
    pair = pair || DEFAULT
    //#if LOCK_SUPPORT
    // check lock first
    if (_lock && _lock !== pair)
      throw new Error('brackets was locked on "' + _lock + '"')
    //#endif

    if (pair !== _pairs[$_RIX_PAIR]) {
      var bp = pair.split(' ')

      if (pair === DEFAULT) {
        _pairs = bp.concat(bp)
        _regex = _loopback
      }
      else {
        if (bp.length !== 2 || /[\x00-\x1F<>a-zA-Z0-9'",;\\]/.test(pair)) {
          throw new Error('Unsupported brackets "' + pair + '"')
        }
        _pairs = bp.concat(pair.replace(/(?=[[\]()*+?.^$|])/g, '\\').split(' '))
        _regex = _rewrite
      }
      _pairs[$_RIX_TEST] = _regex(_pairs[1].length > 1 ? /(?:^|[^\\]){[\S\s]*?}/ : /(?:^|[^\\]){[^}]*}/)
      _pairs[$_RIX_ESC] = _regex(/\\({|})/g)
      _pairs[$_RIX_OPEN] = _regex(/(\\?)({)/g)    // for _split()
      _pairs[$_RIX_CLOSE] = _regExp('(\\\\?)(?:([[({])|(' + _pairs[3] + '))|' + S_QBSRC, REGLOB)
      _pairs[$_RIX_LOOP] = _regex(/^\s*{\^?\s*([$\w]+)(?:\s*,\s*(\S+))?\s+in\s+(\S+)\s*}/)
      _pairs[$_RIX_PAIR] = pair
    }
    _brackets.settings.brackets = cachedBrackets = pair  // always set these
  }

  // "Exported" functions
  // --------------------------------------------------------------------------

  /**
   * The main function.<br>
   * With a numeric parameter, returns the current left (0) or right (1) brackets
   * characters.
   * With a regex, returns the original regex if the current brackets are the defaults,
   * or a new one with the default brackets replaced by the current custom brackets.
   * @param   {RegExp|number} reOrIdx - As noted above
   * @returns {RegExp|string} - Based on the received parameter
   */
  function _brackets(reOrIdx) {
    _reset(_brackets.settings.brackets)
    return reOrIdx instanceof RegExp ? _regex(reOrIdx) : _pairs[reOrIdx]
  }

  /**
   * Splits the received string in its template text and expression parts using
   * balanced brackets detection to avoid require escaped brackets from users.<br>
   * For internal use by tmpl and the riot-compiler.
   * @param   {string} str    - Template source to split, can be one expression
   * @param   {number} [tmpl] - 1 if called from tmpl()
   * @returns {Array} - Array containing alternate template text and expressions.
   *   If str was one unique expression, returns two elements: ["", expression].
   */
  _brackets.split = function split(str, tmpl) {

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
    var
      parts = [],                 // holds the resulting parts
      match,                      // reused by both outer and nested searches
      isexpr,                     // we are in ttext (0) or expression (1)
      start,                      // start position of current template or expression
      pos,                        // current position (exec() result)
      re = _brackets($_RIX_OPEN)  // start with *updated* opening bracket

    isexpr = start = re.lastIndex = 0       // re is reused, we must reset lastIndex

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
        re = _pairs[$_RIX_OPEN + (isexpr ^= 1)] // switch mode and swap regexp
        re.lastIndex = start                // update the regex pointer
      }
    }

    if (str && start < str.length) {        // push remaining part, if we have one
      unescapeStr(str.slice(start))
    }

    return parts

    // Inner Helpers for _split() -----

    // Store the string in the array `parts`.
    // Unescape escaped brackets from expressions and, if we are called from
    // tmpl, from the HTML part too.
    function unescapeStr(str) {
      if (tmpl || isexpr)
        parts.push(str && str.replace(_pairs[$_RIX_ESC], '$1'))
      else
        parts.push(str)
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

  _brackets.hasExpr = function hasExpr(str) {
    return _brackets($_RIX_TEST).test(str)
  }

  _brackets.loopKeys = function loopKeys(expr) {
    var m = expr.match(_brackets($_RIX_LOOP))
    return m ?
      { key: m[1], pos: m[2], val: _pairs[0] + m[3] + _pairs[1] } : { val: expr.trim() }
  }

  //#if LOCK_SUPPORT
  /**
   * Lock or unlock the current brackets (internal use).
   * NOTE: Not implemented yet, test bracket changes is complicated.
   *
   * @param  {boolean} lock - `false` to unlock, any other value locks
   */
  _brackets.lock = function lock(lock) {
    _lock = lock === false ? '' : cachedBrackets
  }
  //#endif

  /**
   * Returns an array with brackets information, defaults to the current brackets.
   * WARNIG: This function is for internal use, can returns a shared array.
   *
   * @param   {string} [pair] - If used, set the current brackets to this pair
   * @param   {number} [lock] - 1 to lock the brackets
   * @returns {Array} - Brackets array in internal format
   */
  _brackets.array = function array(pair) {
    _reset(pair || _brackets.settings.brackets)   // fix #1314
    return _pairs
  }

  // Inmediate execution
  // --------------------------------------------------------------------------

  // Mirrors the `riot.settings`, you can assign this if riot is not in context
  /* istanbul ignore next: in the node version riot is not in the scope */
  _brackets.settings = typeof riot !== 'undefined' && riot.settings || {}
  _brackets.set = _reset                // or better use this

  // Public properties, shared with `tmpl` and/or the riot compiler
  _brackets.R_STRINGS = STRINGS
  _brackets.R_MLCOMMS = MLCOMMS
  _brackets.S_QBLOCKS = S_QBSRC

  _reset(_brackets.settings.brackets)   // set the initial state

  return _brackets

})()
