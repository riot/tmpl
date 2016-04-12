export function getGlobal(str) {
  var ctx = typeof window !== 'object' ? global : window
  return typeof str !== 'undefined' ? ctx[str] : ctx
}