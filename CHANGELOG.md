# riot-tmpl Changes

### v2.3.15
- Regression of optimized regexes not working in IE9/10.
- Fix [riot#1416](https://github.com/riot/riot/issues/1416) : Issue with space in expression of `each`.
- Fix: when calling the compiler with different brackets, `brackets.array` changes the global configuration (`riot.settings.brackets`).
- Both, `brackets` and `tmpl`, has a new property `version` (string).
- Brackets changes in browsers though `riot.settings.brackets` has immediate effect and always reflect the brackets in use, the `brackets.settings` property is not neccesary and will be removed in v2.4.0

### v2.3.14
- Fix #11 : Can't output expressions without evaluation.
- Fixed issues with regex detection in brackets.js and revision of other regexes.
- Fixed issues with istanbul and new versions of npm in the Makefile.
- Revision of devDependencies, including istanbul for npm 2/3 compatibility.
- Preparation for recognize the raw-html flag `=` (can change in the final implementation).
- Preparation for use as ES6 module through [rollup.js](http://rollupjs.org/)
- Removed internal functions from the documentation.
- Updated tests.