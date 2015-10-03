// Shared regexes
// ==============

// For precompiled expressions

//#define $_PCE_TEST  /{#\d+#}/
//#define $_PCE_ALONE /^{(#\d+)#}$/
//#define $_PCE_REPL  /{(#\d+)#}/g
//#define $_PCE_LOOP  /^([$\w]+),([^,]*),({#\d+#})/
//#define $_E_NUMBER  '{#01#}'
//#define $_E_UNDEF   '{#00#}'

// regEx main purpose is to avoid redundancy
var regEx = (function () {

  var _re = function _regEx(source, flags) { return new RegExp(source, flags) }

  //#if !PURE_PCEXPR

  // For runtime compilation

  // `MLCOMMS` - Multiline comments in almost all their forms<br>
  // `STRINGS` - Quoted strings. Don't care about inner eols<br>
  // `S_QBSRC` - `STRINGS + DIVISOR + REGEXES` source, for the RegExp constructor

  _re.MLCOMMS = /\/\*[^*]*\*+(?:[^*\/][^*]*\*+)*\//g
  _re.STRINGS = /"[^"\\]*(?:\\[\S\s][^"\\]*)*"|'[^'\\]*(?:\\[\S\s][^'\\]*)*'/g

  // Private regexes, for use in combination with STRINGS:
  // `DIVISOR` - Division operator, for exclusion ($1: slash)<br>
  // `REGEXES` - Matches Literal regexes ($1: slash)

  var
    DIVISOR = /(?:[$\w\)\]]|\+\+|--)\s*(\/)(?![*\/])/,
    REGEXES = /\/(?=[^*\/])[^[\/\\]*(?:(?:\[(?:\\.|[^\]\\]*)*\]|\\.)[^[\/\\]*)*?(\/)[gim]*/

  // When dealing with comments, `S_QBSRC` needs to be combined with regexes
  // for exclusion of multiline and single-line comments (`MLCOMMS` is one).

  _re.S_QBSRC = _re.STRINGS.source + '|' +
                    DIVISOR.source + '|' +  // $1: division operator
                    REGEXES.source          // $2: slash

  // For the riot-compiler
  _re.PCE_TEST = $_PCE_TEST                 // test precompiled expression
  _re.E_NUMBER = $_E_NUMBER                 // id for the string "number"

  //#endif

  return _re

})()
