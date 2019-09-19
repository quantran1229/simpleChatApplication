var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
const faker = require('faker')
const moment = require('moment')

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});

let Users = []

io.on('connection', function (socket) {
  let username = faker.name.firstName();
  let image = faker.image.animals();
  let color = faker.internet.color()
  console.log(username, ' has connected');
  let user = {
    username: username,
    id: socket.id
  }
  Users.push(user)
  socket.broadcast.emit("system", {
    msg: username + " has connected to this room. Say Hi to him/her",
    time: moment().format("HH:mm:ss")
  })
  socket.emit("userinfo", {
    username: username,
    image: image,
    color: color
  });
  io.sockets.emit("onlineUser",Users)
});

io.sockets.on('connection', function (socket) {
  socket.on("disconnect", () => {
    let user = ""
    for (let i = 0; i < Users.length; i++) {
      if (Users[i].id == socket.id) {
        user = Users[i].username;
        Users.splice(i, 1);
        break;
      }
    }
    let index = typingUser.indexOf(user)
    if (index != -1) {
      typingUser.splice(index, 1)
    }
    io.sockets.emit('typing', typingUser.length)
    io.sockets.emit("system", {
      msg: user + " has disconnected to this room.",
      time: moment().format("HH:mm:ss")
    })
    io.sockets.emit("onlineUser",Users)
  })
});

let typingUser = []
io.on('connection', function (socket) {
  socket.on('chat message', function (data) {
    data.time = moment().format("HH:mm:ss")
    if ((data.msg).substring(0, 8) == "@private") {
      let texts = data.msg.split(" ")
      let socket_id = null
      let username = texts[1]
      if (username) {
        for (let i = 0; i < Users.length; i++) {
          if (Users[i].username == username) {
            socket_id = Users[i].id
            break;
          }
        }
      }
      if (socket_id && socket_id != socket.id) {
        let msg = data.msg;
        data.toUser = null
        data.msg = msg.slice(10 + username.length)
        socket.broadcast.to(socket_id).emit("private", data)
        data.toUser = username;
        socket.emit("private",data)
      } else if (!socket_id) {
        socket.emit('system', {
          msg: username + " isn't in this room. Can't find user",
          time: moment().format("HH:mm:ss")
        })
      } else if (socket_id == socket.id) {
        socket.emit('system', {
          msg: "Can't send private message to yourself",
          time: moment().format("HH:mm:ss")
        })
      }
    } else io.emit('chat message', data);
    let index = typingUser.indexOf(data.user)
    if (index != -1) {
      typingUser.splice(index, 1)
    }
    io.sockets.emit('typing', typingUser.length)
  });
  socket.on('typing', (data) => {
    if (data.typing) {
      if (typingUser.indexOf(data.username) == -1) {
        typingUser.push(data.username)
      }
    } else {
      let index = typingUser.indexOf(data.username)
      if (index != -1) {
        typingUser.splice(index, 1)
      }
    }
    socket.broadcast.emit('typing', typingUser.length)
  })
});

http.listen(3000, function () {
  console.log('listening on *:3000');
});