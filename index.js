'use strict';

var fs = require( 'fs' );
var os = require('os');
var nodeStatic = require('node-static');
var https = require('https');
var socketIO = require('socket.io');
var fileServer = new(nodeStatic.Server)();

var app = https.createServer({
    key: fs.readFileSync('apache.key'),
    cert: fs.readFileSync('apache.crt'),
    ca: fs.readFileSync('apache.crt'),
    requestCert: false,
    rejectUnauthorized: false
},function(req, res) {
  fileServer.serve(req, res); 
}).listen(443);


var io = socketIO.listen(app);
var listOfRoom = {};
io.sockets.on('connection', function(socket) {

  function log() {
    var array = ['Message from server:'];
    array.push.apply(array, arguments);
    socket.emit('log', array);
  }
  socket.on('message', function(message, room, idUser) {
    console.log('Client said: ', message);
    socket.broadcast.to(room).emit('message', message, idUser);
  });

  socket.on('ice', function(message, room) {
    console.log('Client said: ', message);
    socket.broadcast.to(room).emit('ice', message);
  });

  socket.on('create or join', function(room, idUser) {
    console.log('Received request to create or join room ' + room + ' from '+ idUser);

    var clientsInRoom = io.sockets.adapter.rooms[room];
    var numClients = clientsInRoom ? Object.keys(clientsInRoom.sockets).length : 0;
    console.log('Room ' + room + ' now has ' + numClients + ' client(s)');

    if (numClients === 0) {
      socket.join(room);
      listOfRoom[room] = {teacher: idUser};
      console.log('Client ID ' + idUser + ' created room ' + room);
      socket.emit('created', room, idUser);

    } else {
      console.log('Client ID ' + idUser + ' joined room ' + room);      
      socket.join(room);
      socket.broadcast.to(room).emit('join', listOfRoom[room].teacher);
      socket.broadcast.to(room).emit('joined', idUser);
      io.sockets.in(room).emit('ready');
    }
  });

  socket.on('bye', function(idTeacher){
    socket.broadcast.to(room).emit('bye');
    console.log('received bye');
  });

});
