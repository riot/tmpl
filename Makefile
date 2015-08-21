# Command line paths
KARMA = ./node_modules/karma/bin/karma
ISTANBUL = ./node_modules/karma-coverage/node_modules/.bin/istanbul
ESLINT = ./node_modules/eslint/bin/eslint.js
MOCHA = ./node_modules/mocha/bin/_mocha
COVERALLS = ./node_modules/coveralls/bin/coveralls.js
RMCOMMS = ./rmcomms.js

plain:
	@ cat src/utils.js src/brackets.js src/tmpl.js | $(RMCOMMS) > lib/index.js

build: plain
	@ cat lib/wrap/start.frag lib/index.js lib/wrap/end.frag > index.js

test: eslint test-karma

eslint: plain
	# check code style
	@ $(ESLINT) -c ./.eslintrc lib

test-karma:
	@ $(KARMA) start test/karma.conf.js

test-coveralls:
	@ RIOT_COV=1 cat ./coverage/lcov.info ./coverage/report-lcov/lcov.info | $(COVERALLS)


.PHONY: build test eslint test-karma test-coveralls
