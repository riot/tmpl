
/*#norm:
  -----------------------------------------------------------------------------
  riot-tmpl/lib/brackets.js
*/

// IIFE
var brackets = (function (defaults) {

  // Cache on closure, initialized on first use and on bracket changes

  var cachedBrackets,       // full brackets string in use, for change detection
      pairs                 // cache for raw and escaped brackets and regexps

  /**
   * Recreate the cache for the current brackets
   *
   * @param {string} s - new brackets pair
   * @inner
   */
  function updateCache(s) {
    cachedBrackets = s

    // Save the new unescaped/escaped brackets pairs (only escape chars that require it,
    // backslash that is not part of a replacement string token is a literal backslash)

    pairs = s.split(' ')
            .concat(s.replace(/(?=[$\.\?\+\*\[\(\)\|^\\])/g, '\\').split(' '))

    // test if has an expression
    pairs[4] = brackets(pairs[1].length > 1 ? /{.*}/ : /{[^}]*}/)
    // for lib/browser/tag/each.js/loopkeys
    pairs[5] = brackets(/^\s*({)\s*(([$\w]+)(?:\s*,\s*([$\w]+))?\s+in\s+([^\s]+?\s*}))\s*$/)
    // match one escaped bracket
    pairs[6] = brackets(/\\({|})/g)

    // loopKeys() must use this code:
    // var els = expr.match(brackets(6))
    // return els ? { key: els[2], pos: els[3], val: els[1] + els[4] } : { val: expr }

    // [5][6] is for both bracket sequences. [6] matches opening js brackets too, to
    // provide unescaped insertion of these characters in expressions.

    // Why this? We use this two regexps in _splitByPairs and swap them in mode changes.
    // We must deal with lastIndex reassignments in addition of change regexp itself,
    // but it is simple and, contrary to what seems, is more efficient.
    s = '(\\\\?)('                        // an optional escape char

    // base: /(\\?)({)/g
    pairs[7] = newRegExp(s + pairs[2] + ')', REGLOB)

    // base: /(\\?)(?:([{\[\(])|(}))/g
    pairs[8] = s           +              // $1: opt escape char, start lookahead for
        '?:([{\\[\\(])|('  +              // $2: open js bracket, first
          pairs[3]         +              // $3: riot closing bracket
        '))'
  }
  // end of updateCache()

  /**
   * Exposed brackets() function, for track bracket changes.
   *
   * @param {number|RegExp} reOrIdx - number 0..6 for getting information of current
   *    current brackets, or regexp for convertion based on custom brackets.
   * @returns {string|RegExp}
   *    If param is a number, returns...
   *      0,1 - the current left (0) or right (1) brackets characters
   *      2,3 - the current left (2) or right (3) escaped brackets characters
   *        4 - regexp for test if string has an expression
   *        5 - regexp for each.js/loopkeys
   *        6 - regexp based on /\\({|})/g, matches one escaped bracket
   *    If param is a RegExp...
   *      if the current brackets are the defaults, returns the original regexp, else
   *      returns a new regexp with the default brackets replaced by the custom ones.
   *      WARNING: new custom regexp discards the /i and /m flags.
   * @private
   */
  return function _brackets(reOrIdx) {
                                                  // make sure we use the current setting
    var s = riot ? riot.settings.brackets || defaults : defaults

    if (cachedBrackets !== s) updateCache(s)      // recreate the cache if needed

    if (reOrIdx instanceof RegExp) {              // for regexp...

      return s === defaults ?                     // if the current brackets are the
        reOrIdx :                                 // defaults, returns regexp as-is

        // Rewrite regexp with the default brackets replaced with the custom ones.
        // Let the user choose whether to double escape characters.
        newRegExp(
          reOrIdx.source.replace(/[{}]/g, function (b) { return pairs[(b === '}') + 2] }),
          reOrIdx.global ? REGLOB : ''
        )
    }

    // `reOrIdx` is not a regexp, assume it is an index to the desired cached element
    return pairs[reOrIdx]

  }
  // end of _brackets() [entry point]

})('{ }')
// end of IIFE for brackets
