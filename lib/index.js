//#if NODE
//#undef RIOT
/* riot-tmpl WIP, @license MIT, (c) 2015 Muut Inc. + contributors */
;(function (window) {
  'use strict'              // eslint-disable-line

//#else
//#define RIOT

/**
 * The riot template engine
 * @version WIP
 */
//#endif


  //#include brackets

  //#include tmpl


//#if NODE

  // support CommonJS, AMD & browser
  /* istanbul ignore else */
  if (typeof module === 'object' && module.exports) {
    module.exports = {
      'tmpl': tmpl, 'brackets': brackets
    }
  }
  else if (typeof define === 'function' && define.amd) {
    define(function () {
      return {
        'tmpl': tmpl, 'brackets': breackets
      }
    })
  }
  else if (window) {
    window.tmpl = tmpl
    window.brackets = brackets
  }

})(typeof window === 'object' ? /* istanbul ignore next */ window : void 0) // eslint-disable-line no-void

//#endif
