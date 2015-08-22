
/*#norm:
  -----------------------------------------------------------------------------
  riot-tmpl/lib/utils.js
*/

var REGLOB = 'g'

/**
 * Creates a new regexp (uglify save some bytes with this)
 *
 * @param {string} restr - String for create the regexp.
 * @param {string} [opts=''] - Flags for the constructor.
 * @returns {RegExp} - The created instance.
 */
function newRegExp(restr, opts) {

  return new RegExp(restr, opts)

}
// end newRegExp()
