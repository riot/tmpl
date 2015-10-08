# jspp flags
#JSPP_FLAGS = "-D DEBUG -D SHOW_PARSE_ERRORS"
JSPP_FLAGS =

# Command line paths
KARMA = ./node_modules/karma/bin/karma
ISTANBUL = ./node_modules/karma-coverage/node_modules/.bin/istanbul
ESLINT = ./node_modules/eslint/bin/eslint.js
MOCHA = ./node_modules/mocha/bin/_mocha
COVERALLS = ./node_modules/coveralls/bin/coveralls.js
JSPP = ./node_modules/.bin/jspp $(JSPP_FLAGS)

# folders
DIST = "./dist/"

test: build test-karma

build: eslint
	# rebuild all
	@ $(JSPP) lib/index.js --indent 0 > $(DIST)riot.tmpl.js
	@ $(JSPP) lib/index.js -D MODULE > $(DIST)tmpl.js

eslint:
	# check code style
	@ $(ESLINT) -c ./.eslintrc lib

test-karma:
	@ $(KARMA) start test/karma.conf.js

test-coveralls:
	@ RIOT_COV=1 cat ./coverage/lcov.info ./coverage/report-lcov/lcov.info | $(COVERALLS)

test-mocha:
	NODE_PATH=$NODE_PATH:$(DIST) $(MOCHA) test/runner.js

debug:
	NODE_PATH=$NODE_PATH:$(DIST) node-debug $(MOCHA) test/runner.js

.PHONY: build test eslint debug test-karma test-mocha test-coveralls
