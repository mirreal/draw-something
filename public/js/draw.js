function Canvas() {
  this.canvas = document.getElementById('canvas');
  this.context = canvas.getContext('2d');

  this.last = {};
}

Canvas.prototype.drawGrid = function(color, stepx, stepy) {
  var ctx = this.context;
  var width = ctx.canvas.width;
  var height = ctx.canvas.height;

  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.5;

  for (var i = stepx + 0.5; i < width; i += stepx) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, height);
    ctx.stroke();
    ctx.closePath();
  }

  for (var i = stepy + 0.5; i < height; i += stepy) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(width, i);
    ctx.stroke();
    ctx.closePath();
  }
  ctx.restore();
};

Canvas.prototype.drawLine = function(circle) {
  var ctx = this.context;

  ctx.strokeStyle = circle.color;
  ctx.fillStyle = circle.color;
  ctx.lineWidth = circle.size;
  ctx.lineCap = 'round';

  ctx.beginPath()

  var sessionId = circle.sessionId;
  if (this.last[sessionId]) {
    ctx.moveTo(this.last[sessionId].x, this.last[sessionId].y);
    ctx.lineTo(circle.x, circle.y);
    ctx.stroke();
  } else {
    ctx.moveTo(circle.x, circle.y);
    ctx.arc(circle.x, circle.y, circle.size / 2, 0,  Math.PI*2, true);
    ctx.fill();
  }
  ctx.closePath();

  this.last[sessionId] = circle;
};



function Draw() {
  this.canvas = new Canvas();
  this.socket = new io.connect();


  this.init();
}

Draw.prototype.init = function() {
  var self = this;

  this.canvas.drawGrid("lightgrey", 10, 10);

  this.user = this.getCookie('user');
  this.socket.emit('online', {user: this.user})
  this.socket.on('online', this.updateUserlists);
  this.socket.on('offline', this.updateUserlists);
  this.socket.on('start', function(data) {
    data.history.forEach(self.paint.bind(self));
    data.messages.forEach(self.addMessageToDOM.bind(self));
  });
  this.socket.on('paint', this.paint.bind(self));
  this.socket.on('clear', this.clear.bind(self));
  this.socket.on('message', this.addMessageToDOM);

  this.eventHandle();
};

Draw.prototype.eventHandle = function() {
  var self = this;

  var touchdown = false;
  var sessionId = 0;

  var canvas = document.getElementById('canvas');
  var sizeOption = document.getElementById('size');
  var colorOption = document.getElementById('color');
  var clearButton = document.getElementById('clear');
  var size = sizeOption.value;
  var color = colorOption.value.toLowerCase();

  canvas.onmouseup = function(event) {
    touchdown = false;
  };

  canvas.onmousedown = function(event) {
    touchdown = true;
    sessionId = Date.now();
  };

  canvas.onmousemove = function(event) {
    if (!touchdown && !event.targetTouches) return;

    var bbox = canvas.getBoundingClientRect();
    var x = event.clientX - bbox.left * (canvas.width  / bbox.width);
    var y = event.clientY - bbox.top  * (canvas.height / bbox.height);

    self.move(x, y, color, size, sessionId);
  };

  sizeOption.onchange = function() {
    size = sizeOption.value;
    touchdown = false;
  };

  colorOption.onchange = function() {
    color = colorOption.value.toLowerCase();
    touchdown = false;
  };

  clearButton.onclick = function() {
    self.clear();
    self.socket.emit('clear');
    touchdown = false;
  };

  var sendButton = document.getElementById('sendButton'),
      message = document.getElementById('message');

  sendButton.onclick = function() {
    var msg = message.value;
    self.updateMessage(msg);
  };

  document.addEventListener('keydown', function(event) {
    if (event.keyCode == 13) {
      var msg = message.value;
      self.updateMessage(msg);
    }
  }, false);
};

Draw.prototype.move = function(x, y, color, size, id) {
  circle = {
    x: x,
    y: y,
    color: color,
    size: size,
    sessionId: id
  };

  this.canvas.drawLine(circle);
  this.socket.emit('paint', circle);
};

Draw.prototype.paint = function(data) {
  this.canvas.drawLine(data);
};

Draw.prototype.clear = function() {
  this.canvas.drawGrid("lightgrey", 10, 10);
};


Draw.prototype.getCookie = function(key) {
  var cookieName = encodeURIComponent(name) + '=',
      cookieStart = document.cookie.indexOf(cookieName),
      cookieValue = null;

  if (cookieStart > -1) {
    var cookieEnd = document.cookie.indexOf(';', cookieStart);
    if (cookieEnd == -1) {
      cookieEnd = document.cookie.length;
    }
    cookieValue = decodeURIComponent(document.cookie.substring(cookieStart
        + cookieName.length, cookieEnd));
  }
  return cookieValue;
};

Draw.prototype.updateUserlists = function(data) {
  var userLists = document.getElementById('userLists');
  userLists.innerHTML = '';
  for (user in data.users) {
    var li = document.createElement('li');
    li.innerHTML = user;
    userLists.appendChild(li);
  }
};

Draw.prototype.updateMessage = function(msg) {
  var data = {user: this.user, msg: msg};
  this.addMessageToDOM(data);

  this.socket.emit('message', data);
};

Draw.prototype.addMessageToDOM = function(data) {
  var messageBox = document.getElementById('messageBox');
  var li = document.createElement('li');
  li.innerHTML = data.user + ' say: ' + data.msg;
  //messageBox.appendChild(li);
  messageBox.insertBefore(li, messageBox.firstChild)
  message.value = '';
};


new Draw();