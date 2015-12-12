# jspreproc flags
#JSPP_DEBUG = -D DEBUG -D SHOW_PARSE_ERRORS
JSPP_FLAGS = -F istanbul -F eslint --custom-filter "\s@(module|version)\b" --headers ""
JSPP_RIOT_FLAGS = $(JSPP_FLAGS) -D RIOT
JSPP_ES6_FLAGS  = $(JSPP_FLAGS) -D ES6
JSPP_NODE_FLAGS = $(JSPP_FLAGS) -D NODE --indent 2

# Command line paths
COVERALLS = ./node_modules/coveralls/bin/coveralls.js
ESLINT    = ./node_modules/eslint/bin/eslint.js
ISTANBUL  = ./node_modules/istanbul/lib/cli.js
KARMA     = ./node_modules/karma/bin/karma
MOCHA     = ./node_modules/mocha/bin/_mocha
JSPP      = ./node_modules/jspreproc/bin/jspp.js

TESTCOVER = $(TRAVIS_BRANCH) $(TRAVIS_NODE_VERSION)

# if no "v" var given, default to package version
v ?= $(shell node -pe "require('./package.json').version")

# expand variable (so we can use it on branches w/o package.json)
VERSION := $(v)

# folders
DIST = "./dist/"

test: build test-mocha test-karma

build: eslint
	# rebuild all
	@ mkdir -p $(DIST)
	@ $(JSPP) $(JSPP_RIOT_FLAGS) lib/index.js > $(DIST)riot.tmpl.js
	@ $(JSPP) $(JSPP_ES6_FLAGS)  lib/index.js > $(DIST)es6.tmpl.js
	@ $(JSPP) $(JSPP_NODE_FLAGS) lib/index.js > $(DIST)tmpl.js

bump:
	# Bump the version
	@ sed -i '' 's/WIP/v$(VERSION)/' $(DIST)*tmpl.js

eslint:
	# check code style
	@ $(ESLINT) -c ./.eslintrc lib

test-karma:
	@ $(KARMA) start test/karma.conf.js

test-browsers:
	@ BROWSERSTACK=1 $(KARMA) start test/karma.conf.js

test-mocha:
	@ $(ISTANBUL) cover --dir ./coverage/ist $(MOCHA) -- test/runner.js

send-coverage:
	@ RIOT_COV=1 cat ./coverage/ist/lcov.info ./coverage/report-lcov/lcov.info | $(COVERALLS)
ifeq ($(TESTCOVER),master 4.2)
	@ npm install codeclimate-test-reporter
	@ codeclimate-test-reporter < coverage/ist/lcov.info
else
	@ echo Send in master 4.2
endif

debug: build
	@ node-debug --debug-port 5859 $(MOCHA) test/runner.js

perf: build
	@ node --expose-gc test/perf.js

.PHONY: test build eslint test-karma test-browsers test-mocha send-coverage debug perf
