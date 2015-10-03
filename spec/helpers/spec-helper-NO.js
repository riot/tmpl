beforeAll(function () {

  var tmpl = require('../../dist/tmpl').tmpl

  this.setData = function (o) {
    console.log('*** in setData() ***')
    o.yes = true
    o.no  = false
    o.str = 'x'
    o.obj = {val: 2}
    o.arr = [2]
    o.x   = 2
    o.$a  = 0
    o.$b  = 1
    o.esc = '\'\n\\'
    o.fn  = function(s) { return ['hi', s].join(' ') }
    return o
  }

  this.render = function (str, debug) {
    var expr = tmpl.parse(str)

    if (debug) {
      var a = tmpl.cache(expr)
      console.log('--- for template `' + expr + '`')
      for (var i = 0; i < a.length; ++i) {
        var e = a[i]
        console.log(i + '. type ' + (Array.isArray(e)?'Array':typeof e) +
          ', len ' + (e.length || 'NaN') + '\n  -> `' + e + '`')
      }
    }
    return tmpl(expr, data)
  }

})
