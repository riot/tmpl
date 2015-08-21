#!/usr/bin/env node
// -*- js -*-

/**
 * Simple filter to remove comments and duplicate empty lines
 * @author Alberto Martínez
 */

var exitCode = 0,
    DBGITEMS = ''       // comma delimited list of items to output to stderr:
                        // strings, regexps, jsdoc, comments, or '*' to all.
                        // e.g. 'regexps,jsdoc'

rmcomms()(process.argv)

/*
 * Wait for the stdout buffer to drain.
 */
process.on('exit', function (code) {

  process.exit(typeof code === 'number' ? code : exitCode)

})

/*
 * The CLI object should *not* call process.exit() directly. It should only return
 * exit codes. This allows other programs to use the CLI object and still control
 * when the program exits.
 */
function rmcomms() {

  //'use strict'

  //------------------------------------------------------------------------------
  // Data
  //------------------------------------------------------------------------------

  var VERSION = '0.1.0',

      // Invalid Unicode code points (ICH_) used for hide some parts of the expression
      ICH_MARKER = '\uFFF0',

      // Match a hidden quoted string marker, $1 capture the index to the qstring in the
      // hqs array of create (it is the qstring index in the whole template string, too).
      RE_MARKERS = /@(\d+)\uFFF0/g,

      // Matches single or double quoted strings, including empty ones and strings with
      // embedded escaped quotes and whitespace. $1 is the left quote (for back ref).
      RE_STRINGS = /('|")(?:[^\\]|\\.)*?\1/,

      // Matches (true?) regexps
      // Regexps can begin after: -+*%~^&|!=><?:{([,; void typeof /, or after \n (w/ ASI)
      // We don't expect regexp at the begin of the stream, nor direct js code, so we can
      // ignore the '^' marker ans CR/LF *within* regexps.
      // This can fail on cases as `var x = 20\n / 2 + 6 / 3`
      RE_REGEXPS = /([-\+\*%~^&\|!=><\?:{\(\[,;\r\n]\s*|\/\s+)\/(?!\/|\*)(?:\[(?:[^\]\\]|\\.)*|[^\/\\]|\\.)+\/[gmi]+/,

      // Matches multi-line comments in (almost) all of its forms, including
      // empty ones, nested opening sequences, and nested escaped comments.
      RE_COMMENTS = /\/\*[^*]*\*+(?:[^\/\*][^*]*\*+)*\//,

      // Matches single-line comments
      RE_COMMLINE = /\/\/[^\n\r]*/g,

      DEFINES = {
        '_VERSION': '"' + VERSION + '"',
        '_NODE': (typeof window !== 'object' ? '1' : '0')
      }

  var unknownOptionLoc    = 'Unknown option: "%s"',
      wrongNewlineTypeLoc = 'Wrong newline type: %s',
      wrongCompactModeLoc = 'Wrong compact mode: %s'

  var
      // Info for EOL normalization and compactation
      eolinfo = [
        ['\n',   '\\n{#,}'],
        ['\r\n', '\\r\\n{#,}'],
        ['\r',   '\\r{#,}']
      //[type   |normalization                |compactation]
      ],

      // Options for the module, output defaults to stdout
      options = {
        eoltype: 0,         // index to eolinfo[] is required
        compact: 1,         // 0:no empty lines, 1:one empty line, 2:no compact
        dbgitems: DBGITEMS  // comma delimited list of items to output to stderr
      }


  //------------------------------------------------------------------------------
  // Helpers
  //------------------------------------------------------------------------------

  /**
   * Process the stdin or input file.
   */
  function processInput() {

    var buffer = ''

    process.stdin.setEncoding('utf8')
    process.stdin.resume()

    process.stdin.on('data', function (chunk) {
      buffer += chunk
    })

    process.stdin.on('end', function () {
      try {

        process.stdout.write(replaceBuffer(buffer))

      } catch (ex) {
        console.error(ex.message)
        console.error(ex.stack)
        exitCode = 1
      }
    })

  }
  // end of processInput()

  /**
   * Remove comments and empty duplicate lines
   *
   * @param {string} buffer The input as a js string
   * @returns {string} The processed string with comments and dup eols removed
   */
  function replaceBuffer(buffer) {

    // `re` will find the items in the order shown, but not really matter how
    // you order in the regexp, you will find the right one.
    var re = new RegExp(
        RE_STRINGS.source  + '|' +        // $1: quote of string, first this
        RE_COMMENTS.source + '|' +        // multi line comments w/o capture
        RE_REGEXPS.source  + '|' +        // $2: left slash of regexp
        RE_COMMLINE.source,               // one line comments w/o capture
        'g'
      ),
      srs = [],
      pos = 0,
      eol = eolinfo[options.eoltype],
      rcd = options.dbgitems

    buffer = _cc(buffer)
            // replace strings and regexps, remove comments
            .replace(re, function (match, quote, slash, index) {
              if (quote || slash || /@license\b|^\/[\/\*]#norm:/.test(match)) {
                if (rcd)
                  rcDebug(buffer, rcd, quote ? 's' : slash ? 'r' : 'j', index, match)

                if (slash)
                  match = match.slice(slash.length)
                else
                  slash = ''

                srs[pos] = !(quote || slash) ?
                    match.replace(/^(\/[\/\*])#norm:/, '$1') :
                    match

                return slash + '@' + (pos++) + ICH_MARKER
              }

              if (rcd) rcDebug(buffer, rcd, 'c', index, match)

              return ''                   // remove comment
            })
            // trim trailing spaces and normalize eols
            .replace(/[ \t\f\v\b]*(?:\r\n?|\n)/g, eol[0])

    // remove duplicate empty lines?
    pos = options.compact | 0
    if (pos === 1 || !pos) {
      var rn = new RegExp(
        eol[1].replace('#', !pos ? '2' : '3'),
        'g')
      buffer = buffer.replace(rn, pos === 1 ? eol[0] + eol[0] : eol[0])
    }

    // retrieve strings and regexps and returns buffer
    return buffer
      .replace(RE_MARKERS, function (_, id) {
        return srs[id | 0]
      })

  }
  // end of stripComments()


  function rcDebug(str, rcd, cid, pos, match) {

    if (~rcd.indexOf(cid)) {
      var row = 1     // Sublime Text starts in 1
      str = str.slice(0, pos + 1).replace(/\r\n?|\n/g, function (s, i) {
        ++row
        return s
      })
      console.error('%s at %d len %d: %s',
        cid.toUpperCase(), row, match.length, match.slice(0, 60))
    }
  }


  /**
   * Create the options object from arguments in the command line.
   *
   * @param {Array} argv [Opt] arguments from the command line.
   * @returns {boolean} true if success.
   * @private
   */
  function _readOptions(argv) {

    if (Array.isArray(argv)) {

      for (var i = 2; i < argv.length && !exitCode; ++i) {
        switch (argv[i]) {
          case '--eoltype':
            options.eoltype = parseInt(argv[++i], 10)
            break
          case '--compact':
            options.compact = parseInt(argv[++i], 10)
            break
          case '--list':
            options.dbgitems = argv[++i]
            break
          case '-D':
            readDefines(argv[++i])
            break
          case '--help':
          case '-h':
            printHelp()
            exitCode = 1
            break
          case '-v':
            console.log(VERSION)
            exitCode = 1
            break
          default:
            if (argv[i].slice(0, 2) === '-D')
              readDefines(argv[i].slice(2))
            else {
              // exit with node.js default 'Invalid Argument' exit code
              console.error(unknownOptionLoc, argv[i])
              exitCode = 9
            }
            break
        }
      }
    }
    else {

      for (var k in Object.keys(argv || {})) {
        if (k in options)
          options[k] = argv[k]
      }
    }

    if (!exitCode) {

      var d = options.dbgitems
      if (d)
        options.dbgitems = d === '*' ? 'srjc' :
          d.replace(/(?:^| *,) *([a-zA-Z])/g, '$1').toLowerCase()

      if (isNaN(options.compact))
        options.compact = 1

      if (isNaN(options.eoltype) || options.eoltype < 0 || options.eoltype > 2) {
        console.error(wrongNewlineTypeLoc, options.eoltype)
        exitCode = 9
      }
      else
        return true
    }

    return false

    function readDefines(str) {
      var list = str.trim().split(','),
          def
      for (var i = 0; i < list.length; i++) {
        def = list[i].trim().split('=')
        DEFINES[def[0]] = def.length > 1 ? def[1] : '1'
      }
    }

  }
  // end of _readOptions()

  /**
   * Print help and exit
   */
  function printHelp() {

    console.log('\n' +
      'rmcomms version ' + VERSION + ' - MIT license (c) 2015 by The riot Team\n' +
      '  Simple filter to remove comments and compact empty lines.\n' +
      '  Reads from stdin and writes to stdout.\n' +
      ' \n' +
      'Usage:\n' +
      '  rmcomments [-h -v] [--eoltype type] [--nocompact] [-d itemlist]\n' +
      '  -h  Show this help\n' +
      '  -v  Print the version number and exits\n' +
      '  --eoltype type\n' +
      '      End of line normalization, type 0:Unix, 1:Window, 2:Mac\n' +
      '  --compact mode\n' +
      '      Do compact multiple empty lines, mode 0:no empty lines, 1:one line\n' +
      '  -list itemlist\n' +
      '      Trace items to stderr, s|string, r|regexp, j|jsdoc, c|comment\n' +
      '      e.g. `-list s,r` or `-list strings,comments`' +
      '  -D list\n' +
      '      Items to define for compilation conditional (numbers, default to "1")\n' +
      '      e.g. `-D DEBUG` or `-D"DEBUG,NDEBUG=0"`'
      )
  }
  // end of printHelp()


  //------------------------------------------------------------------------------
  // Public Interface
  //------------------------------------------------------------------------------

  /**
   * Encapsulates the process for rmcomments.
   *
   * @param {Object} options Object or process.argv array of user options.
   */
  return function (options) {

    /**
     * Executes the CLI based on an array of arguments that is passed in.
     * @param {string|Array|Object} args The arguments to process.
     * @param {string} [text] The text to lint (used for TTY).
     * @returns {int} The exit code for the operation.
     */

    exitCode = 0

    if (_readOptions(options))
      processInput()

  }
  // end of exports.run()

  /**
   * Conditional compilation - very basic support
   *
   * @private
   */
  function _cc(str) {
    var re1 = /^[\t\ ]*\/\*#if[\t\ ]*\((.+?)\)[\t\ ]*[\r\n]/m,
        re2 = /^[\t\ ]*#end[\t\ ]*#\*\/[\t\ ]*[\r\n]/m,
        match,
        out = '',
        GR = RegExp

    if (str.indexOf('/*#if') < 0) return str

    while (match = str.match(re1)) {

      var e = match[1].trim(),
          s = GR.leftContext              // keep this unconditional code block
      match = GR.rightContext.match(re2)  // search @end in the remaining, after @if
      if (!match)
        break

      out += s
      str = GR.rightContext
      s = GR.leftContext                  // remaining part, after @end
      if (parseExpr(e))
        out += s                          // ok to keep enclosed code
    }
    if (str) out += str

    return out

    // @inner
    function parseExpr(str) {
      var expr = str.replace(/\$(\w+)\b/g, function (_, v) {
            //throw new Error(v + ' is: ' + DEFINES[v] + '\nDEFINES: ' + JSON.stringify(DEFINES))
            return '' + DEFINES[v]
          })
      return (new Function('return ' + expr + ';'))()
    }
  }
  // end ccomp()

}
// end of rmcomms()
