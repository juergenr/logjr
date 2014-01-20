logjr
=====

simple browser logging library

Features
--------
* set log level for console
* remote logging to included node.js logging server
* logs formatting
* write to file (on server side)
* browser page to watch remote logs

Usage
-----
###Include into page
```
<script src="logjr.js"></script>
```


###Use logger
```
var log = logjr.getLogger('scope', 'appid');  
log.setLogLevel('log');
log.debug('debug message');
log.log('log message');
log.info('log message');
log.warn('warning');
log.error('error message');
```

Methods:
* setConsoleEnabled(boolean)	//default true
* setRemoteEnabled(boolean)	    //default true
* setLoggingServer(string)		//default "http://localhost:8777"
* setLogLevel(string)			//default "debug"
* setFormat(string)				//default "{t} {r}[{l}] {a}:{s}: {m}"; 

Format
* {t}: Timestamp  e.g. 10:08:20.032
* {l}: level  e.g. [ERROR]
* {m}: message
* {s}: scope
* {a}: appid
* {c}: source
* {t}: stack trace
* {r}: remote address only in remote log
e.g. "{t} {r}[{l}] {a}:{s}: {m}" -> 17:54:49.859 127.0.0.1 [ERROR] appid:logger1: test error

Url Control:
* loglevel=log
* appid=prog1		//to differentiate multiple instances in the logfile
* remote=false		//no remote output
* console=false		//no console output


###Start the logging server (shows the logging messages in the console):

```
node server.js
```

###See the Logging information in an second browser
Start browser with http://localhost:8777


###Add Loglevel to standard console
The loglevel can be set by programmatically by ```logjr.setConsoleLogLevel("log");``` or by adding loglevel=log to the URL.
```
logjr.setConsoleLogLevel("log");
console.debug('debug');  //No output because of loglevel="log"
console.warn('warn');
```

ToDo
----
* testing


Credits
-------
[Stacktrace.js](https://github.com/stacktracejs/stacktrace.js)



