(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (factory((global.cspTmpl = global.cspTmpl || {})));
}(this, function (exports) { 'use strict';

  function InfiniteChecker(maxIterations){
    if (this instanceof InfiniteChecker){
      this.maxIterations = maxIterations
      this.count = 0
    } else {
      return new InfiniteChecker(maxIterations)
    }
  }

  InfiniteChecker.prototype.check = function(){
    this.count += 1
    if (this.count > this.maxIterations){
      throw new Error('Infinite loop detected - reached max iterations')
    }
  }

  function getGlobal(str) {
    var ctx = typeof window !== 'object' ? global : window
    return typeof str !== 'undefined' ? ctx[str] : ctx
  }

  var names = ['Object', 'String', 'Boolean', 'Number', 'RegExp', 'Date', 'Array']
  var immutable = {string: 'String', boolean: 'Boolean', number: 'Number' }

  var primitives = names.map(getGlobal)
  var protos = primitives.map(getProto)

  function Primitives(context){
    if (this instanceof Primitives){
      this.context = context
      for (var i=0;i<names.length;i++){
        if (!this.context[names[i]]){
          this.context[names[i]] = wrap(primitives[i])
        }
      }
    } else {
      return new Primitives(context)
    }
  }

  Primitives.prototype.replace = function(value){
    var primIndex = primitives.indexOf(value)
    var protoIndex = protos.indexOf(value)

    if (~primIndex){
      var name = names[primIndex]
      return this.context[name]
    } else if (~protoIndex) {
      var name = names[protoIndex]
      return this.context[name].prototype
    } else  {
      return value
    }
  }

  Primitives.prototype.getPropertyObject = function(object, property){
    if (immutable[typeof object]){
      return this.getPrototypeOf(object)
    }
    return object
  }

  Primitives.prototype.isPrimitive = function(value){
    return !!~primitives.indexOf(value) || !!~protos.indexOf(value)
  }

  Primitives.prototype.getPrototypeOf = function(value){
    if (value == null){ // handle null and undefined
      return value
    }

    var immutableType = immutable[typeof value]
    if (immutableType){
      var proto = this.context[immutableType].prototype
    } else {
      var proto = Object.getPrototypeOf(value)
    }

    if (!proto || proto === Object.prototype){
      return null
    } else {
      var replacement = this.replace(proto)
      if (replacement === value){
        replacement = this.replace(Object.prototype)
      }
      return replacement
    }
  }

  Primitives.prototype.applyNew = function(func, args){
    if (func.wrapped){
      var prim = Object.getPrototypeOf(func)
      var instance = new (Function.prototype.bind.apply(prim, arguments))
      setProto(instance, func.prototype)
      return instance
    } else {
      return new (Function.prototype.bind.apply(func, arguments))
    }
  }

  function getProto(func) {
    return func.prototype
  }

  function setProto(obj, proto){
    obj.__proto__ = proto
  }

  function wrap(prim){
    var proto = Object.create(prim.prototype)

    var result = function() {
      if (this instanceof result){
        prim.apply(this, arguments)
      } else {
        var instance = prim.apply(null, arguments)
        setProto(instance, proto)
        return instance
      }
    }
    setProto(result, prim)
    result.prototype = proto
    result.wrapped = true
    return result
  }

  var parse = require('esprima').parse
  var hoist = require('hoister')

  var maxIterations = 1000000

  // 'eval' with a controlled environment
  function safeEval(src, parentContext){
    var tree = prepareAst(src)
    var context = Object.create(parentContext || {})
    return finalValue(evaluateAst(tree, context))
  }

  safeEval.func = FunctionFactory()

  // create a 'Function' constructor for a controlled environment
  function FunctionFactory(parentContext){
    var context = Object.create(parentContext || {})
    return function Function() {
      // normalize arguments array
      var args = Array.prototype.slice.call(arguments)
      var src = args.slice(-1)[0]
      args = args.slice(0,-1)
      if (typeof src === 'string'){
        //HACK: esprima doesn't like returns outside functions
        src = parse('function a(){' + src + '}').body[0].body
      }
      var tree = prepareAst(src)
      return getFunction(tree, args, context)
    }
  }

  // takes an AST or js source and returns an AST
  function prepareAst(src){
    var tree = (typeof src === 'string') ? parse(src) : src
    return hoist(tree)
  }

  // evaluate an AST in the given context
  function evaluateAst(tree, context){

    var safeFunction = FunctionFactory(context)
    var primitives = Primitives(context)

    // block scoped context for catch (ex) and 'let'
    var blockContext = context

    return walk(tree)

    // recursively walk every node in an array
    function walkAll(nodes){
      var result = undefined
      for (var i=0;i<nodes.length;i++){
        var childNode = nodes[i]
        if (childNode.type === 'EmptyStatement') continue
        result = walk(childNode)
        if (result instanceof ReturnValue){
          return result
        }
      }
      return result
    }

    // recursively evalutate the node of an AST
    function walk(node){
      if (!node) return
      switch (node.type) {

        case 'Program':
          return walkAll(node.body)

        case 'BlockStatement':
          enterBlock()
          var result = walkAll(node.body)
          leaveBlock()
          return result

        case 'FunctionDeclaration':
          var params = node.params.map(getName)
          var value = getFunction(node.body, params, blockContext)
          return context[node.id.name] = value

        case 'FunctionExpression':
          var params = node.params.map(getName)
          return getFunction(node.body, params, blockContext)

        case 'ReturnStatement':
          var value = walk(node.argument)
          return new ReturnValue('return', value)

        case 'BreakStatement':
          return new ReturnValue('break')

        case 'ContinueStatement':
          return new ReturnValue('continue')

        case 'ExpressionStatement':
          return walk(node.expression)

        case 'AssignmentExpression':
          return setValue(blockContext, node.left, node.right, node.operator)

        case 'UpdateExpression':
          return setValue(blockContext, node.argument, null, node.operator)

        case 'VariableDeclaration':
          node.declarations.forEach(function(declaration){
            var target = node.kind === 'let' ? blockContext : context
            if (declaration.init){
              target[declaration.id.name] = walk(declaration.init)
            } else {
              target[declaration.id.name] = undefined
            }
          })
          break

        case 'SwitchStatement':
          var defaultHandler = null
          var matched = false
          var value = walk(node.discriminant)
          var result = undefined

          enterBlock()

          var i = 0
          while (result == null){
            if (i<node.cases.length){
              if (node.cases[i].test){ // check or fall through
                matched = matched || (walk(node.cases[i].test) === value)
              } else if (defaultHandler == null) {
                defaultHandler = i
              }
              if (matched){
                var r = walkAll(node.cases[i].consequent)
                if (r instanceof ReturnValue){ // break out
                  if (r.type == 'break') break
                  result = r
                }
              }
              i += 1 // continue
            } else if (!matched && defaultHandler != null){
              // go back and do the default handler
              i = defaultHandler
              matched = true
            } else {
              // nothing we can do
              break
            }
          }

          leaveBlock()
          return result

        case 'IfStatement':
          if (walk(node.test)){
            return walk(node.consequent)
          } else if (node.alternate) {
            return walk(node.alternate)
          }

        case 'ForStatement':
          var infinite = InfiniteChecker(maxIterations)
          var result = undefined

          enterBlock() // allow lets on delarations
          for (walk(node.init); walk(node.test); walk(node.update)){
            var r = walk(node.body)

            // handle early return, continue and break
            if (r instanceof ReturnValue){
              if (r.type == 'continue') continue
              if (r.type == 'break') break
              result = r
              break
            }

            infinite.check()
          }
          leaveBlock()
          return result

        case 'ForInStatement':
          var infinite = InfiniteChecker(maxIterations)
          var result = undefined

          var value = walk(node.right)
          var property = node.left

          var target = context
          enterBlock()

          if (property.type == 'VariableDeclaration'){
            walk(property)
            property = property.declarations[0].id
            if (property.kind === 'let'){
              target = blockContext
            }
          }

          for (var key in value){
            setValue(target, property, {type: 'Literal', value: key})
            var r = walk(node.body)

            // handle early return, continue and break
            if (r instanceof ReturnValue){
              if (r.type == 'continue') continue
              if (r.type == 'break') break
              result = r
              break
            }

            infinite.check()
          }
          leaveBlock()

          return result

        case 'WhileStatement':
          var infinite = InfiniteChecker(maxIterations)
          while (walk(node.test)){
            walk(node.body)
            infinite.check()
          }
          break

        case 'TryStatement':
          try {
            walk(node.block)
          } catch (error) {
            enterBlock()
            var catchClause = node.handlers[0]
            if (catchClause) {
              blockContext[catchClause.param.name] = error
              walk(catchClause.body)
            }
            leaveBlock()
          } finally {
            if (node.finalizer) {
              walk(node.finalizer)
            }
          }
          break

        case 'Literal':
          return node.value

        case 'UnaryExpression':
          var val = walk(node.argument)
          switch(node.operator) {
            case '+': return +val
            case '-': return -val
            case '~': return ~val
            case '!': return !val
            case 'typeof': return typeof val
            default: return unsupportedExpression(node)
          }

        case 'ArrayExpression':
          var obj = blockContext['Array']()
          for (var i=0;i<node.elements.length;i++){
            obj.push(walk(node.elements[i]))
          }
          return obj

        case 'ObjectExpression':
          var obj = blockContext['Object']()
          for (var i = 0; i < node.properties.length; i++) {
            var prop = node.properties[i]
            var value = (prop.value === null) ? prop.value : walk(prop.value)
            obj[prop.key.value || prop.key.name] = value
          }
          return obj

        case 'NewExpression':
          var args = node.arguments.map(function(arg){
            return walk(arg)
          })
          var target = walk(node.callee)
          return primitives.applyNew(target, args)


        case 'BinaryExpression':
          var l = walk(node.left)
          var r = walk(node.right)

          switch(node.operator) {
            case '==':  return l === r
            case '===': return l === r
            case '!=':  return l != r
            case '!==': return l !== r
            case '+':   return l + r
            case '-':   return l - r
            case '*':   return l * r
            case '/':   return l / r
            case '%':   return l % r
            case '<':   return l < r
            case '<=':  return l <= r
            case '>':   return l > r
            case '>=':  return l >= r
            case '|':   return l | r
            case '&':   return l & r
            case '^':   return l ^ r
            case 'in':   return l in r
            case 'instanceof': return l instanceof r
            default: return unsupportedExpression(node)
          }

        case 'LogicalExpression':
          switch(node.operator) {
            case '&&':  return walk(node.left) && walk(node.right)
            case '||':  return walk(node.left) || walk(node.right)
            default: return unsupportedExpression(node)
          }

        case 'ThisExpression':
          return blockContext['this']

        case 'Identifier':
          if (node.name === 'undefined'){
            return undefined
          } else if (hasProperty(blockContext, node.name, primitives)){
            return finalValue(blockContext[node.name])
          } else {
            throw new ReferenceError(node.name + ' is not defined')
          }

        case 'CallExpression':
          var args = node.arguments.map(function(arg){
            return walk(arg)
          })
          var object = null
          var target = walk(node.callee)

          if (node.callee.type === 'MemberExpression'){
            object = walk(node.callee.object)
          }
          return target.apply(object, args)

        case 'MemberExpression':
          var obj = walk(node.object)
          if (node.computed){
            var prop = walk(node.property)
          } else {
            var prop = node.property.name
          }
          obj = primitives.getPropertyObject(obj, prop)
          return checkValue(obj[prop]);

        case 'ConditionalExpression':
          var val = walk(node.test)
          return val ? walk(node.consequent) : walk(node.alternate)

        case 'EmptyStatement':
          return

        default:
          return unsupportedExpression(node)
      }
    }

    // safely retrieve a value
    function checkValue(value){
      if (value === Function){
        value = safeFunction
      }
      return finalValue(value)
    }

    // block scope context control
    function enterBlock(){
      blockContext = Object.create(blockContext)
    }
    function leaveBlock(){
      blockContext = Object.getPrototypeOf(blockContext)
    }

    // set a value in the specified context if allowed
    function setValue(object, left, right, operator){
      var name = null

      if (left.type === 'Identifier'){
        name = left.name
        // handle parent context shadowing
        object = objectForKey(object, name, primitives)
      } else if (left.type === 'MemberExpression'){
        if (left.computed){
          name = walk(left.property)
        } else {
          name = left.property.name
        }
        object = walk(left.object)
      }

      // stop built in properties from being able to be changed
      if (canSetProperty(object, name, primitives)){
        switch(operator) {
          case undefined: return object[name] = walk(right)
          case '=':  return object[name] = walk(right)
          case '+=': return object[name] += walk(right)
          case '-=': return object[name] -= walk(right)
          case '++': return object[name]++
          case '--': return object[name]--
        }
      }

    }

  }

  // when an unsupported expression is encountered, throw an error
  function unsupportedExpression(node){
    console.error(node)
    var err = new Error('Unsupported expression: ' + node.type)
    err.node = node
    throw err
  }

  // walk a provided object's prototypal hierarchy to retrieve an inherited object
  function objectForKey(object, key, primitives){
    var proto = primitives.getPrototypeOf(object)
    if (!proto || hasOwnProperty(object, key)){
      return object
    } else {
      return objectForKey(proto, key, primitives)
    }
  }

  function hasProperty(object, key, primitives){
    var proto = primitives.getPrototypeOf(object)
    var hasOwn = hasOwnProperty(object, key)
    if (object[key] !== undefined){
      return true
    } else if (!proto || hasOwn){
      return hasOwn
    } else {
      return hasProperty(proto, key, primitives)
    }
  }

  function hasOwnProperty(object, key){
    return Object.prototype.hasOwnProperty.call(object, key)
  }

  function propertyIsEnumerable(object, key){
    return Object.prototype.propertyIsEnumerable.call(object, key)
  }


  // determine if we have write access to a property
  function canSetProperty(object, property, primitives){
    if (property === '__proto__' || primitives.isPrimitive(object)){
      return false
    } else if (object != null){

      if (hasOwnProperty(object, property)){
        if (propertyIsEnumerable(object, property)){
          return true
        } else {
          return false
        }
      } else {
        return canSetProperty(primitives.getPrototypeOf(object), property, primitives)
      }

    } else {
      return true
    }
  }

  // generate a function with specified context
  function getFunction(body, params, parentContext){
    return function(){
      var context = Object.create(parentContext)
      if (this == getGlobal()) {
        context['this'] = null
      } else {
        context['this'] = this
      }
      // normalize arguments array
      var args = Array.prototype.slice.call(arguments)
      context['arguments'] = arguments
      args.forEach(function(arg,idx){
        var param = params[idx]
        if (param){
          context[param] = arg
        }
      })
      var result = evaluateAst(body, context)

      if (result instanceof ReturnValue){
        return result.value
      }
    }
  }

  function finalValue(value){
    if (value instanceof ReturnValue){
      return value.value
    }
    return value
  }

  // get the name of an identifier
  function getName(identifier){
    return identifier.name
  }

  // a ReturnValue struct for differentiating between expression result and return statement
  function ReturnValue(type, value){
    this.type = type
    this.value = value
  }

  //eslint-disable-line no-unused-vars

  /**
   * The riot template engine
   * @version WIP
   */
  /**
   * riot.util.brackets
   *
   * - `brackets    ` - Returns a string or regex based on its parameter
   * - `brackets.set` - Change the current riot brackets
   *
   * @module
   */

  /* global riot */

  var brackets = (function (UNDEF) {

    var
      REGLOB = 'g',

      R_MLCOMMS = /\/\*[^*]*\*+(?:[^*\/][^*]*\*+)*\//g,

      R_STRINGS = /"[^"\\]*(?:\\[\S\s][^"\\]*)*"|'[^'\\]*(?:\\[\S\s][^'\\]*)*'/g,

      S_QBLOCKS = R_STRINGS.source + '|' +
        /(?:\breturn\s+|(?:[$\w\)\]]|\+\+|--)\s*(\/)(?![*\/]))/.source + '|' +
        /\/(?=[^*\/])[^[\/\\]*(?:(?:\[(?:\\.|[^\]\\]*)*\]|\\.)[^[\/\\]*)*?(\/)[gim]*/.source,

      FINDBRACES = {
        '(': RegExp('([()])|'   + S_QBLOCKS, REGLOB),
        '[': RegExp('([[\\]])|' + S_QBLOCKS, REGLOB),
        '{': RegExp('([{}])|'   + S_QBLOCKS, REGLOB)
      },

      DEFAULT = '{ }'

    var _pairs = [
      '{', '}',
      '{', '}',
      /{[^}]*}/,
      /\\([{}])/g,
      /\\({)|{/g,
      RegExp('\\\\(})|([[({])|(})|' + S_QBLOCKS, REGLOB),
      DEFAULT,
      /^\s*{\^?\s*([$\w]+)(?:\s*,\s*(\S+))?\s+in\s+(\S.*)\s*}/,
      /(^|[^\\]){=[\S\s]*?}/
    ]

    var
      cachedBrackets = UNDEF,
      _regex,
      _cache = [],
      _settings

    function _loopback (re) { return re }

    function _rewrite (re, bp) {
      if (!bp) bp = _cache
      return new RegExp(
        re.source.replace(/{/g, bp[2]).replace(/}/g, bp[3]), re.global ? REGLOB : ''
      )
    }

    function _create (pair) {
      if (pair === DEFAULT) return _pairs

      var arr = pair.split(' ')

      if (arr.length !== 2 || /[\x00-\x1F<>a-zA-Z0-9'",;\\]/.test(pair)) {
        throw new Error('Unsupported brackets "' + pair + '"')
      }
      arr = arr.concat(pair.replace(/(?=[[\]()*+?.^$|])/g, '\\').split(' '))

      arr[4] = _rewrite(arr[1].length > 1 ? /{[\S\s]*?}/ : _pairs[4], arr)
      arr[5] = _rewrite(pair.length > 3 ? /\\({|})/g : _pairs[5], arr)
      arr[6] = _rewrite(_pairs[6], arr)
      arr[7] = RegExp('\\\\(' + arr[3] + ')|([[({])|(' + arr[3] + ')|' + S_QBLOCKS, REGLOB)
      arr[8] = pair
      return arr
    }

    function _brackets (reOrIdx) {
      return reOrIdx instanceof RegExp ? _regex(reOrIdx) : _cache[reOrIdx]
    }

    _brackets.split = function split (str, tmpl, _bp) {
      // istanbul ignore next: _bp is for the compiler
      if (!_bp) _bp = _cache

      var
        parts = [],
        match,
        isexpr,
        start,
        pos,
        re = _bp[6]

      isexpr = start = re.lastIndex = 0

      while ((match = re.exec(str))) {

        pos = match.index

        if (isexpr) {

          if (match[2]) {
            re.lastIndex = skipBraces(str, match[2], re.lastIndex)
            continue
          }
          if (!match[3]) {
            continue
          }
        }

        if (!match[1]) {
          unescapeStr(str.slice(start, pos))
          start = re.lastIndex
          re = _bp[6 + (isexpr ^= 1)]
          re.lastIndex = start
        }
      }

      if (str && start < str.length) {
        unescapeStr(str.slice(start))
      }

      return parts

      function unescapeStr (s) {
        if (tmpl || isexpr) {
          parts.push(s && s.replace(_bp[5], '$1'))
        } else {
          parts.push(s)
        }
      }

      function skipBraces (s, ch, ix) {
        var
          match,
          recch = FINDBRACES[ch]

        recch.lastIndex = ix
        ix = 1
        while ((match = recch.exec(s))) {
          if (match[1] &&
            !(match[1] === ch ? ++ix : --ix)) break
        }
        return ix ? s.length : recch.lastIndex
      }
    }

    _brackets.hasExpr = function hasExpr (str) {
      return _cache[4].test(str)
    }

    _brackets.loopKeys = function loopKeys (expr) {
      var m = expr.match(_cache[9])

      return m
        ? { key: m[1], pos: m[2], val: _cache[0] + m[3].trim() + _cache[1] }
        : { val: expr.trim() }
    }

    _brackets.array = function array (pair) {
      return pair ? _create(pair) : _cache
    }

    function _reset (pair) {
      if ((pair || (pair = DEFAULT)) !== _cache[8]) {
        _cache = _create(pair)
        _regex = pair === DEFAULT ? _loopback : _rewrite
        _cache[9] = _regex(_pairs[9])
      }
      cachedBrackets = pair
    }

    function _setSettings (o) {
      var b

      o = o || {}
      b = o.brackets
      Object.defineProperty(o, 'brackets', {
        set: _reset,
        get: function () { return cachedBrackets },
        enumerable: true
      })
      _settings = o
      _reset(b)
    }

    Object.defineProperty(_brackets, 'settings', {
      set: _setSettings,
      get: function () { return _settings }
    })

    /* istanbul ignore next: in the browser riot is always in the scope */
    _brackets.settings = typeof riot !== 'undefined' && riot.settings || {}
    _brackets.set = _reset

    _brackets.R_STRINGS = R_STRINGS
    _brackets.R_MLCOMMS = R_MLCOMMS
    _brackets.S_QBLOCKS = S_QBLOCKS

    return _brackets

  })()

  /**
   * @module tmpl
   *
   * tmpl          - Root function, returns the template value, render with data
   * tmpl.hasExpr  - Test the existence of a expression inside a string
   * tmpl.loopKeys - Get the keys for an 'each' loop (used by `_each`)
   */

  var tmpl = (function () {

    var _cache = {}

    function _tmpl (str, data) {
      if (!str) return str

      return (_cache[str] || (_cache[str] = _create(str))).call(data, _logErr)
    }

    _tmpl.haveRaw = brackets.hasRaw

    _tmpl.hasExpr = brackets.hasExpr

    _tmpl.loopKeys = brackets.loopKeys

    _tmpl.errorHandler = null

    function _logErr (err, ctx) {

      if (_tmpl.errorHandler) {

        err.riotData = {
          tagName: ctx && ctx.root && ctx.root.tagName,
          _riot_id: ctx && ctx._riot_id  //eslint-disable-line camelcase
        }
        _tmpl.errorHandler(err)
      }
    }

    function _create (str) {
      var expr = _getTmpl(str)

      if (expr.slice(0, 11) !== 'try{return ') expr = 'return ' + expr

  /* eslint-disable */
      return safeEval.func('E', expr + ';')
  /* eslint-enable */
    }

    var
      CH_IDEXPR = '\u2057',
      RE_CSNAME = /^(?:(-?[_A-Za-z\xA0-\xFF][-\w\xA0-\xFF]*)|\u2057(\d+)~):/,
      RE_QBLOCK = RegExp(brackets.S_QBLOCKS, 'g'),
      RE_DQUOTE = /\u2057/g,
      RE_QBMARK = /\u2057(\d+)~/g

    function _getTmpl (str) {
      var
        qstr = [],
        expr,
        parts = brackets.split(str.replace(RE_DQUOTE, '"'), 1)

      if (parts.length > 2 || parts[0]) {
        var i, j, list = []

        for (i = j = 0; i < parts.length; ++i) {

          expr = parts[i]

          if (expr && (expr = i & 1

              ? _parseExpr(expr, 1, qstr)

              : '"' + expr
                  .replace(/\\/g, '\\\\')
                  .replace(/\r\n?|\n/g, '\\n')
                  .replace(/"/g, '\\"') +
                '"'

            )) list[j++] = expr

        }

        expr = j < 2 ? list[0]
             : '[' + list.join(',') + '].join("")'

      } else {

        expr = _parseExpr(parts[1], 0, qstr)
      }

      if (qstr[0]) {
        expr = expr.replace(RE_QBMARK, function (_, pos) {
          return qstr[pos]
            .replace(/\r/g, '\\r')
            .replace(/\n/g, '\\n')
        })
      }
      return expr
    }

    var
      RE_BREND = {
        '(': /[()]/g,
        '[': /[[\]]/g,
        '{': /[{}]/g
      }

    function _parseExpr (expr, asText, qstr) {

      expr = expr
            .replace(RE_QBLOCK, function (s, div) {
              return s.length > 2 && !div ? CH_IDEXPR + (qstr.push(s) - 1) + '~' : s
            })
            .replace(/\s+/g, ' ').trim()
            .replace(/\ ?([[\({},?\.:])\ ?/g, '$1')

      if (expr) {
        var
          list = [],
          cnt = 0,
          match

        while (expr &&
              (match = expr.match(RE_CSNAME)) &&
              !match.index
          ) {
          var
            key,
            jsb,
            re = /,|([[{(])|$/g

          expr = RegExp.rightContext
          key  = match[2] ? qstr[match[2]].slice(1, -1).trim().replace(/\s+/g, ' ') : match[1]

          while (jsb = (match = re.exec(expr))[1]) skipBraces(jsb, re)

          jsb  = expr.slice(0, match.index)
          expr = RegExp.rightContext

          list[cnt++] = _wrapExpr(jsb, 1, key)
        }

        expr = !cnt ? _wrapExpr(expr, asText)
             : cnt > 1 ? '[' + list.join(',') + '].join(" ").trim()' : list[0]
      }
      return expr

      function skipBraces (ch, re) {
        var
          mm,
          lv = 1,
          ir = RE_BREND[ch]

        ir.lastIndex = re.lastIndex
        while (mm = ir.exec(expr)) {
          if (mm[0] === ch) ++lv
          else if (!--lv) break
        }
        re.lastIndex = lv ? expr.length : ir.lastIndex
      }
    }

    // istanbul ignore next: not both
    var // eslint-disable-next-line max-len
      JS_CONTEXT = '"in this?this:' + (typeof window !== 'object' ? 'global' : 'window') + ').',
      JS_VARNAME = /[,{][$\w]+:|(^ *|[^$\w\.])(?!(?:typeof|true|false|null|undefined|in|instanceof|is(?:Finite|NaN)|void|NaN|new|Date|RegExp|Math)(?![$\w]))([$_A-Za-z][$\w]*)/g,
      JS_NOPROPS = /^(?=(\.[$\w]+))\1(?:[^.[(]|$)/

    function _wrapExpr (expr, asText, key) {
      var tb

      expr = expr.replace(JS_VARNAME, function (match, p, mvar, pos, s) {
        if (mvar) {
          pos = tb ? 0 : pos + match.length

          if (mvar !== 'this' && mvar !== 'global' && mvar !== 'window') {
            match = p + '("' + mvar + JS_CONTEXT + mvar
            if (pos) tb = (s = s[pos]) === '.' || s === '(' || s === '['
          } else if (pos) {
            tb = !JS_NOPROPS.test(s.slice(pos))
          }
        }
        return match
      })

      if (tb) {
        expr = 'try{return ' + expr + '}catch(e){E(e,this)}'
      }

      if (key) {

        expr = (tb
            ? 'function(){' + expr + '}.call(this)' : '(' + expr + ')'
          ) + '?"' + key + '":""'

      } else if (asText) {

        expr = 'function(v){' + (tb
            ? expr.replace('return ', 'v=') : 'v=(' + expr + ')'
          ) + ';return v||v===0?v:""}.call(this)'
      }

      return expr
    }

    // istanbul ignore next: compatibility fix for beta versions
    _tmpl.parse = function (s) { return s }

    _tmpl.version = brackets.version = 'WIP'

    return _tmpl

  })()

  exports.brackets = brackets;
  exports.tmpl = tmpl;

}));