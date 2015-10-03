/* riot-tmpl WIP, @license MIT, (c) 2015 Muut Inc. + contributors */
//#if MODULE
;(function (root) {
  'use strict'              // eslint-disable-line
//#endif


  //#include regex
  //#include brackets
  //#include tmpl


//#if MODULE
  // support CommonJS, AMD & browser
  /* istanbul ignore next */
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
//#endif
