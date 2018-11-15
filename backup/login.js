var process = require('process');

process.env.NODE_ENV = 'production';

var thisServer = ""; //what is this server called? (process)
var thisPort = 0; //what port will this server use? (process)

function tellMasta(what, contents) {
  process.send({ type: what, stuff: contents });
}

process.on('message', function(data) {
  var type = data.type;
  var stuff = data.stuff;
  switch (type) {
    case 'init':
      console.log('I, "' + stuff.name + '" was just born.')
      tellMasta('thumbsup', stuff.name);
      thisPort = stuff.port;
      thisServer = stuff.name;
      startServer();
      break;
  }
});

//SERVER STUFF
var express = require('express');
var app = express();
var esession = require('express-session');
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var path = require('path');
var _ = require("underscore");
var random = require('random-gen');
var cookie = require('cookie');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var compression = require('compression');
//var Ddos = require('ddos');
//var ddos = new Ddos;
var sanitizer = require('sanitizer');

//DATABASE
var locallydb = require('locallydb');
var db = new locallydb('./userdb');
var userinfo = db.collection('userinfo');

const key = "randomstuff901263476";
var encryptor = require('simple-encryptor')(key);

app.use(compression());

//app.use(ddos.express)
app.use( bodyParser.json() );
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(function (req, res, next) {
    if ((req.url.indexOf('html') >= 0)) {
        res.redirect(':'+thisPort+'/home');
    }
    else {
      next();
    }
});


app.use(express.static(path.join(__dirname, 'login')));

var game = io.of('/game');
var login = io.of('/home');

var Session = require('express-session');
    var myStore = new Session.MemoryStore();
    var session = Session({
      store: myStore,
      secret: '190g93h1g9h1039gh309399gj3g23kkkll2001alallaa',
      resave: true,
      saveUninitialized: true
    });
    
app.use(session);

login.use(function(socket, next) {
  session(socket.handshake, {}, next);
});

//authenticated people
var sval = [];

app.use('/', function(req, res, next) {
  var valid = req.session.key;
  if (!valid) {
    var enc = genKey(0);
    req.session.key = new gkey(enc, 'unauth');
    console.log("Session w/ id: " + req.session.key.key + " session created.");
  }
  next();
});

var login_dir = './login/';

app.get('/', function(req, res) {
  res.redirect('https://silentnight-sbojevets.c9users.io:'+thisPort+'/home');
});

app.get('/game.html', function(req, res) {
  res.redirect('https://silentnight-sbojevets.c9users.io:'+thisPort+'/home');
});

app.get('/home', function(req, res) {
  res.sendFile('home.html', { root: login_dir });
});


//LOGIN PAGE STUFF
login.on('connection', function(socket) {
  var ck = {key: undefined, name: "", port: ""};
  if (socket.handshake.headers.cookie !== "" && socket.handshake.headers.cookie !== undefined && socket.handshake.headers.cookie !== null) {
    if (typeof socket.handshake.headers.cookie.key === "string") {
      ck = cookie.parse(socket.handshake.headers.cookie);
    }
  }
  var valid = {key: ck.key, name: ck.name, port: ck.port};
  if (valid.key == undefined && socket.handshake.session.key !== undefined) {
    valid.key = socket.handshake.session.key.key;
  }
  if (valid !== undefined) {
    if (valid.key == undefined) {
      valid.key = socket.handshake.session.id;
    }
    var isv = aoIndex(sval, valid.key, 'key'); //is valid
    var key = valid.key
    var name = valid.name;
    console.log(key + " AKA " + name + " went to '/login.'");
    
    socket.on('login', function(guest, port, who, pass, isnew) {
      if (who === undefined || who == "") {
        who = 'guest';
      }
      if (guest) {
        console.log("Guest " + key + " AKA " + who + " logged in.");
        var val = new auth(key, who, port, 'guest');
        sval.push(val);
        tellMasta('successlogin', val);
        socket.emit('success', port, val);
      }
      else if (!guest) {
        if (pass !== undefined && pass !== "") {
          var users = userinfo.items;
          var uindex = aoIndex(users, who, 'name');
          if (uindex == -1 && isnew) { //succesful account creation
            userinfo.insert({name: who, password: encryptor.encrypt(pass), highscore: 0, money: 100, inventory: ["black"], selected: 'black'});
            console.log("New user " + key + " AKA " + who + " created an account.");
            var val = new auth(key, who, port, 'user');
            sval.push(val);
            socket.emit('alert', 'Congragulations', 'Account created!', 'success');
            setTimeout(function() {
              tellMasta('successlogin', val);
              socket.emit('success', port, val);
            }, 1500);
          }
          else if (uindex !== -1 && isnew) { //username already exists
            socket.emit('alert', 'Sorry', 'That username already exists!', 'error');
          }
          else if (uindex !== -1 && !isnew) { //username exists
            if (encryptor.decrypt(users[uindex].password) == pass) { //correct pass, logged
              console.log("User " + key + " AKA " + who + " logged in.");
              var val = new auth(key, who, port, 'user');
              sval.push(val);
              tellMasta('successlogin', val);
              socket.emit('success', port, val);
            }
            else { //incorrect pass, not logged
              // console.log('incorrect password');
              socket.emit('alert', 'Sorry', 'Incorrect password!', 'error');
            }
          }
          else if (uindex == -1 && !isnew) {
            socket.emit('alert', 'Sorry', 'No such account exists!', 'error');
          }
        }
      }
    });
  }
  else {
    console.log(socket.handshake.headers);
    console.log("Huh? Weird login page access...");
  }
});

function gkey(key, name) {
  var self = this;
  self.key = key;
  self.name = name;
}

function auth(key, name, port, type) {
  var self = this;
  self.key = key;
  self.name = name;
  self.port = port;
  self.type = type;
}

//KEY GENERATORS
function genKey(it) {
  var rkey = random.alphaNum(32);
  if (sval.indexOf(rkey) == -1) {
    return rkey;
  }
  else {
    console.log("Generation key already exists: " + it + " iterations.");
    genKey(it + 1);
  }
}


function aoIndex(a, t, p) {
  for (var i = 0, len = a.length; i < len; i++) {
      if (a[i][p] === t) return i;
  }
  return -1;
}

function startServer() {
  http.timeout = 0;
  http.listen(thisPort, process.env.IP || "0.0.0.0", function() {
    var addr = http.address();
    console.log("Login server listening at: " + addr.address + ":" + addr.port + ", pid: " + process.pid);
  });
}

setInterval(function() {
  sessionCleanup();
}, 5000);

function sessionCleanup() {
    myStore.all(function(err, sessions) {
      if (err) console.log(err)
      else
        for (var i = 0; i < sessions.length; i++) {
            myStore.get(sessions[i], function() {} );
        }
    });
}
