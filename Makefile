# jspreproc flags
#JSPP_DEBUG = -D DEBUG -D SHOW_PARSE_ERRORS -F istanbul -F eslint
JSPP_DEBUG = -F istanbul -F eslint
JSPP_RIOT_FLAGS = $(JSPP_DEBUG) --custom-filter "\s@module\b"
JSPP_NODE_FLAGS = $(JSPP_DEBUG) -D NODE --indent 2

# Command line paths
KARMA = ./node_modules/karma/bin/karma
ISTANBUL = ./node_modules/karma-coverage/node_modules/.bin/istanbul
ESLINT = ./node_modules/eslint/bin/eslint.js
MOCHA = ./node_modules/mocha/bin/_mocha
COVERALLS = ./node_modules/coveralls/bin/coveralls.js
JSPP = ./node_modules/jspreproc/bin/jspp.js

# folders
DIST = "./dist/"

test: build test-karma

build: eslint
	# rebuild all
	@ mkdir -p $(DIST)
	@ $(JSPP) $(JSPP_RIOT_FLAGS) lib/index.js > $(DIST)riot.tmpl.js
	@ $(JSPP) $(JSPP_NODE_FLAGS) lib/index.js > $(DIST)tmpl.js

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

.PHONY: test build eslint test-karma test-coveralls test-mocha debug
