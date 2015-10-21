
# The riot-tmpl API

**Note:**
After compiling the first expression, the brackets are locked, any attempt to change them through `_brackets.set` or `riot.settings.brackets` throws an exception.

## tmpl


### `tmpl` function


### `tmpl.parse` function

_Syntax:_ `tmpl.parse( template_string ) : string` 

Replaces the custom or default riot brackets with the internal ones.

### `tmpl.hasExpr` function

_Syntax:_ `tmpl.loopKeys( attribute_value ) : boolean` 

### `tmpl.loopKeys` function

_Syntax:_ `tmpl.loopKeys( attribute_value ) : object` 

### `tmpl.errorHandler` property

_Type:_ function


## brackets


### `brackets` function

_Syntax:_ `brackets( RegExp | number ) : RegExp | string` 

The brackets function accepts a RegExp or numeric parameter.

With a numeric parameter, brackets returns the current left (0) or right (1) brackets characters.

With a regex, this function returns the original regex if the current brackets are the defaults, or a new one with the default brackets replaced by the current custom brackets.


### `brackets.set` function

_Syntax:_ `brackets.set( brackets_string )`

Receives the new string for the brackets pair. This function checks their parameter and reconfigures the internal state immediately.


### `brackets.settings` property

_Type:_ object

Mirror the `riot.settings` object or other user object with where read or write the current brackets string. Unlike with `brackets.set`, reconfiguration for changes in this property, called `brackets`, will be applied in the next use of the `brackets` function.


### `brackets.split` function (private)

_Syntax:_ `brackets.split( template [, brackets_array] ) : Array`


### `brackets.array` function (private)

_Syntax:_ `brackets.array( [brackets_string] ) : Array`


### `brackets.R_MLCOMMS` property

_Type:_ RegExp

Used by internal functions and shared with the riot compiler, matches valid, multiline JavaScript comments in almost all forms. Can handle embedded sequences `/*`, `*\/` and `//` in these. Skips non-valid comments like `/*/`.  
`R_MLCOMMS` does not make captures.


### `brackets.R_STRINGS` property

_Type:_ RegExp

Used by internal functions and shared with the riot compiler, matches single or double quoted strings, handles embedded quotes and multi-line strings (not in accordance with the JavaScript specs). It is not for ES6 template strings, these are too complex for a regex.  
`R_STRINGS` does not make captures.

### `brackets.S_QBLOCK` property

_Type:_ string

Combines the `brackets.R_STRINGS` source with regexes for matching quoted strings, division symbols, and literal regexes.

When dealing with clean JavaScript code, i.e. without comments, this is the only string you need to instantiate your RegExp object. For code containing comments, `S_QBLOCK` needs to be combined with other regexes for exclusion of multiline and single-line comments (`MLCOMMS` is one of both).

The `S_QBLOCK` part captures in `$1` and `$2` a single slash, depending if it matches a division symbol ($1) or a regex ($2). If there's no matches for any of these, they have empty strings.

_Example:_

```js
// Creates the regex, $1 encloses the whole S_QBLOCK, for easier detection
var JS_RMCOMMS = new RegExp(
    '(' + brackets.S_QBLOCK + ')|' + brackets.R_MLCOMMS.source + '|//[^\r\n]*',
    'g')

// Replaces comments with a space (_1 is a string, division sign, or regex)
function stripComments(str) {
  return.replace(JS_RMCOMMS, function (m, _1) { return _1 ? m : ' ' })
}
```
