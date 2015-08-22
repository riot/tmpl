# Command line paths
KARMA = ./node_modules/karma/bin/karma
ISTANBUL = ./node_modules/karma-coverage/node_modules/.bin/istanbul
ESLINT = ./node_modules/eslint/bin/eslint.js
MOCHA = ./node_modules/mocha/bin/_mocha
COVERALLS = ./node_modules/coveralls/bin/coveralls.js
UGLIFY = ./node_modules/uglify-js/bin/uglifyjs
RMCOMMS = ./node_modules/rmcomms/bin/rmcomms-cli.js

raw:
	@ cat lib/utils.js lib/brackets.js lib/tmpl.js | $(RMCOMMS) > dist/tmpl.riot.js

build: raw
	# umd version
	@ cat lib/wrap/start.frag dist/tmpl.riot.js lib/wrap/end.frag > dist/tmpl.js
	@ $(UGLIFY) dist/tmpl.js --comments --mangle -o dist/tmpl.min.js

test: eslint test-karma

eslint: raw
	# check code style
	@ $(ESLINT) -c ./.eslintrc lib

test-karma:
	@ $(KARMA) start test/karma.conf.js

test-coveralls:
	@ RIOT_COV=1 cat ./coverage/lcov.info ./coverage/report-lcov/lcov.info | $(COVERALLS)

debug: raw
	@ node-debug $(MOCHA) -d test/runner.js

.PHONY: raw build test eslint debug test-karma test-coveralls
