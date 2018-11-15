var process = require('process');

process.env.NODE_ENV = 'production';

console.log("MASTER SERVER INITIATED, pid: " + process.pid);
 

var http = require('http');
var exec = require('child_process');

//server list
var servers = [{name: 'server1', port: 8080, fork: ''}, {name: 'server2', port: 8081, fork: '', auth: []}];

for (var i = 0; i < servers.length; i++) {
    servers[i].fork = new game(servers[i].name, servers[i].port);
}

//server process
function game(name, port) {
    var self = this;
    self.name = name;
    self.port = port;
    self.proc = exec.fork(__dirname + '/server.js');
    self.func = {};
    var func = self.func;
    var child = self.proc;
    func.init = function() {
        child.on('message', function(data) {
            var type = data.type;
            var stuff = data.stuff;
            switch(type) {
                case 'thumbsup':
                    console.log('Process named "' + stuff + '" was initialized.');
                    break;
                case 'log':
                    console.log(stuff);
                    break;
            }
        });
        child.on('close', function(code) {
            console.log('Process closed: ' + code);
        });
        func.tellKiddo('init', { name: self.name, port: self.port });
    }
    func.tellKiddo = function(what, contents) {
        child.send({ type: what, stuff: contents });
    }
    func.init();
}

function aoIndex(a, t, p) {
  for (var i = 0, len = a.length; i < len; i++) {
      if (a[i][p] === t) return i;
  }
  return -1;
}





