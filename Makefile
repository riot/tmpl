# jspreproc flags
JSPP_FLAGS = -F istanbul -F eslint --custom-filter "\s@(module|version)\b" --headers ""
JSPP_RIOT_FLAGS = $(JSPP_FLAGS) -D RIOT
JSPP_ES6_FLAGS  = $(JSPP_FLAGS) -D ES6
JSPP_CSP_FLAGS  = $(JSPP_FLAGS) -D CSP
JSPP_NODE_FLAGS = $(JSPP_FLAGS) -D NODE --indent 2

# Command line paths
COVERALLS 	= ./node_modules/coveralls/bin/coveralls.js
ESLINT    	= ./node_modules/eslint/bin/eslint.js
ISTANBUL 		= ./node_modules/istanbul/lib/cli.js
KARMA     	= ./node_modules/karma/bin/karma
MOCHA     	= ./node_modules/mocha/bin/_mocha
BROWSERIFY  = ./node_modules/browserify/bin/cmd.js

JSPP      = ./node_modules/jspreproc/bin/jspp.js

TESTCOVER = $(TRAVIS_BRANCH) $(TRAVIS_NODE_VERSION)

# folders
DIST = "./dist/"

test: build test-mocha test-karma

build: eslint
	# rebuild all
	@ mkdir -p $(DIST)
	@ $(JSPP) $(JSPP_RIOT_FLAGS) src/index.js > $(DIST)riot.tmpl.js
	@ $(JSPP) $(JSPP_ES6_FLAGS)  src/index.js > $(DIST)es6.tmpl.js
	@ $(JSPP) $(JSPP_NODE_FLAGS) src/index.js > $(DIST)tmpl.js
	# build the csp version
	@ $(JSPP) $(JSPP_CSP_FLAGS)  src/index.js > $(DIST)csp.tmpl_tmp.js
	@ $(BROWSERIFY) $(DIST)csp.tmpl_tmp.js -o $(DIST)csp.tmpl.js
	@ rm $(DIST)csp.tmpl_tmp.js


eslint:
	# check code style
	@ $(ESLINT) -c ./.eslintrc.yml src

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
