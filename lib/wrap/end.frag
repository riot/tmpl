
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
  else if (window) {
    window.tmpl = tmpl
    window.brackets = brackets
  }
})(typeof window !== 'undefined' ? window : void 0);
