[![Build Status][travis-image]][travis-url]
[![Code Quality][codeclimate-image]][codeclimate-url]
[![NPM version][npm-version-image]][npm-url]
[![NPM downloads][npm-downloads-image]][npm-url]
[![MIT License][license-image]][license-url]
[![Coverage Status][coverage-image]][coverage-url]

# Tmpl

The riot template engine

## Installation

### Npm

```sh
npm install riot-tmpl --save
```

### Bower

```sh
$ bower install riot-tmpl --save
```

## Documentation

### How it works?


Three ways:

- Expressions: `tmpl('{ value }', data)`.  
  Returns the result of evaluated expression as a raw object.

- Templates: `tmpl('Hi { name } { surname }', data)`.  
  Returns a string with evaluated expressions.

- Filters: `tmpl('{ show: !done, highlight: active }', data)`.  
  Returns a space separated list of trueish keys (mainly used for setting html classes), e.g. "show highlight".


### Template examples

```js
tmpl('{ title || "Untitled" }', data)
tmpl('Results are { results ? "ready" : "loading" }', data)
tmpl('Today is { new Date() }', data)
tmpl('{ message.length > 140 && "Message is too long" }', data)
tmpl('This item got { Math.round(rating) } stars', data)
tmpl('<h1>{ title }</h1>{ body }', data)
```


### Falsy expressions in templates

In templates (as opposed to single expressions) all falsy values except zero (undefined/null/false) will default to empty string:

```js
tmpl('{ undefined } - { false } - { null } - { 0 }', {})
// will return: " - - - 0"
```

### Precompiled expressions

tmpl has separated the evaluation process of the compilation, now you need to call `tmpl.compile()` for pre-compilate the expression before using `tmpl()`, like in this example:

```js
var tmpl = riot.util.tmpl    // or require('tmpl').tmpl
var expr = '{ msg }'
var pcexpr = tmpl.compile(expr)
// now you can assign pcexpr to an attribute value or evaluate anywhere
console.log(tmpl(pcexpr, {msg: "Hi"}))    // outputs "Hi"
```

The riot compiler can be used for pre-compilate all expressions in your application.
If you don't need runtime construction of expressions, you can use the minimum version of riot: _riot-light.js_, that exclude the expression compiler.

**NOTE:**
Precompiling all expressions avoids errors with restrictions on environments blocking the `Function` constructor (i.e. `eval`) 


### Handling errors

Since v2.4, tmpl can catch error information in your application.

To enable this feature, set the `tmpl.errorHandler` property to any function that receive a string parameter (e.g. `console.error`). The parameter has the format "riot: %T:%I : %E", where
* `%T` is the tag name where the error happens ('-no-name-' for unnamed tags)
* `%I` is the tag _riot_id property ('-' for tags with no _riot_id)
* `%E` is the full error stack or message

If there's no tag available, `%T:%I` contains "-no-data-:-".  

The message can be easily parsed. Next example logs the tag name, id, and error message, and discards the stack.

```js
function myHandler(msg) {
  var parts = ('' + msg).match(/^riot\: ([^:]+):(-|\d+)? : (.+)/)
  if (parts)
    addToMyLogAndSendMeAnEmail('riot error', parts[1], parts[2], parts[3])  
  else
    console.log('Non riot error: ' + msg)
}

riot.util.tmpl.errorHandler = myHandler
```

### New restrictions

* Brackets can not contain characters in the set `[\x00-\x1F<>a-zA-Z0-9'",;\\]`
* No comments in expressions, the compiler is the only that strip comments
* Attributes with expressions containing `>` must be quoted

Sorry, you can't use `<% %>` anymore.

Remember, use double quotes around attributes when creating tags with riot.tag


[travis-image]:https://img.shields.io/travis/riot/tmpl.svg?style=flat-square
[travis-url]:https://travis-ci.org/riot/tmpl

[license-image]:http://img.shields.io/badge/license-MIT-000000.svg?style=flat-square
[license-url]:LICENSE.txt

[npm-version-image]:http://img.shields.io/npm/v/riot-tmpl.svg?style=flat-square
[npm-downloads-image]:http://img.shields.io/npm/dm/riot-tmpl.svg?style=flat-square
[npm-url]:https://npmjs.org/package/riot-tmpl

[coverage-image]:https://img.shields.io/coveralls/riot/tmpl/master.svg?style=flat-square
[coverage-url]:https://coveralls.io/r/riot/tmpl/?branch=master

[codeclimate-image]:https://img.shields.io/codeclimate/github/riot/tmpl.svg?style=flat-square
[codeclimate-url]:https://codeclimate.com/github/riot/tmpl
