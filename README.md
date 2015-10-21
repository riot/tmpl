[![Build Status][travis-image]][travis-url]
[![Code Quality][codeclimate-image]][codeclimate-url]
[![NPM version][npm-version-image]][npm-url]
[![NPM downloads][npm-dn-image]][npm-url]
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


## Changes in 2.3

* Brackets can not contain characters in the set `[\x00-\x1F<>a-zA-Z0-9'",;\\]`
* No comments in expressions, the compiler is the only that strip comments
* Attributes with expressions containing `>` must be quoted

Please read the [CHANGES](doc/CHANGES.md) file in the doc folder.


[npm-version-image]: https://img.shields.io/npm/v/riot-tmpl.svg?style=flat-square
[npm-dn-image]:      https://img.shields.io/npm/dm/riot-tmpl.svg?style=flat-square
[npm-url]:           https://npmjs.org/package/riot-tmpl
[license-image]:     https://img.shields.io/badge/license-MIT-000000.svg?style=flat-square
[license-url]:       LICENSE
[travis-image]:      https://img.shields.io/travis/riot/tmpl.svg?style=flat-square
[travis-url]:        https://travis-ci.org/riot/tmpl
[coverage-image]:    https://img.shields.io/coveralls/riot/tmpl/master.svg?style=flat-square
[coverage-url]:      https://coveralls.io/r/riot/tmpl/?branch=master
[codeclimate-image]: https://img.shields.io/codeclimate/github/riot/tmpl.svg?style=flat-square
[codeclimate-url]:   https://codeclimate.com/github/riot/tmpl
