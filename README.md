[![Build Status][travis-image]][travis-url]
[![Code Quality][codeclimate-image]][codeclimate-url]
[![NPM version][npm-version-image]][npm-url]
[![NPM downloads][npm-downloads-image]][npm-url]
[![MIT License][license-image]][license-url]
[![Coverage Status][coverage-image]][coverage-url]

# Tmpl

Riot template engine

## Documentation

### How it works?


Three ways:

- Expressions: `tmpl('{ value }', data)`.<br />
  Returns the result of evaluated expression as a raw object.

- Templates: `tmpl('Hi { name } { surname }', data)`.<br />
  Returns a string with evaluated expressions.

- Filters: `tmpl('{ show: !done, highlight: active }', data)`.<br />
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

In templates (as opposed to single expressions) all falsy values
except zero (undefined/null/false) will default to empty string:

```js
tmpl('{ undefined } - { false } - { null } - { 0 }', {})
// will return: " - - - 0"
```

## Installation

### Npm

`$ npm install riot-tmpl --save`

### Bower

`$ bower install riot-tmpl --save`

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
