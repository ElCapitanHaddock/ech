var http = require('follow-redirects').http;
var url = require('url');

http.createServer(onRequest).listen(8082);
console.log("Tunnel listening at: " + "0.0.0.0" + ":" + "8082" + ", pid: " + process.pid);

function onRequest(client_req, client_res) {
  var ref = client_req.headers.referer;
  var q = "www.google.com";
  var p = client_req.url;
  var o = 80;
  if (ref !== undefined) {
    var tq = url.parse(ref).query;
    if (tq !== null) {
      if (tq.includes("q=")) {
        tq = tq.replace("q=", "");
        tq = url.parse(tq);
        if (tq.hostname !== null) {
          q = tq.hostname;
          p = tq.path;
          o = tq.port;
        }
      }
    }
  }
  
  //if (q.indexOf("www.") == -1) {
  //  q = "www." + q; 
  //}

  var options;
  options = {
    hostname: q,
    port: o,
    path: client_req.url,
    method: 'GET',
    followAllRedirects: true
  };
  
  //console.log("query: " + q);
  
  console.log('serve (' + options.hostname + '): ' + client_req.url);
  
  var proxy = http.request(options, function (res) {
    client_res.writeHead(res.statusCode, res.headers);
    res.pipe(client_res, {
      end: true
    });
  });

  client_req.pipe(proxy, {
    end: true
  });
}

