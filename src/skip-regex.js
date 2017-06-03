/*
  Regex detection.
  From: https://github.com/riot/parser/blob/master/src/skip-regex.js
*/

//#if 0
/* eslint no-unused-vars: [2, {args: "after-used", varsIgnorePattern: "^skipRegex"}] */
//#endif
var skipRegex = (function () {

  // safe characters to precced a regex (including `=>`, `**`, and `...`)
  var beforeReChars = '[{(,;:?=|&!^~>%*/'

  // keyword that can preceed a regex (`in` is handled as special case)
  var beforeReWords = [
    'case',
    'default',
    'do',
    'else',
    'in',
    'instanceof',
    'prefix',
    'return',
    'typeof',
    'void',
    'yield'
  ]

  var beforeWordChars = beforeReWords.reduce(function (s, w) {
    return s + w.slice(-1)
  }, '')

  // The string to test can't include line-endings
  var RE_REGEX = /^\/(?=[^*>/])[^[/\\]*(?:\\.|(?:\[(?:\\.|[^\]\\]*)*\])[^[\\/]*)*?\/[gimuy]*/
  var RE_VARCHAR = /[$\w]/

  // Searches the position of the previous non-blank character inside `code`,
  // starting with `pos - 1`.
  function prev (code, pos) {
    while (--pos >= 0 && /\s/.test(code[pos]));
    return pos
  }

  /**
   * Check if the code in the `start` position can be a regex.
   *
   * @param   {string} code  - Buffer to test in
   * @param   {number} start - Position the first slash inside `code`
   * @returns {number} position of the char following the regex.
   */
  function _skipRegex (code, start) {

    // `exec()` will extract from the slash to the end of line and the
    // chained `match()` will match the possible regex.
    var re = /.*/g
    var pos = re.lastIndex = start++
    var match = re.exec(code)[0].match(RE_REGEX)

    if (match) {
      var next = pos + match[0].length  // result is not from `re.exec`

      pos = prev(code, pos)
      var c = code[pos]

      // start of buffer or safe prefix?
      if (pos < 0 || ~beforeReChars.indexOf(c)) {
        return next
      }

      // from here, `pos` is >= 0 and `c` is code[pos]
      // is-tanbul ignore next: This is for ES6
      if (c === '.') {
        // can be `...` or something silly like 5./2
        if (code[pos - 1] === '.') {
          start = next
        }

      } else if (c === '+' || c === '-') {
        // tricky case, with a sigle + or -  operator
        if (code[--pos] !== c ||              // single operator, always regex
            (pos = prev(code, pos)) < 0 ||    // no previous token, always regex
            !RE_VARCHAR.test(code[pos])) {    // previous token can't be a JS var or number
          start = next
        }

      } else if (~beforeWordChars.indexOf(c)) {
        // keyword?
        ++pos
        for (var i = 0; i < beforeReWords.length; i++) {
          var kw = beforeReWords[i]
          var nn = pos - kw.length

          if (nn >= 0 && code.slice(nn, pos) === kw && !RE_VARCHAR.test(code[nn - 1])) {
            start = next
            break
          }
        }
      }
    }

    return start
  }

  return _skipRegex

})()
