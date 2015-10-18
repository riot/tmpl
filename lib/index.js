//#if NODE
//#ifndef $_VER
//#define $_VER 'WIP'
//#endif
//#undef RIOT
/* riot-tmpl $_VER, @license MIT, (c) 2015 Muut Inc. + contributors */
;(function (window) {
  'use strict'              // eslint-disable-line

//#else
//#define RIOT

/**
 * The riot template engine
 * @module tmpl
 * @version $_VER
 */
//#endif


  //#include brackets
  //#include tmpl


//#if NODE

  // support CommonJS, AMD & browser
  /* istanbul ignore else */
  if (typeof module === 'object' && module.exports) {
    module.exports = {
      'tmpl': tmpl,
      'brackets': brackets
    }
  }
  else if (typeof define === 'function' && define.amd) {
    define(function () {
      return {
        'tmpl': tmpl,
        'brackets': breackets
      }
    })
  }
  else if (window) {
    window.tmpl = tmpl
    window.brackets = brackets
  }

})(typeof window !== 'object' ? void 0 : window) // eslint-disable-line no-void
//#endif
