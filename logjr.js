'use strict';

(function(context, factory) {
    if (typeof define === 'function' && define.amd) {
        define(['logjr'], factory);
    } else if (typeof exports === 'object') {
        module.exports = factory();
    } else {
        context.logjr = factory();
    }
}(this, function() {

    function logjr() {
        var Logger = function(scope, appid) {
            this.format = "{t} {r}[{l}] {a}:{s}: {m}"; 
            this.logLevel = "";
            this.logLevelN = -1; 
            this.scope =  scope || ""; 
            this.consoleEnabled = true;
            this.remoteEnabled = true;
            this.server = "http://localhost:8777";
            this.appId = getAppIdFromQuery() || appid || '';

            this.setLogLevel("debug");
            this.setRemoteEnabled(true);
            this.setConsoleEnabled(true);
        };
        function getQuery() {
            if (location.search != "") {
                var query = location.search.substr(1);  
                var data = query.split("&");  
                var result = {};
                for(var i=0; i<data.length; i++) {
                    var item = data[i].split("=");
                    result[item[0].toLowerCase()] = item[1];
                }
                return result;
            }    
        };
        function getLogLevelFromQuery() {
            var q = getQuery();
            return q && q['loglevel']
        };
        function getAppIdFromQuery() {
            var q = getQuery();
            return q && q['appid']
        };
        function getRemoteFromQuery() {
            var q = getQuery();
            return q && q['remote']
        };
        function getConsoleFromQuery() {
            var q = getQuery();
            return q && q['console']
        };

        //#region printStackTrace
        
        // Domain Public by Eric Wendelin http://eriwen.com/ (2008)
        //                  Luke Smith http://lucassmith.name/ (2008)
        //                  Loic Dachary <loic@dachary.org> (2008)
        //                  Johan Euphrosine <proppy@aminche.com> (2008)
        //                  Oyvind Sean Kinsey http://kinsey.no/blog (2010)
        //                  Victor Homyakov <victor-homyakov@users.sourceforge.net> (2010)

        /**
         * Main function giving a function stack trace with a forced or passed in Error
         *
         * @cfg {Error} e The error to create a stacktrace from (optional)
         * @cfg {Boolean} guess If we should try to resolve the names of anonymous functions
         * @return {Array} of Strings with functions, lines, files, and arguments where possible
         */
        function printStackTrace(options) {
            options = options || {guess: true};
            var ex = options.e || null, guess = !!options.guess;
            var p = new printStackTrace_implementation(), result = p.run(ex);
            return (guess) ? p.guessAnonymousFunctions(result) : result;
        };
        
        var printStackTrace_implementation = function() {
        };

        printStackTrace_implementation.prototype = {
            /**
             * @param {Error} ex The error to create a stacktrace from (optional)
             * @param {String} mode Forced mode (optional, mostly for unit tests)
             */
            run: function(ex, mode) {
                ex = ex || this.createException();
                // examine exception properties w/o debugger
                //for (var prop in ex) {alert("Ex['" + prop + "']=" + ex[prop]);}
                mode = mode || this.mode(ex);
                if (mode === 'other') {
                    return this.other(arguments.callee);
                } else {
                    return this[mode](ex);
                }
            },

            createException: function() {
                try {
                    this.undef();
                } catch (e) {
                    return e;
                }
            },

            /**
             * Mode could differ for different exception, e.g.
             * exceptions in Chrome may or may not have arguments or stack.
             *
             * @return {String} mode of operation for the exception
             */
            mode: function(e) {
                if (e['arguments'] && e.stack) {
                    return 'chrome';
                } else if (e.stack && e.sourceURL) {
                    return 'safari';
                } else if (e.stack && e.number) {
                    return 'ie';
                } else if (typeof e.message === 'string' && typeof window !== 'undefined' && window.opera) {
                    // e.message.indexOf("Backtrace:") > -1 -> opera
                    // !e.stacktrace -> opera
                    if (!e.stacktrace) {
                        return 'opera9'; // use e.message
                    }
                    // 'opera#sourceloc' in e -> opera9, opera10a
                    if (e.message.indexOf('\n') > -1 && e.message.split('\n').length > e.stacktrace.split('\n').length) {
                        return 'opera9'; // use e.message
                    }
                    // e.stacktrace && !e.stack -> opera10a
                    if (!e.stack) {
                        return 'opera10a'; // use e.stacktrace
                    }
                    // e.stacktrace && e.stack -> opera10b
                    if (e.stacktrace.indexOf("called from line") < 0) {
                        return 'opera10b'; // use e.stacktrace, format differs from 'opera10a'
                    }
                    // e.stacktrace && e.stack -> opera11
                    return 'opera11'; // use e.stacktrace, format differs from 'opera10a', 'opera10b'
                } else if (e.stack && !e.fileName) {
                    // Chrome 27 does not have e.arguments as earlier versions,
                    // but still does not have e.fileName as Firefox
                    return 'chrome';
                } else if (e.stack) {
                    return 'firefox';
                }
                return 'other';
            },

            /**
             * Given a context, function name, and callback function, overwrite it so that it calls
             * printStackTrace() first with a callback and then runs the rest of the body.
             *
             * @param {Object} context of execution (e.g. window)
             * @param {String} functionName to instrument
             * @param {Function} callback function to call with a stack trace on invocation
             */
            instrumentFunction: function(context, functionName, callback) {
                context = context || window;
                var original = context[functionName];
                context[functionName] = function instrumented() {
                    callback.call(this, printStackTrace().slice(4));
                    return context[functionName]._instrumented.apply(this, arguments);
                };
                context[functionName]._instrumented = original;
            },

            /**
             * Given a context and function name of a function that has been
             * instrumented, revert the function to it's original (non-instrumented)
             * state.
             *
             * @param {Object} context of execution (e.g. window)
             * @param {String} functionName to de-instrument
             */
            deinstrumentFunction: function(context, functionName) {
                if (context[functionName].constructor === Function &&
                        context[functionName]._instrumented &&
                        context[functionName]._instrumented.constructor === Function) {
                    context[functionName] = context[functionName]._instrumented;
                }
            },

            /**
             * Given an Error object, return a formatted Array based on Chrome's stack string.
             *
             * @param e - Error object to inspect
             * @return Array<String> of function calls, files and line numbers
             */
            chrome: function(e) {
                var stack = (e.stack + '\n').replace(/^\S[^\(]+?[\n$]/gm, '').
                  replace(/^\s+(at eval )?at\s+/gm, '').
                  replace(/^([^\(]+?)([\n$])/gm, '{anonymous}()@$1$2').
                  replace(/^Object.<anonymous>\s*\(([^\)]+)\)/gm, '{anonymous}()@$1').split('\n');
                stack.pop();
                return stack;
            },

            /**
             * Given an Error object, return a formatted Array based on Safari's stack string.
             *
             * @param e - Error object to inspect
             * @return Array<String> of function calls, files and line numbers
             */
            safari: function(e) {
                return e.stack.replace(/\[native code\]\n/m, '')
                    .replace(/^(?=\w+Error\:).*$\n/m, '')
                    .replace(/^@/gm, '{anonymous}()@')
                    .split('\n');
            },

            /**
             * Given an Error object, return a formatted Array based on IE's stack string.
             *
             * @param e - Error object to inspect
             * @return Array<String> of function calls, files and line numbers
             */
            ie: function(e) {
                var lineRE = /^.*at (\w+) \(([^\)]+)\)$/gm;
                return e.stack.replace(/at Anonymous function /gm, '{anonymous}()@')
                    .replace(/^(?=\w+Error\:).*$\n/m, '')
                    .replace(lineRE, '$1@$2')
                    .split('\n');
            },

            /**
             * Given an Error object, return a formatted Array based on Firefox's stack string.
             *
             * @param e - Error object to inspect
             * @return Array<String> of function calls, files and line numbers
             */
            firefox: function(e) {
                return e.stack.replace(/(?:\n@:0)?\s+$/m, '').replace(/^[\(@]/gm, '{anonymous}()@').split('\n');
            },

            opera11: function(e) {
                var ANON = '{anonymous}', lineRE = /^.*line (\d+), column (\d+)(?: in (.+))? in (\S+):$/;
                var lines = e.stacktrace.split('\n'), result = [];

                for (var i = 0, len = lines.length; i < len; i += 2) {
                    var match = lineRE.exec(lines[i]);
                    if (match) {
                        var location = match[4] + ':' + match[1] + ':' + match[2];
                        var fnName = match[3] || "global code";
                        fnName = fnName.replace(/<anonymous function: (\S+)>/, "$1").replace(/<anonymous function>/, ANON);
                        result.push(fnName + '@' + location + ' -- ' + lines[i + 1].replace(/^\s+/, ''));
                    }
                }

                return result;
            },

            opera10b: function(e) {
                // "<anonymous function: run>([arguments not available])@file://localhost/G:/js/stacktrace.js:27\n" +
                // "printStackTrace([arguments not available])@file://localhost/G:/js/stacktrace.js:18\n" +
                // "@file://localhost/G:/js/test/functional/testcase1.html:15"
                var lineRE = /^(.*)@(.+):(\d+)$/;
                var lines = e.stacktrace.split('\n'), result = [];

                for (var i = 0, len = lines.length; i < len; i++) {
                    var match = lineRE.exec(lines[i]);
                    if (match) {
                        var fnName = match[1]? (match[1] + '()') : "global code";
                        result.push(fnName + '@' + match[2] + ':' + match[3]);
                    }
                }

                return result;
            },

            /**
             * Given an Error object, return a formatted Array based on Opera 10's stacktrace string.
             *
             * @param e - Error object to inspect
             * @return Array<String> of function calls, files and line numbers
             */
            opera10a: function(e) {
                // "  Line 27 of linked script file://localhost/G:/js/stacktrace.js\n"
                // "  Line 11 of inline#1 script in file://localhost/G:/js/test/functional/testcase1.html: In function foo\n"
                var ANON = '{anonymous}', lineRE = /Line (\d+).*script (?:in )?(\S+)(?:: In function (\S+))?$/i;
                var lines = e.stacktrace.split('\n'), result = [];

                for (var i = 0, len = lines.length; i < len; i += 2) {
                    var match = lineRE.exec(lines[i]);
                    if (match) {
                        var fnName = match[3] || ANON;
                        result.push(fnName + '()@' + match[2] + ':' + match[1] + ' -- ' + lines[i + 1].replace(/^\s+/, ''));
                    }
                }

                return result;
            },

            // Opera 7.x-9.2x only!
            opera9: function(e) {
                // "  Line 43 of linked script file://localhost/G:/js/stacktrace.js\n"
                // "  Line 7 of inline#1 script in file://localhost/G:/js/test/functional/testcase1.html\n"
                var ANON = '{anonymous}', lineRE = /Line (\d+).*script (?:in )?(\S+)/i;
                var lines = e.message.split('\n'), result = [];

                for (var i = 2, len = lines.length; i < len; i += 2) {
                    var match = lineRE.exec(lines[i]);
                    if (match) {
                        result.push(ANON + '()@' + match[2] + ':' + match[1] + ' -- ' + lines[i + 1].replace(/^\s+/, ''));
                    }
                }

                return result;
            },

            // Safari 5-, IE 9-, and others
            other: function(curr) {
                var ANON = '{anonymous}', fnRE = /function\s*([\w\-$]+)?\s*\(/i, stack = [], fn, args, maxStackSize = 10;
                while (curr && curr['arguments'] && stack.length < maxStackSize) {
                    fn = fnRE.test(curr.toString()) ? RegExp.$1 || ANON : ANON;
                    args = Array.prototype.slice.call(curr['arguments'] || []);
                    stack[stack.length] = fn + '(' + this.stringifyArguments(args) + ')';
                    curr = curr.caller;
                }
                return stack;
            },

            /**
             * Given arguments array as a String, substituting type names for non-string types.
             *
             * @param {Arguments,Array} args
             * @return {String} stringified arguments
             */
            stringifyArguments: function(args) {
                var result = [];
                var slice = Array.prototype.slice;
                for (var i = 0; i < args.length; ++i) {
                    var arg = args[i];
                    if (arg === undefined) {
                        result[i] = 'undefined';
                    } else if (arg === null) {
                        result[i] = 'null';
                    } else if (arg.constructor) {
                        if (arg.constructor === Array) {
                            if (arg.length < 3) {
                                result[i] = '[' + this.stringifyArguments(arg) + ']';
                            } else {
                                result[i] = '[' + this.stringifyArguments(slice.call(arg, 0, 1)) + '...' + this.stringifyArguments(slice.call(arg, -1)) + ']';
                            }
                        } else if (arg.constructor === Object) {
                            result[i] = '#object';
                        } else if (arg.constructor === Function) {
                            result[i] = '#function';
                        } else if (arg.constructor === String) {
                            result[i] = '"' + arg + '"';
                        } else if (arg.constructor === Number) {
                            result[i] = arg;
                        }
                    }
                }
                return result.join(',');
            },

            sourceCache: {},

            /**
             * @return the text from a given URL
             */
            ajax: function(url) {
                var req = this.createXMLHTTPObject();
                if (req) {
                    try {
                        req.open('GET', url, false);
                        //req.overrideMimeType('text/plain');
                        //req.overrideMimeType('text/javascript');
                        req.send(null);
                        //return req.status == 200 ? req.responseText : '';
                        return req.responseText;
                    } catch (e) {
                    }
                }
                return '';
            },

            /**
             * Try XHR methods in order and store XHR factory.
             *
             * @return <Function> XHR function or equivalent
             */
            createXMLHTTPObject: function() {
                var xmlhttp, XMLHttpFactories = [
                    function() {
                        return new XMLHttpRequest();
                    }, function() {
                        return new ActiveXObject('Msxml2.XMLHTTP');
                    }, function() {
                        return new ActiveXObject('Msxml3.XMLHTTP');
                    }, function() {
                        return new ActiveXObject('Microsoft.XMLHTTP');
                    }
                ];
                for (var i = 0; i < XMLHttpFactories.length; i++) {
                    try {
                        xmlhttp = XMLHttpFactories[i]();
                        // Use memoization to cache the factory
                        this.createXMLHTTPObject = XMLHttpFactories[i];
                        return xmlhttp;
                    } catch (e) {
                    }
                }
            },

            /**
             * Given a URL, check if it is in the same domain (so we can get the source
             * via Ajax).
             *
             * @param url <String> source url
             * @return <Boolean> False if we need a cross-domain request
             */
            isSameDomain: function(url) {
                return typeof location !== "undefined" && url.indexOf(location.hostname) !== -1; // location may not be defined, e.g. when running from nodejs.
            },

            /**
             * Get source code from given URL if in the same domain.
             *
             * @param url <String> JS source URL
             * @return <Array> Array of source code lines
             */
            getSource: function(url) {
                // TODO reuse source from script tags?
                if (!(url in this.sourceCache)) {
                    this.sourceCache[url] = this.ajax(url).split('\n');
                }
                return this.sourceCache[url];
            },

            guessAnonymousFunctions: function(stack) {
                for (var i = 0; i < stack.length; ++i) {
                    var reStack = /\{anonymous\}\(.*\)@(.*)/,
                        reRef = /^(.*?)(?::(\d+))(?::(\d+))?(?: -- .+)?$/,
                        frame = stack[i], ref = reStack.exec(frame);

                    if (ref) {
                        var m = reRef.exec(ref[1]);
                        if (m) { // If falsey, we did not get any file/line information
                            var file = m[1], lineno = m[2], charno = m[3] || 0;
                            if (file && this.isSameDomain(file) && lineno) {
                                var functionName = this.guessAnonymousFunction(file, lineno, charno);
                                stack[i] = frame.replace('{anonymous}', functionName);
                            }
                        }
                    }
                }
                return stack;
            },

            guessAnonymousFunction: function(url, lineNo, charNo) {
                var ret;
                try {
                    ret = this.findFunctionName(this.getSource(url), lineNo);
                } catch (e) {
                    ret = 'getSource failed with url: ' + url + ', exception: ' + e.toString();
                }
                return ret;
            },

            findFunctionName: function(source, lineNo) {
                // FIXME findFunctionName fails for compressed source
                // (more than one function on the same line)
                // function {name}({args}) m[1]=name m[2]=args
                var reFunctionDeclaration = /function\s+([^(]*?)\s*\(([^)]*)\)/;
                // {name} = function ({args}) TODO args capture
                // /['"]?([0-9A-Za-z_]+)['"]?\s*[:=]\s*function(?:[^(]*)/
                var reFunctionExpression = /['"]?([$_A-Za-z][$_A-Za-z0-9]*)['"]?\s*[:=]\s*function\b/;
                // {name} = eval()
                var reFunctionEvaluation = /['"]?([$_A-Za-z][$_A-Za-z0-9]*)['"]?\s*[:=]\s*(?:eval|new Function)\b/;
                // Walk backwards in the source lines until we find
                // the line which matches one of the patterns above
                var code = "", line, maxLines = Math.min(lineNo, 20), m, commentPos;
                for (var i = 0; i < maxLines; ++i) {
                    // lineNo is 1-based, source[] is 0-based
                    line = source[lineNo - i - 1];
                    commentPos = line.indexOf('//');
                    if (commentPos >= 0) {
                        line = line.substr(0, commentPos);
                    }
                    // TODO check other types of comments? Commented code may lead to false positive
                    if (line) {
                        code = line + code;
                        m = reFunctionExpression.exec(code);
                        if (m && m[1]) {
                            return m[1];
                        }
                        m = reFunctionDeclaration.exec(code);
                        if (m && m[1]) {
                            //return m[1] + "(" + (m[2] || "") + ")";
                            return m[1];
                        }
                        m = reFunctionEvaluation.exec(code);
                        if (m && m[1]) {
                            return m[1];
                        }
                    }
                }
                return '(?)';
            }
        };
        //#endregion

        Logger.prototype = {       
            error: function(msg) {
                if (this.logLevelN >= 1) {
                    this._sendLog(msg, "error");
                }
            },
            warn: function(msg) {
                if (this.logLevelN >= 2) {
                    this._sendLog(msg, "warn");
                }
            },
            info: function(msg) {
                if (logLevelN >= 3) {
                    this._sendLog(msg, "info");
                }
            },
            log:function(msg) {
                if (this.logLevelN >= 4) {
                    this._sendLog(msg, "log");
                }
            },
            debug: function(msg) {
                if (this.logLevelN >= 5) {
                    this._sendLog(msg, "debug");
                }
            },
            _sendLog: function(msg, level) {
                var txt = this._doformat(msg, level);
                var loctxt = txt.replace('{r}', '');

                if (this.consoleEnabled) {
                    if (level === "error")
                        console.error(loctxt);
                    if (level === "warn")
                        console.warn(loctxt);
                    if (level === "info")
                        console.info(loctxt);
                    if (level === "log")
                        console.log(loctxt);
                    if (level === "debug")
                        console.debug(loctxt);
                }

                if (this.remoteEnabled) {
                    var xmlhttp;
                    if (window.XMLHttpRequest) {
                        xmlhttp = new XMLHttpRequest();
                    } else {
                        xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
                    }

                    xmlhttp.onreadystatechange = function() {
                        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
                            //console.debug('sent log');
                        }
                    }
                    xmlhttp.open("POST", this.server, true);
                    xmlhttp.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
                    xmlhttp.send(txt);
                }
            },
            _getClass: function () {
                var trace = printStackTrace();
                var line = trace[7];
                return line;
            },
            _getStack: function () {
                var trace = printStackTrace();
                var stack = '\r\n\t' + trace.join('\r\n\t');
                return stack;
            },
            _getTimeStamp: function () {
                var time = new Date();
                var h = "0" + time.getHours();
                var m = "0" + time.getMinutes();
                var s = "0" + time.getSeconds();
                var u = "00" + time.getMilliseconds();
                var s = h.substr(h.length - 2) + ":" + m.substr(m.length - 2) + ":" + s.substr(s.length - 2) + "." + u.substr(u.length - 3);
                return s;
            },    
            _doformat: function(msg, level) {
                var s = this.format;
                s = s.replace("{t}", this._getTimeStamp());
                s = s.replace("{l}", (level + "   ".substr(0,5-level.length)).toUpperCase());
                s = s.replace("{m}", msg);
                s = s.replace("{s}", this.scope);
                s = s.replace("{a}", this.appId);
                s = s.replace("{c}", this._getClass());
                s = s.replace("{s}", this._getStack());
                return s;
            },
            setFormat: function(format) {
                logjr.format = format;
            },
            setLogLevel: function (logLevel) {
                this.logLevel = getLogLevelFromQuery() || logLevel;
                if (this.logLevel.toLowerCase() === "off")
                    this.logLevelN = 0;
                if (this.logLevel.toLowerCase() === "error")
                    this.logLevelN = 1;
                if (this.logLevel.toLowerCase() === "warn")
                    this.logLevelN = 2;
                if (this.logLevel.toLowerCase() === "info")
                    this.logLevelN = 3;
                if (this.logLevel.toLowerCase() === "log")
                    this.logLevelN = 4;
                if (this.logLevel.toLowerCase() === "debug")
                    this.logLevelN = 5;
            },
            setConsoleEnabled:  function(enabled) {              
                if (getConsoleFromQuery() === undefined)
                    this.consoleEnabled = enabled;
                else
                    this.consoleEnabled = (getConsoleFromQuery() === "true");
            },
            setRemoteEnabled:  function(enabled) {
                if (getRemoteFromQuery() === undefined)
                    this.remoteEnabled = enabled;
                else
                    this.remoteEnabled = (getRemoteFromQuery() === "true");
            },
            setLoggingServer: function(server) {
                this.server = server; 
            }
        };

        var factory = {
            logLevel: "error",
            logLevelN: -1,
            debug: console.debug,
            log: console.log,
            info: console.info,
            warn: console.warn,
            error: console.error,

            setConsoleLogLevel: function (logLevel) {
                this.logLevel = getLogLevelFromQuery() || logLevel;
                if (this.logLevel.toLowerCase() === "off")
                    this.logLevelN = 0;
                if (this.logLevel.toLowerCase() === "error")
                    this.logLevelN = 1;
                if (this.logLevel.toLowerCase() === "warn")
                    this.logLevelN = 2;
                if (this.logLevel.toLowerCase() === "info")
                    this.logLevelN = 3;
                if (this.logLevel.toLowerCase() === "log")
                    this.logLevelN = 4;
                if (this.logLevel.toLowerCase() === "debug")
                    this.logLevelN = 5;

                console.debug = this.debug;
                console.log = this.log;
                console.info = this.info;
                console.warn = this.warn; 
                console.error = this.error;

                if (this.logLevelN < 1) {
                    console.error = function () { return; };    
                }
                if (this.logLevelN < 2) {
                    console.warn = function () { return; };    
                }
                if (this.logLevelN < 3) {
                    console.info = function () { return; };    
                }
                if (this.logLevelN < 4) {
                    console.log = function () { return; };    
                }
                if (this.logLevelN < 5) {
                    console.debug = function () { return; };    
                }

            },

            //--------------------------------------
            getLogger: function(scope, appid) {
                return new Logger(scope, appid);
            }
        };

        factory.setConsoleLogLevel("debug");
        return factory;
    };
   
    return new logjr();

}));






