
# The Changes

I'll try to explain the reason for the some changes in tmpl 2.3.x

## Escaped brackets, backslashes, and EOLs

Escaped brackets _within expressions_ are left unescaped, except in JavaScript strings and regexes, where are preserved. So far, I have not found a case where the brackets must remain escaped.

Backslashes in the HTML parts are not touched.

EOLs are normalized to `\n` in the HTML, converted to compact spaces in expressions, and preserved in JavaScript strings and regexes.

## Handling evaluation errors

The new `tmpl.errorHandler` property allows to detect errors _in the evaluation_, by setting its value to a function that receives the generated Error object, augmented with an object `riotData` containing the properties `tagName` and `\_riot_id` of the context at error time.

Other (usually fatal) errors, such as "Parse Error" generated for the Function constructor, are not intercepted.

If this property is not set, or set to falsy, as in previous versions the error is silently ignored.

Ref: [riot#1189](https://github.com/riot/riot/issues/1189)

## Why to use tmpl.hasExpr and tmpl.loopKeys?

Encapsulation. Changes to the internal `tmpl` or `brackets` function are easy if other code don't depends on the format of parsed expressions. `hasExpr` and `loopKeys` has optimized regexes to do the work and the riot code can stay a bit clearer.

`tmpl.hasExpr` is intended for general use, while `loopKeys` is useful only for riot.

## The new brackets function

In my personal opinion this function must have been designed as an array from the beginning, configured by riot at the instantiation time, and from the user via an explicit function call, without the possibility of further changes; plus an auxiliary function to convert custom regexes.

brackets 2.3 combines the behavior of brackets 2.2 with a new one, based on these idea. There is a performance penalty in supporting both, but compatibility is maintained.

If riot is available when `brackets` is instantiated, `brackets` will use the configuration in `riot.settings`. If not, you can link a configuration later, through the new `brackets.settings` property, which accepts a reference to `riot.settings` or other object where read and write new brackets values.

The other, recommended option, is call to the new `breackets.set` function with the value for the brackets. The only difference is `brackets.set` checks and make the changes immediately, while using the `settings` property the reconfiguration is delayed to first use.

There's more new functions and properties added to `brackets`, you can use the regexes, these will be maintained, but the additional functions are for internal use.

It is all, syntax and behavior are the same as older versions: `brackets(regex_or_number)`.

## Characters not allowed in brackets

There are characters not allowed to define brackets, some are common characters in JavaScript expressions that hinder finding the right riot brackets, and other are forbidden by the HTML specs for text elements.

This is the list of invalid characters:

- Control characters from `\x00` to `\x1F` that can be changed by browsers or minifier tools
- Alphanumeric `a-z`, `A-Z`, and `0-9`, wich are confused with JS variable names
- Single and double quotes, comma, semicolon and backslash `'`, `"`, `,`, `;`, `\`, for obvious reasons
- The dangerous `<` and `>` characters, reserved for use in markup and strictly prohibited in unquoted text for any other purpose -- out of CDATA sections.

Typically, by using '<>' the browser will send to riot something different to what the user wants. With preprocessors such as ASP, no problems. But riot is not one of them, even with precompiled tags, it's a postprocessor. See the difference:

#### ASP

Source &#x2013;>   | ASP parser &#x2013;> | Browser
-------------------|----------------|-----------
`<p><%= x %></p>`  |    `<p>X</p>`  |  (Renders "X")  


ASP takes the value of `x`, does the substitution, and stops here. The browser (HTML parser) receives valid HTML.

#### riot

Source &#x2013;>  | Browser &#x2013;>    | riot parser &#x2013;>
------------------|----------------------|----------------
`<p><%= x %></p>` | Renders `<p><></p>`? | `<p><></p>`

Here the browser (some version of IE) receives invalid markup and try to render the best it can without break the page (i.e. "fix" the error). riot has no chance to get the expression and re-render the value. Other browser _can_ keep the markup as-is depending on its location in the elements. Anyway, the result is unpredictable.

_@amarcruz_
