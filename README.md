logjr
=====

simple logging library for the browser

Features
--------
* set log level for console
* remote logging to included node.js logging server
* logs formatting
* write to file (on server side)
* browser to watch remote logs

Usage
-----
#Use standard console

The loglevel can be set by programmatically by ```logjr.setConsoleLogLevel("log");``` or by adding loglevel=log to the URL.
```
<script src="logjr.js"></script>
<script type="text/javascript">
	logjr.setConsoleLogLevel("log");
    console.debug('debug');  //No output because of loglevel="log"
    console.warn('warn');
</script>
```


#Use remote logging

The loglevel can be set by programmatically by ```log.setLogLevel("log");``` or by adding loglevel=log to the URL.
```
var log = logjr.getLogger();
log.setLogLevel('log');
log.rdebug('debug message');
log.rlog('log message');
log.rwarn('warning');
```

#Start the logging server (shows the logging messages in the console):

```
node server.js
```

#See the Logging information in an second browser
Start browser with http://localhost:8777


ToDo
----
* support other browsers beside Chrome


