  /* istanbul ignore next */
  // support CommonJS, AMD & browser
  if (typeof exports === 'object')
    module.exports = tmpl
  else if (typeof define === 'function' && define.amd)
    define(function() { return tmpl })
  else
    window.tmpl = tmpl

})(typeof window != 'undefined' ? window : undefined);