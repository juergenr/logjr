var logjr = (function() {
    var Logger = function(scope) {
        //this.format= "{t} [{l}]: {m}   {c}"; 
        this.format= "{t} {a}[{l}] {s}: {m}"; 
        this.logLevel= "";
        this.logLevelN= -1; 
        this.scope= scope; 
        this.consoleEnabled = false;
        this.server = "http://localhost:8777";
        this.app = "";

        this.setLogLevel("debug");
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
    }
    function getLogLevel() {
        var q = getQuery();
        return q && q['loglevel']
    }


    Logger.prototype = {       
        rerror: function(msg) {
            if (this.logLevelN >= 1) {
                this._sendLog(msg, "error");
            }
        },
        rwarn: function(msg) {
            if (this.logLevelN >= 2) {
                this._sendLog(msg, "warn");
            }
        },
        rinfo: function(msg) {
            if (logLevelN >= 3) {
                this._sendLog(msg, "info");
            }
        },
        rlog:function(msg) {
            if (this.logLevelN >= 4) {
                this._sendLog(msg, "log");
            }
        },
        rdebug: function(msg) {
            if (this.logLevelN >= 5) {
                this._sendLog(msg, "debug");
            }
        },
        _sendLog: function(msg, level) {
            var txt = this._doformat(msg, level);
            var loctxt = txt.replace('{a}', '');

            if (this.consoleEnabled && (level === "error"))
                console.error(loctxt);
            if (this.consoleEnabled && (level === "warn"))
                console.warn(loctxt);
            if (this.consoleEnabled && (level === "info"))
                console.info(loctxt);
            if (this.consoleEnabled && (level === "log"))
                console.log(loctxt);
            if (this.consoleEnabled && (level === "debug"))
                console.debug(loctxt);


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
	    },
        _getClass: function (level) {
            if (!level)
                level = 1;
            var e = new Error();
            var stack = e.stack;

            var lines = stack.match(/at (.*)/g);
            var line = lines[level].substr(3);
            if (line.substr(0, 4) == "new ")
                line = line.substr(4);
            var className = line.split(" ")[0];
            if (className == "Object.<anonymous>") {
                className = line.split(" ")[1];
                className = className.replace(/^\(/, ''); //trim left (
                className = className.replace(/\)$/, ''); //trim right )
                var items = className.split("/");
                className = items[items.length - 1];
            }
            return className;
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
            s = s.replace("{c}", this._getClass(4));
            return s;
        },
        setFormat: function(format) {
            logjr.format = format;
        },
        setLogLevel: function (logLevel) {
            this.logLevel = getLogLevel() || logLevel;
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
            this.consoleEnabled = enabled;
        },
        setLoggingServer: function(server) {
            this.server = server; 
        },
        setLoggingServer: function(server) {
            this.server = server; 
        }
    }

    factory = {
        logLevel: "error",
        logLevelN: -1,
        debug: console.debug,
        log: console.log,
        info: console.info,
        warn: console.warn,
        error: console.error,

        setConsoleLogLevel: function (logLevel) {
            this.logLevel = getLogLevel() || logLevel;
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
        getLogger: function(scope) {
            return new Logger(scope);
        }
    }

    factory.setConsoleLogLevel("debug");
    return factory;
})();
 







