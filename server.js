var http = require('http');
var fs = require('fs');
var url = require('url');
var os=require('os');

var ifaces=os.networkInterfaces();

var logs = [];

var listeningPort = 8777;
console.log("logging server listening on port " + listeningPort);
require('dns').lookup(require('os').hostname(), function (err, add, fam) {
  console.log("logging page in browser: http://" + add + ":" + listeningPort);
})
//console.log("Read logs: " + ifaces[0][0] + listeningPort);

http.createServer(function (request, res) {
    if (request.method === "POST") {
        //logging
        var data = "";
        request.on("data", function (chunk) {
            data += chunk;
        });

        request.on("end", function () {
            //add address
            data = data.replace("{r}", request.connection.remoteAddress + " ");

            //add to array
            logs.push(data + "\r\n");
            if (logs.length > 1000)
                logs.shift();

            //log to console
            console.log(data);

            //log to file
            var dt = new Date();
            var y = dt.getFullYear();
            var m = "0"+(dt.getMonth()+1);
            var d = "0"+dt.getDate();
            var file = y +"."+ m.substr(m.length - 2) +"."+  d.substr(d.length - 2)+ ".log";
            fs.appendFile(file, data + "\r\n", function (err) {
                if (err)
                    console.error(err);
            });

        });
        res.writeHead(200, {
            'Content-Type': 'text/html',
            'Access-Control-Allow-Origin': '*'
        });
        res.end();
    } else if (request.method === "GET") {
        //deliver logging page
        var url_parts = url.parse(request.url, true);
        var count = url_parts.query.count || 30;
        count = Math.min(count, logs.length);

        res.writeHead(200, { "Content-Type": "text/html" });
        res.write("<!DOCTYPE \"html\">\r\n");
        res.write("<html>\r\n");
        res.write("<head>\r\n");
        res.write("<meta http-equiv=\"refresh\" content=\"1\">");
        res.write("<title>Logging</title>\r\n");
        res.write("</head>\r\n");
        res.write("<body>\r\n");
        res.write("<pre>\r\n");
        res.write("Logs:\r\n\r\n");
        for (var i = 0; i < count; i++) {
            res.write(logs[logs.length - count + i]);
        }
        res.write("</pre>\r\n");
        res.write("</body>\r\n");
        res.write("</html>\r\n");

        res.end();
    }


    //console.log('receved'+ req.);
}).listen(8777);