
# Why, How, and Other Bits

I hope some day work in this. In the mean time...

## Why's

**Why** this code is generating a _Parse error_?
```js
riot.util.brackets.set('{{ }}')
var result = riot.util.tmpl('{{{a:1\\}}}')
```
Because the code above is equivalent to `{{ {a:1\\} }}`, and riot will unescape
_their escaped brackets_ only. riot..
- remove their brackets and obtain the result: `{a:1\\}`.
- search for `\\}}` on the result: not found.
- try to evaluate the result.
Parse error.

