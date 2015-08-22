/* Riot WIP, @license MIT, (c) 2015 Muut Inc. + contributors */
;(function (window, undefined) {

//// tmpl/utils.js

var REGLOB = 'g'

function newRegExp(restr, opts) {

  return new RegExp(restr, opts)

}

/*
  -----------------------------------------------------------------------------
  brackets.js
*/

var brackets = (function (defaults) {

  var cachedBrackets,
      pairs

  function updateCache(s) {
    cachedBrackets = s

    pairs = s.split(' ')
            .concat(s.replace(/(?=[$\.\?\+\*\[\(\)\|^\\])/g, '\\').split(' '))

    pairs[4] = brackets(pairs[1].length > 1 ? /{.*}/ : /{[^}]*}/)

    pairs[5] = brackets(/^\s*({)\s*(([$\w]+)(?:\s*,\s*([$\w]+))?\s+in\s+([^\s]+?\s*}))\s*$/)

    pairs[6] = brackets(/\\({|})/g)

    s = '(\\\\?)('

    pairs[7] = newRegExp(s + pairs[2] + ')', REGLOB)

    pairs[8] = s           +
        '?:([{\\[\\(])|('  +
          pairs[3]         +
        '))'
  }

  return function _brackets(reOrIdx) {

    var s = riot ? riot.settings.brackets || defaults : defaults

    if (cachedBrackets !== s) updateCache(s)

    if (reOrIdx instanceof RegExp) {

      return s === defaults ?
        reOrIdx :

        newRegExp(
          reOrIdx.source.replace(/[{}]/g, function (b) { return pairs[(b === '}') + 2] }),
          reOrIdx.global ? REGLOB : ''
        )
    }

    return pairs[reOrIdx]

  }

})('{ }')

/*
  -----------------------------------------------------------------------------
  tmpl.js
*/

var tmpl = (function () {

  var cache = {},

    ICH_QSTRING = '\uFFF1',

    RE_QSMARKER = /@(\d+)\uFFF1/g,

    RE_QBLOCKS = /("[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*')|((?:^|[-\+\*%~^&\|!=><\?:{\(\[,;]|\/\s)\s*)(\/(?!\/)(?:\[[^\]]*\]|\\.|[^/\[\\]+)*\/[igm]*)/g,

    RE_RMCOMMS = newRegExp(
      RE_QBLOCKS.source +
      '|/\\*[^*]*\\*+(?:[^/*][^*]*\\*+)*/',
      REGLOB
    )

  function _tmpl(str, data) {

    return str && (cache[str] || (cache[str] = _create(str))).call(data, data)

  }

  function _create(str) {

    if (str.indexOf(brackets(0)) < 0) {
      str = str.replace(/\r\n?|\n/g, '\n')
      return function () { return str }
    }

    return new Function('D', 'return ' + _getExpr(str) + ';')
  }

  function _getExpr(str) {

    var
      hqb = [],
      expr,
      i,
      parts = _splitByPairs(
        str.replace(RE_RMCOMMS, function (_, qs, r1, r2) {
          return qs || (r1 + r2) || ' '
        }))

    for (i = 1; i < parts.length; i += 2) {

      parts[i] = parts[i].replace(RE_QBLOCKS, function (match, qstr, prere, regex) {

        if (match.length > 2) {

          match = (qstr || regex) ?
            (prere || '') + '@' + (hqb.push(regex || match) - 1) + ICH_QSTRING :
            ' '
        }

        return match
      })
    }

    if (parts.length > 2 || parts[0]) {

      var j, list = []

      for (i = j = 0; i < parts.length; ++i) {

        expr = parts[i]

        if (expr && (expr =

              i & 1 ?

              _parseExpr(expr, 1, hqb) :

              '"' + expr
                .replace(/\r?\n|\r/g, '\\n')
                .replace(/"/g, '\\"') +
              '"'

          )) list[j++] = expr

      }

      expr = j > 1 ?
             '[' + list.join(',') + '].join("")' :
             j ? '""+' + list[0] : '""'

    }
    else {

      expr = _parseExpr(parts[1], 0, hqb)

    }

    expr = expr.replace(RE_QSMARKER, function (_, pos) {
            return hqb[pos | 0]
              .replace(/\n/g, '\\n')
              .replace(/\r/g, '\\r')
          })

    return expr

  }

  function _splitByPairs(str) {

    var
      parts = [],
      start,
      match,
      pos,
      isexpr,
      eb  = brackets(6),
      re  = brackets(7),

      REs = [re, newRegExp(brackets(8) + '|' + RE_QBLOCKS.source, REGLOB)]

    start = isexpr = 0

    while (match = re.exec(str)) {

      pos = match.index

      if (isexpr) {

        if (match[2]) {

          re.lastIndex = skipBracketedPart(str, match[2], !!match[1] + pos, 1)
          continue
        }

        if (!match[3])
          continue
      }

      if (!match[1]) {

        unescapeStr(str.slice(start, pos))

        start = re.lastIndex
        re = REs[isexpr ^= 1]
        re.lastIndex = start
      }
    }

    if (start < str.length)
      unescapeStr(str.slice(start))

    return parts

    function unescapeStr(str) {
      parts.push(str && str.replace(eb, '$1'))
    }

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

  function _parseExpr(expr, mode, qstr) {

    expr = expr
          .replace(/\s+/g, ' ')
          .replace(/^ | ?([\(\[{},\?\.:]) ?| $/g, '$1')

    if (!expr) return ''

    var
      csinfo = [],
      cslist

    if (!_extractCSList(expr, csinfo)) {

      return _wrapExpr(expr, mode)
    }

    cslist = csinfo.map(function (kv) {

      if (kv[0])
        kv[1] = qstr[kv[0] | 0]
          .slice(1, -1)
          .replace(/\s+/g, ' ').trim()

      return '(' +
          _wrapExpr(kv[2], 0) +
          ')?"'  + kv[1]  + '":""'

    })

    return cslist.length < 2 ?
       cslist[0] :
      '[' + cslist.join(',') + '].join(" ").trim()'

  }

  var CSNAME_PART = newRegExp(
        '^(' +
        RE_QSMARKER.source +
        '|-?[_A-Za-z][-\\w]*' +
        '):'
      )

  function _extractCSList(str, list) {

    var
      re = /,|([\[{\(])|$/g,
      GRE = RegExp,
      match,
      end,
      ch,
      n = 0

    while (str &&
          (match = str.match(CSNAME_PART)) &&
          !match.index
      ) {

      str = GRE.rightContext
      re.lastIndex = 0

      while ((end = re.exec(str)) && (ch = end[1])) {

        var
          rr = ch === '(' ? /[\(\)]/g : ch === '[' ? /[\[\]]/g : /[{}]/g,
          lv = 1,
          mm

        rr.lastIndex = end.index + 1

        while (lv && (mm = rr.exec(str))) {
          mm[0] === ch ? ++lv : --lv
        }

        re.lastIndex = lv ? str.length : rr.lastIndex
      }

      list[n++] = [
          match[2],
          match[1],
          str.slice(0, end.index)
        ]

      str = GRE.rightContext
    }

    return n

  }

  var

    VAR_CONTEXT = '"in D?D:' + (typeof window === 'object' ? 'window' : 'global') + ').',

    SRE_VARNAME = '[$_A-Za-z][$\\w]*',

    JS_VARSTART = newRegExp(
        '(^ *|[^$\\w\\.])' +
        '(?!(?:typeof|in|instanceof|void|new|function)[^$\\w]|true(?:[^$\\w]|$))' +

        '(' + SRE_VARNAME + ')'
      ),

    JS_OBJKEYS = newRegExp(
        '(?=[,{]'   +
        SRE_VARNAME +
        ':)(.)',
        REGLOB
      )

  function _wrapExpr(expr, asText) {

    var okeys = ~expr.indexOf('{')
    if (okeys)
      expr = expr.replace(JS_OBJKEYS, '$1\uFFF30')

    var match = expr.match(JS_VARSTART)
    if (match) {

      var
        ss = [],
        mvar,
        wrap = 0,
        GRE = RegExp

      do {

        ss.push(GRE.leftContext + (match[1] || ''))
        expr = GRE.rightContext
        mvar = match[2]

        if (~['undefined', 'false', 'null', 'NaN'].indexOf(mvar))
          ss.push(asText ? '""' : mvar)

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

    return okeys ? expr.replace(/\uFFF30/g, '') : expr

  }

  return _tmpl

})()


  // support CommonJS, AMD & browser
  /* istanbul ignore next */
  if (typeof exports === 'object') {
    module.exports = {
      'tmpl': tmpl,
      'brackets': brackets
    }
  }
  else if (typeof define === 'function' && define.amd) {
    define(function() {
      return {
        'tmpl': tmpl,
        'brackets': breackets }
    })
  }
  else {
    var o = (typeof riot !== 'undefined' && riot.util) ? riot.util : (window || global)
    o.tmpl = tmpl
    o.brackets = brackets
  }
})(typeof window !== 'undefined' ? window : void 0);
