var express = require('express');
var http = require('http');
var path = require('path');

var app = express();
var server = http.createServer(app);

// all environments of Express
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.cookieParser());
//app.use(express.session({secret: 'drawSomething'}));
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

var users = {};
var history = [];
var messages = [];

app.get('/', function (req, res) {
  if (req.cookies.user == null) {
    res.redirect('/login');
  } else {
    res.render('draw');
  }
});

app.get('/login', function (req, res) {
  res.render('login');
});

app.post('/login', function (req, res) {
  if (users[req.body.name]) {
    res.redirect('/login');
  } else {
    res.cookie('user', req.body.name);
    res.redirect('/');
  }
});


var io = require('socket.io').listen(server);

io.sockets.on('connection', function (socket) {
  socket.on('online', function (data) {
    socket.name = data.user;

    if (!users[data.user]) {
      users[data.user] = data.user;
    }
    io.sockets.emit('online', {
      users: users,
      user: data.user
    });
  });

  socket.emit('start', {history: history, messages: messages});

  socket.on('paint', function(data) {
    history.push(data);
    socket.broadcast.emit('paint', data);
  });

  socket.on('clear', function() {
    history = [];
    socket.broadcast.emit('clear');
  });

  socket.on('message', function (data) {
    messages.push(data);
    if (messages.length > 36) messages.shift();
    socket.broadcast.emit('message', data);
  });

  socket.on('disconnect', function() {
    if (users[socket.name]) {
      delete users[socket.name];
      socket.broadcast.emit('offline', {
        users: users,
        user: socket.name
      });
    }
  });

});


server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
