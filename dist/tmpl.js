/* riot-tmpl WIP, @license MIT, (c) 2015 Muut Inc. + contributors */
;(function (root) {
  'use strict'


  // lib/regex.js

  var regEx = (function () {

    var _re = function _regEx(source, flags) { return new RegExp(source, flags) }

    _re.MLCOMMS = /\/\*[^*]*\*+(?:[^*\/][^*]*\*+)*\//g
    _re.STRINGS = /"[^"\\]*(?:\\[\S\s][^"\\]*)*"|'[^'\\]*(?:\\[\S\s][^'\\]*)*'/g

    var
      DIVISOR = /(?:[$\w\)\]]|\+\+|--)\s*(\/)(?![*\/])/,
      REGEXES = /\/(?=[^*\/])[^[\/\\]*(?:(?:\[(?:\\.|[^\]\\]*)*\]|\\.)[^[\/\\]*)*?(\/)[gim]*/

    _re.S_QBSRC = _re.STRINGS.source + '|' +
                      DIVISOR.source + '|' +
                      REGEXES.source

    _re.PCE_TEST = /{#\d+#}/
    _re.E_NUMBER = "{#01#}"

    return _re

  })()

  // lib/brackets.js

  var brackets = (function () {

    var
      cachedBrackets = '',
      _regex,
      _pairs,
      _bp = [
        '{', '}',
        '{', '}',
        /{[^}]*}/,
        /\\({|})/g,
        /(\\?)({)/g
      ],
      REGLOB = 'g'

    function reWrite(r, p) {
      return new RegExp(
        r.source.replace(/{/g, p[2]).replace(/}/g, p[3]),
        r.global ? REGLOB : ''
      )
    }

    function bFinish(b) {
      b[7] = regEx('(\\\\?)(?:([[({])|(' + b[3] + '))|' + regEx.S_QBSRC, REGLOB)
      b[8] = b[0] + ' ' + b[1]
    }

    _regex = _bp._re = function (r) { return r }
    _pairs = _bp
    bFinish(_bp)

    var FINDBRACES = {
      '(': regEx('([()])|'   + regEx.S_QBSRC, REGLOB),
      '[': regEx('([[\\]])|' + regEx.S_QBSRC, REGLOB),
      '{': regEx('([{}])|'   + regEx.S_QBSRC, REGLOB)
    }

    function _split(str, bp) {

      if (!bp) bp = _pairs

      var
        parts = [],
        match,
        isexpr,
        start,
        pos,
        re = bp[6]

      isexpr = start = 0

      while (match = re.exec(str)) {

        pos = match.index

        if (isexpr) {

          if (match[2]) {
            re.lastIndex = skipBraces(match[2], re.lastIndex)
            continue
          }

          if (!match[3])
            continue
        }

        if (!match[1]) {
          unescapeStr(str.slice(start, pos))
          start = re.lastIndex
          re = bp[6 + (isexpr ^= 1)]
          re.lastIndex = start
        }
      }

      if (str && start < str.length) {
        unescapeStr(str.slice(start))
      }

      return parts

      function unescapeStr(str) {
        parts.push(str && str.replace(bp[5], '$1'))
      }

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

    function _array(pair) {
      var bp = _bp

      if (pair && pair !== '{ }') {

        bp = pair.split(' ')
        if (bp.length !== 2 || /[\x00-\x1F<>a-zA-Z0-9'",;\\]/.test(pair)) {
          throw new Error('Unsupported brackets "' + pair + '"')
        }
        bp = bp.concat(pair.replace(/(?=[-[\]()*+?.^$|#])/g, '\\').split(' '))
        bp[4] = reWrite(bp[1].length > 1 ? /{.*}/ : _bp[4], bp)
        bp[5] = reWrite(_bp[5], bp)
        bp[6] = reWrite(_bp[6], bp)
        bFinish(bp)
      }
      return bp
    }

    function _set(pair) {
      if (cachedBrackets !== pair) {
        _pairs = _array(pair)
        _regex = _pairs._re || reWrite
        _brackets.settings.brackets = cachedBrackets = pair
      }
    }

    function _brackets(reOrIdx) {
      _set(_brackets.settings.brackets)
      return reOrIdx instanceof RegExp ? _regex(reOrIdx, _pairs) : _pairs[reOrIdx]
    }

    _brackets.array = _array
    _brackets.split = _split

    _brackets.settings = typeof riot !== 'undefined' && riot.settings || {}
    _brackets.set = _set

    return _brackets

  })()

  // lib/tmpl.js

  var tmpl = (function () {
    var
      GLOBAL = typeof window !== 'object' ? global : window,

      _cache = {
        '#00': function () { return undefined },
        '#01': function () { return 'number' }
      }

    _tmpl.errorHandler = null

    function _tmpl(str, data) {
      var x, v
      if (!str) return str

      if (x = str.match(/^{(#\d+)#}$/)) {
        try {
          v = _cache[x[1]].call(data, GLOBAL, shList)
        } catch (e) {
          logErr(e, x[1], data)
        }
        return v
      }

      return str.replace(/{(#\d+)#}/g, function (_, n) {
        var s
        try {
          s = _cache[n].call(data, GLOBAL, shList)
        } catch (e) {
          logErr(e, n, data)
        }
        return s || s === 0 ? s : ''
      })
    }

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

    function logErr(err, n, D) {
      var s = n && !_cache[n] || _tmpl.errorHandler ? 'riot:' : ''
      if (!s) return

      if (D) {
        s += ' ' + (D && D.root && D.root.tagName || '-no-name-')
        s += ':' + ('_riot_id' in D ? D._riot_id : '-')
      } else
        s += ' -no-data-:-'

      s += ' : ' + (err.stack || err)

      if (_tmpl.errorHandler)
        _tmpl.errorHandler(s)
      else
        throw new Error(s + ' : Missing expression "' + n + '"')
    }

    _tmpl.hasExpr = function hasExpr(str) {
      return /{#\d+#}/.test(str)
    }

    _tmpl.loopKeys = function loopKeys(expr) {
      var m = expr.match(/^([$\w]+),([^,]*),({#\d+#})/)
      return m ? { key: m[1], pos: m[2], val: m[3] } : { val: expr }
    }

    _tmpl.insert = function insert(pcexpr) {
      for (var hash in pcexpr) {
        _cache[hash] = pcexpr[hash]
      }
    }

    var
      EACH_EXPR = /^(?:\^\s*)?([$\w]+)(?:\s*,\s*(\S+))?\s+in\s+(\S+)$/,
      EACH_ATTR = /(^|\s)each\s*=\s*['"]?$/i

    _tmpl.compile = function compile(str, opts, pcex, fn) {
      if (!str) return str
      var
        look,
        expr,
        each,
        hash,
        parts = brackets.split(str, opts && opts._b)

      look = /\beach\s*=/.test(str)

      for (var i = 1; i < parts.length; i += 2) {
        expr = parts[i].trim()
        if (!expr) {
          parts[i] = '{#00#}'
          continue
        }
        each = look && expr.match(EACH_EXPR)

        if (each && EACH_ATTR.test(parts[i - 1])) {
          parts[i - 1] += each[1] + ',' + (each[2] || '') + ','
          expr = each[3]
        }
        else if (expr[0] === '^') {
          expr = expr.slice(1).trim()
        }
        else if (fn) {
          expr = fn(expr, opts)
        }

        parts[i] = '{' + (hash = hashCode(expr)) + '#}'
        expr = parseExpr(expr)

        if (pcex)
          pcex.push('"' + hash + '":function(G,F){return ' + expr + '}')
        else
          _cache[hash] = new Function('G,F', 'return ' + expr + ';')
      }

      return parts.join('')
    }

    function hashCode(str) {
      var i, hash

      for (i = hash = 0; i < str.length; ++i) {
        hash = str.charCodeAt(i) + (hash << 6) + (hash << 16) - hash
      }
      return hash < 0 ? '#0' + hash * -1 : '#' + hash
    }

    var
      RE_QBLOCK = regEx(regEx.S_QBSRC, 'g'),
      RE_QBMARK = /\x01(\d+)~/g,
      CS_IDENT  = /^(?:(-?[_A-Za-z\xA0-\xFF][-\w\xA0-\xFF]*)|\x01(\d+)~):/

    function parseExpr(expr) {

      var qstr = []

      expr = expr
            .replace(RE_QBLOCK, function (str, div) {
              return str.length > 2 && !div ? '\x01' + (qstr.push(str) - 1) + '~' : str
            })
            .replace(/\s+/g, ' ').trim()
            .replace(/\ ?([[\({},?\.:])\ ?/g, '$1')

      if (expr) {
        var list = getCSList(expr, qstr)

        expr = list ? 'F(this,[' + list.join(',') + '])' : wrapExpr(expr)

        if (qstr[0]) {
          expr = expr.replace(RE_QBMARK, function (_, pos) {
            return qstr[pos].replace(/\r/g, '\\r').replace(/\n/g, '\\n')
          })
        }
      }
      return expr
    }

    function getCSList(expr, qstr) {
      var
        list = [],
        cnt = 0,
        match

      while (expr &&
            (match = expr.match(CS_IDENT)) &&
            !match.index
        ) {
        var
          key,
          jsb,
          re = /,|([[{(])|$/g

        expr = RegExp.rightContext
        key  = match[2] ? qstr[match[2]].slice(1, -1).trim().replace(/\s+/g, ' ') : match[1]

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

        list[cnt++] = 'function(){return (' + wrapExpr(jsb) + ')&&"' + key + '"}'
      }

      return cnt && list
    }

    var JS_VARNAME =
      /[,{][$\w]+:|(^ *|[^$\w\.])(?!(?:this|global|typeof|true|false|null|in|instanceof|is(?:Finite|NaN)|void|NaN|new|Date|RegExp|Math)(?![$\w]))([$_A-Za-z][$\w]*)/g

    function wrapExpr(expr) {

      return expr.replace(JS_VARNAME, function (match, p, mvar) {
        if (mvar)
          match = p + (mvar === 'window' ? 'G' : '("' + mvar + '"in this?this:G).' + mvar)
        return match
      })
    }

    return _tmpl

  })()


  if (typeof exports === 'object') {
    module.exports = {
      'tmpl': tmpl,
      'brackets': brackets,
      'regEx': regEx
    }
  }
  else if (typeof define === 'function' && define.amd) {
    define(function () {
      return {
        'tmpl': tmpl,
        'brackets': breackets,
        'regEx': regEx
      }
    })
  }
  else if (root) {
    root.tmpl = tmpl
    root.brackets = brackets
    root.regEx = regEx
  }

})(this)
