
//#norm:// tmpl/utils.js

var REGLOB = 'g'

/**
 * Creates a new regexp (uglify save some bytes with this)
 */
function newRegExp(restr, opts) {

  return new RegExp(restr, opts)

}
// end newRegExp()
