'esversion: 6'

var process = require('process');

process.env.NODE_ENV = 'production';


var thisServer = ""; //what is this server called? (process)
var thisPort = 0; //what port will this server use? (process)
var backBonus = 5; //backstab bonus

function tellMasta(what, contents) {
  process.send({ type: what, stuff: contents });
}

process.on('message', function(data) {
  var type = data.type;
  var stuff = data.stuff;
  switch (type) {
    case 'init':
      console.log('I, "' + stuff.name + '" was just born.');
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
var helmet = require('helmet');
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
var sanitizer = require('sanitizer');

const key = "C5sUlRtsD8vPfGL4M0Rgr9wh0EGEVN";
var encryptor = require('simple-encryptor')(key);

//DATABASE
var locallydb = require('locallydb');
var db = new locallydb('./userdb');
var userinfo = db.collection('userinfo');

app.use(compression());
app.use(helmet());

app.use( bodyParser.json() );
app.use(bodyParser.urlencoded({
  extended: true
}));

var client_dir = './client/';
app.get('/', function(req, res) {
  res.sendFile('index.html', { root: client_dir });
});
app.use(express.static(path.join(__dirname, 'client')));
var Session = require('express-session');
    var myStore = new Session.MemoryStore();
    var session = Session({
      store: myStore,
      secret: '190g93h1g9h1039gh309399gj3g23kkkll2001alallaa',
      resave: true,
      saveUninitialized: true
    });
app.use(session);

var nameLimit = 15;
var globalDeleteTime = 1000 * 60 * 3;
var rooms = [];
var ghosts = [];

//initialization
var globalOriginAuth = random.alphaNum(16);
createRoom('room1', {origin: 'Jeremy', password:'', originroom: 'none'}, null);

function getRooms() {
  var tr = [];
  for (var i = 0; i < rooms.length; i++) {
    var r = rooms[i].pub;
    if (!r.private) {
      tr.push(r);
    }
  }
  return tr;
}

function createRoom(name, info, socket) {
  if (name !== undefined && info !== undefined) {
    if (name.replace(/ /g, '').length !== 0) {
      var inst = new instance(name, info);
      rooms.push(inst);
      inst.func.autoJoin();
    }
    else if (name.replace(/ /g, '').length == 0) {
      
    }
  }
}

function deleteRoom(id) {
  var i = aoIndex(rooms, id, 'id');
  if (i !== -1) {
    rooms[i].func.die();
  }
}

function addUserTo(where, name, socket, unique, logged) { //add user to room
  var i = aoIndex(rooms, where, 'id'); //by id
  socket.instance = where;
  if (i !== -1 && i !== undefined) {
    rooms[i].func.addUser(name, socket.id, socket, unique, logged);
  }
}

function removeFrom(where, id) { //remove user from room
  var i = aoIndex(rooms, where, 'id');
  if (i !== -1 && i !== undefined) {
    var uref = getUserFrom(where, id);
    rooms[i].func.removeUser(id, false, false);
  }
}

function removeGhost(id) { //remove user from room
  var i = aoIndex(ghosts, id, 'id');
    if (i !== -1 && i !== undefined) {
      ghosts.splice(i);
    }
}

function getUserFrom(where, id) { //get user from
  var i = aoIndex(rooms, where, 'id');
  if (i !== -1 && i !== undefined) {
    return rooms[i].func.getUser(id);
  }
}

function instance(name, info) {
  var self = this; //instance
  self.name = name;
  self.info = info;
  self.origin = info.origin;
  self.pub = {}; //public
  self.sec = {}; //secret
  self.func = {}; //functions
  self.users = []; //users
  var pub = self.pub;
  var sec = self.sec;
  var func = self.func;
  var users = self.users;
  
  func.identify = function(it) {
    var rkey = random.alphaNum(16);
    if (aoIndex(rooms, rkey, 'id') == -1) {
      return rkey;
    }
    else {
      console.log("Room identifier (instance) already, exists, " + it + " iterations.");
      func.identify(it + 1);
    }
  }
  
  func.die = function() {
    if (pub.alive) {
      pub.alive = false;
      io.to(self.id).emit('deleted', self.pub.name, self.pub.originAuth);
      for (var i = 0; i < users.length; i++) {
        users[i].socket.instance = 'lobby';
        users[i].socket.join('lobby');
        addUserTo('lobby', users[i].pub.name, users[i].socket, users[i].pub.unique, users[i].pub.logged);
      }
      for (var i = 0; i < users.length; i++) {
        func.removeUser(users[i].id, false, true);
      }
      if (aoIndex(rooms, self.id, 'id') !== -1) {
        rooms.splice(aoIndex(rooms, self.id, 'id'));
        console.log(self.pub.name + ' by ' + self.pub.originAuth + ' was deleted.');
      }
    }
  }
  
  func.getUsers = function() {
    var tu = [];
    for (var i = 0; i < users.length; i++) {
      var u = users[i].pub;
      tu.push(u);
    }
    return tu;
  }
  
  if (rooms.length == 0) {
    self.id = 'lobby';
  }
  else {
    self.id = func.identify(0);
  }
  pub.locked = false;
  sec.password = info.password;
  if (typeof sec.password == 'string') {
    if (sec.password.replace(/ /g, '').length !== 0) {
      pub.locked = true;
    }
  }
  pub.alive = true;
  pub.id = self.id; //identifier
  pub.name = name; //room name
  pub.origin = info.origin; //who created
  pub.originName = 'none';
  pub.originAuth = 'none';
  pub.auth = pub.name;
  var i = aoIndex(ghosts, info.origin, 'id');
  if (i !== -1 && i !== undefined) {
    pub.originAuth = ghosts[i].pub.auth;
    pub.originName = ghosts[i].pub.name;
    pub.auth = pub.name + ' by ' + pub.originAuth;
  }
  pub.private = info.priv;
  
  func.addUser = function(name, id, socket, unique, logged) { //new user
    clearTimeout(self.deleteTime);
    socket.instance = self.id;
    socket.join(self.id);
    var pl = new func.user(name, id, socket, unique, logged);
    users.push(pl);
    var j = aoIndex(ghosts, id, 'id');
    if (j == -1) {
      ghosts.push(pl);
    }
    else {
      ghosts[i] = pl;
    }
    var i = aoIndex(users, pub.originAuth, 'auth');
    if (i !== -1 && i !== undefined) {
      users[i].pub.stat = 'admin';
    }
  }
  
  self.deleteTime;
  func.removeUser = function(id, kicked, fromDelete) {
    var i = aoIndex(users, id, 'id');
    if (i !== -1 && i !== undefined) {
      users[i].func.funeral(kicked, fromDelete);
      users.splice(i, 1);
    }
    if (users.length == 0 && self.id !== 'lobby') {
      clearTimeout(self.deleteTime);
      self.deleteTime = setTimeout(function() {
        if (users.length == 0 && self.id !== 'lobby') {
          deleteRoom(self.id);
        }
      }, globalDeleteTime);
    }
  }
  
  func.getUser = function(id) {
    var i = aoIndex(users, id, 'id');
    if (i !== -1 && i !== undefined) {
      return users[i];
    }
    else {
      return -1;
    }
  }
  
  //user class
  func.user = function(name, id, socket, unique, logged) {
    var user = this;
    user.name = name;
    user.func = {};
    user.pub = {};
    user.socket = socket; //socket reference
    user.logged = logged; //logged in or not? username
    var userFunc = user.func;
    var userPub = user.pub;
    var socket = user.socket;
    user.id = id;
    userPub.id = id;
    userPub.name = name; 
    userPub.stat = 'normal';
    userPub.location = pub.auth;
    userPub.logged = logged;
    
    userFunc.identify = function(it) {
      var ukey = random.alphaNum(3);
      var taken = false; //already taken
      for (var i = 0; i < ghosts.length; i++) {
        if (ghosts[i].auth == userPub.name + '.' + ukey) {
          taken = true;
          break;
        }
        else continue;
      }
      if (!taken) {
        return ukey;
      }
      else if (taken) {
        console.log("User unique identifier already, exists, " + it + " iterations.");
        userFunc.identify(it + 1);
      }
    }
    if (logged !== 'guest') {
      user.unique = 'u';
    }
    else if (logged == 'guest') {
      if (unique == 'new') {
        user.unique = userFunc.identify(0);
      }
      else {
        user.unique = unique;
      }
    }
    userPub.unique = user.unique;
    user.auth = userPub.name + '.' + user.unique;
    userPub.auth = user.auth;
    
    userFunc.message = function(content) {
      var withoutSpace = content.replace(/ /g, '');
      if (withoutSpace.length !== 0) {
        io.to(self.id).emit('messaged', {who: userPub.name, content: content, id: userPub.id, auth: userPub.auth, stat: userPub.stat, type: 'normal', to: null});
        console.log("(" + pub.name + ") " + userPub.name + ': ' + content);
      }
      else {
        //empty message
      }
      socket.emit('success'); //msg succesfully sended
    }
    
    userFunc.whisper = function(ref, content) {
      if (content.replace(/ /g, '').length !== 0) {
        if (userPub.logged !== 'guest' && ref.logged !== 'guest') {
          ref.socket.emit('messaged', {who: userPub.name, content: content, id: userPub.id, auth: userPub.auth, stat: userPub.stat, type: 'whisper'} );
          socket.emit('messaged', {who: ref.name, content: content, id: userPub.id, auth: ref.auth, stat: userPub.stat, type: 'whisper'} );
        }
        else if (ref.pub.logged == 'guest') {
          socket.emit('alert', 'Error', "Only logged-in users can get whispers.", 'error', 5000);
        }
      }
    }
    
    userFunc.execute = function(what) { //execute command
      var command = what;
      if (command.indexOf(' ') !== -1) {
        command = what.substr(0, what.indexOf(' '));
      }
      var context = what.substr(what.indexOf(' '));
      var context2;
      var len = context.split(" ").length - 1;
      if (len == 2) {
        context = context.replace(' ', '');
        var temp = context.toString();
        context = temp.substr(0, temp.indexOf(' '));
        context2 = temp.substr(temp.indexOf(' '));
      }
      context = context.replace(/ /g, '');
      if (context2 !== undefined) {
        context2 = context2.replace(/ /g, '');
      }
      switch(command) {
        case 'kick':
          if (userPub.stat == 'admin' && userPub.auth !== context) {
            var i = aoIndex(users, context, 'auth');
            if (i !== -1 && i !== undefined) {
              addUserTo('lobby', users[i].pub.name, users[i].socket, users[i].pub.unique, users[i].pub.logged);
              func.removeUser(users[i].pub.id, true, false);
            }
            else if (i == -1) {
              socket.emit('alert', 'Error', "User not found! Kick by id, i.e. Bob.1234 rather than Bob)", 'error', 5000);
            }
          }
          else if (context == userPub.name) {
            socket.emit('alert', 'Error', "You can't kick yourself!", 'error', 3500);
          }
          else if (userPub.stat !== 'admin') {
            socket.emit('alert', 'Error', 'You must be an admin to kick.', 'error', 3500);
          }
          else if (context == '') {
            //empty
          }
          else {
            socket.emit('alert', 'Error', 'Unknown error.', 'error', 3500);
          }
          break;
        case 'password':
          if (userPub.stat == 'admin') {
            if (context.replace(/ /g, '').length == 0) {
              pub.locked = false;
              sec.password = '';
            }
            else {
              pub.locked = true;
              sec.password = context;
              socket.emit('alert', 'Success', 'Password changed!', 'success', 3500);
            }
          }
          else if (userPub.stat !== 'admin') {
            socket.emit('alert', 'Error', 'You must be an admin to change the password.', 'error', 3500);
          }
          break;
        case 'delete':
          if (userPub.stat == 'admin') {
             deleteRoom(self.id);
          }
          else if (userPub.stat !== 'admin') {
            socket.emit('alert', 'Error', 'You must be an admin to delete the room.', 'error', 3500);
          }
          break;
        case 'whisper':
          if (userPub.logged !== 'guest') {
            var i = aoIndex(ghosts, context, 'auth');
            if (i !== -1 && i !== undefined) {
              if (context !== '' && context2 !== false && context2 !== userPub.auth) {
                userFunc.whisper(ghosts[i], context2);
              }
            }
            else if (i == -1) {
              socket.emit('alert', 'Error', 'User not found!', 'error', 3500);
            }
          }
          else if (userPub.logged == 'guest') {
            socket.emit('alert', 'Error', "You must be logged in to whisper.", 'error', 5000);
          }
          break;
        default:
          socket.emit('alert', 'Error', 'There is no such command.', 'error', 3500);
          break;
      }
      socket.emit('success');
    }
    
    userFunc.joinRoom = function(id, pass) {
      var loc = aoIndex(rooms, id, 'id');
      if (id !== self.id && loc !== -1) {
        if (rooms[loc].sec.password == pass || rooms[loc].sec.password == '' || pass == globalOriginAuth) {
          console.log('User ' + user.id + ' AKA ' + user.pub.auth + ' is moving rooms.');
          addUserTo(id, userPub.name, socket, userPub.unique, userPub.logged);
          func.removeUser(user.id, false, false);
        }
        else if (rooms[loc].sec.password !== pass) {
          console.log('User ' + user.id + ' AKA ' + user.pub.auth + ' failed to join room1 (password).');
          if (pass.replace(/ /g, '').length !== 0) {
            socket.emit('alert', 'Error', 'Incorrect password!', 'error', 3500);
          }
        }
      }
      else if (loc == -1) {
        console.log("No such room '" + id + "' exists.");
        socket.emit('alert', 'Error', 'No such room exists!', 'error', 3500);
      }
      else if (id == self.id) {
        //already in that room
      }
      else {
        console.log("Unknown error.");
      }
    }
    
    userFunc.funeral = function(kicked, fromDelete) { //before removed
      if (fromDelete) {
        console.log('User ' + user.id + ' AKA ' + user.pub.auth + ' left with the deletion of ' + self.pub.name + '.');
      }
      else if (!kicked) {
        console.log('User ' + user.id + ' AKA ' + user.pub.auth + ' left ' + self.pub.name + '.');
      }
      else if (kicked) {
        console.log('User ' + user.id + ' AKA ' + user.pub.auth + ' was kicked from ' + self.pub.name + '.');
      }
      io.to(self.pub.id).emit('left', userPub.id, kicked, self.pub.name, fromDelete);
      socket.leave(self.pub.id);
    }
    
    userFunc.birth = function() {
      console.log('User ' + user.id + ' AKA ' + user.pub.auth + ' spawned in ' + self.pub.name + '.');
      socket.instance = self.pub.id;
      userPub.location = pub.auth;
      socket.join(self.pub.id);
      socket.emit('userlist', func.getUsers());
      io.to(self.pub.id).emit('joined', userPub);
    }
    
    userFunc.getUsers = function() {
      socket.emit('userlist', func.getUsers());
    }
    
    userFunc.getRooms = function() {
      socket.emit('roomlist', getRooms());
    }
    userFunc.birth();
  }
  
  func.autoJoin = function() { //autojoin creator
    if (self.info.originroom !== 'none') {
      var o = getUserFrom(self.info.originroom, self.origin);
      if (o !== -1 && o !== undefined) {
        o.func.joinRoom(self.id, globalOriginAuth);
      }
    }
  }
  
  func.init = function() { //room initialize
    console.log('Instance ' + self.id + ' AKA ' + self.pub.name + ' spawned by ' + self.pub.origin + '.');
    io.emit('created', pub);
  }
  func.init();
}


//I / O
io.on('connect', function(socket) {
  
  socket.instance = '';
  socket.emit('requestName');
  
  socket.on('disconnect', function() {
    removeFrom(socket.instance, socket.id);
    removeGhost(socket.id);
  });
  
  socket.on('getUsers', function() {
    if (socket.instance !== undefined) {
      var uref = getUserFrom(socket.instance, socket.id);
      if (uref !== undefined && uref !== -1) {
        uref.func.getUsers();
      }
    }
  });
  
  socket.on('getRooms', function() {
    if (socket.instance !== undefined) {
      var uref = getUserFrom(socket.instance, socket.id);
      if (uref !== undefined && uref !== -1) {
        uref.func.getRooms();
      }
    }
  });
  
  socket.on('setName', function(name) {
    if (name !== undefined && name !== null) {
      name = name.replace(/\\/g, '');
      name = name.replace(/ /g, '');
      if (socket.instance == '') {
        if (name.length > nameLimit) {
          name = name.slice(0, nameLimit);
        }
        socket.emit("succesEnter");
        socket.instance = 'lobby';
        addUserTo('lobby', name, socket, 'new', 'guest');
      }
    }
  });
  
  socket.on('login', function(info) {
    sanitizer.sanitize(info.name);
    sanitizer.sanitize(info.pass);
    info.name = info.name.replace(/ /g, '');
    if (info !== undefined) {
      if (info.pass.replace(/ /g, '').length !== 0 && info.pass !== undefined && info.name.replace(/ /g, '').length !== 0 && info.name !== undefined) {
        var users = userinfo.items;
        var uindex = aoIndex(users, info.name, 'name');
        if (uindex == -1) {
          socket.emit('requestLogin', "No account by the name of '" + info.name + "' exists!");
        }
        else if (encryptor.decrypt(users[uindex].password) !== info.pass) { //incorrect password
          socket.emit('requestLogin', "Incorrect password!");
        }
        else if (encryptor.decrypt(users[uindex].password) == info.pass)  { //correct password
          socket.emit("succesEnter");
          socket.instance = 'lobby';
          addUserTo('lobby', info.name, socket, 'new', info.name);
        }
      }
    } 
  });
  
  socket.on('createAccount', function(info) {
    sanitizer.sanitize(info.name);
    sanitizer.sanitize(info.pass);
    info.name = info.name.replace(/ /g, '');
    if (info !== undefined) {
      if (info.pass.replace(/ /g, '').length !== 0 && info.pass !== undefined && info.name.replace(/ /g, '').length !== 0 && info.name !== undefined) {
        var users = userinfo.items;
        var uindex = aoIndex(users, info.name, 'name');
        if (uindex == -1) { //succesful account creation
          userinfo.insert({name: info.name, password: encryptor.encrypt(info.pass)});
          console.log("New user " + socket.id + " AKA " + info.name + " created an account.");
          socket.emit('alert', 'Congragulations', 'Account created!', 'success', 3550);
          socket.emit("succesEnter");
          socket.instance = 'lobby';
          addUserTo('lobby', info.name, socket, 'new', info.name);
        }
        else if (uindex !== -1) {
          socket.emit('requestCreate', 'Username already exists!');
        }
      }
    }
  });
  
  socket.on('join', function(specs) {
    if (socket.instance !== undefined) {
      var uref = getUserFrom(socket.instance, socket.id);
      if (uref !== undefined && uref !== -1 && specs.password !== undefined) {
        uref.func.joinRoom(specs.name, specs.password);
      }
    }
  });
  
  socket.on('create', function(specs) {
    if (socket.instance !== undefined) {
      var uref = getUserFrom(socket.instance, socket.id);
      if (uref !== undefined && uref !== -1) {
        if (specs.password !== undefined) {
          createRoom(specs.name, {password: specs.password, origin: socket.id, originroom: socket.instance}, socket);
        }
      }
    }
  });
  
  socket.on('message', function(content) {
    if (socket.instance !== undefined) {
      if (content.charAt(0) == '/') { //commands
        content = content.replace(/\//g, '');
        var uref = getUserFrom(socket.instance, socket.id);
        if (uref !== undefined && uref !== -1) {
          uref.func.execute(content);
        }
      }
      else {
        var uref = getUserFrom(socket.instance, socket.id);
        if (uref !== undefined && uref !== -1) {
          uref.func.message(content);
        }
      }
    }
  });
  
  socket.on('debug', function() {
    for (var i = 0; i < rooms.length; i++) {
      console.log(rooms[i].users);
    }
  });
});



//functionalities
function aoIndex(a, t, p) {
  for (var i = 0, len = a.length; i < len; i++) {
      if (a[i][p] === t) return i;
  }
  return -1;
}

function round(num, places) {
    var multiplier = Math.pow(10, places);
    return Math.round(num * multiplier) / multiplier;
}

function startServer() {
  http.timeout = 0;
  http.listen(thisPort, process.env.IP || "0.0.0.0", function() {
    var addr = http.address();
    console.log("Server '" + thisServer + "' listening at: " + addr.address + ":" + addr.port + ", pid: " + process.pid);
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
