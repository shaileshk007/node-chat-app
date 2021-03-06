const path = require('path');
const http = require('http');
const express = require('express');
const socketIO = require('socket.io');

var {generateMessage,generateLocationMessage} = require('./utils/message');
var {isRealString} = require('./utils/validate'); 
var {Users} = require('./utils/users');

const publicPath = path.join(__dirname , '../public');
const port = process.env.PORT || 3000;
var app = express();
var server = http.createServer(app);
var io = socketIO(server);
var users = new Users();

app.use(express.static(publicPath));
io.on('connection',(socket)=>{
    console.log('new user connected');

    socket.on('join',(params, callback)=>{
        if (!isRealString(params.name) || !isRealString(params.room)) {
            callback('Enter valid Name and Room name');
        }

        socket.join(params.room);

        users.removeUser(socket.id);
        users.addUser(socket.id, params.name, params.room);

        io.to(params.room).emit('updatedUserList', users.getUserList(params.room));

        socket.emit('newMessage', generateMessage('Admin', `Welcome to chat app`));
        socket.broadcast.to(params.room).emit('newMessage', generateMessage('Admin', `${params.name} has joined the room.`));

        callback();
    });
    
    socket.on('createMessage', (message, callback) => {
        var user = users.getUser(socket.id);

        if(user.length !== 0 && isRealString(message.text)){
            io.to(user[0].room).emit('newMessage', generateMessage(user[0].name, message.text));
        }

        callback();
    });

    socket.on('createLocationMessage', (coords)=>{
        var user = users.getUser(socket.id);

        if(user.length !== 0){
             io.to(user[0].room).emit('newLocationMessage', generateLocationMessage(user[0].name, coords.lat, coords.lng));
        }
    })

    socket.on('disconnect',()=>{
        var user = users.removeUser(socket.id);

        if(user[0]){
            io.to(user[0].room).emit('updatedUserList', users.getUserList(user[0].room));
            io.to(user[0].room).emit('newMessage', generateMessage('Admin', `${user[0].name} has left the room.`));
        }
    });
    
});


server.listen(port, ()=>{
    console.log(`Server running at port ${port}`);
});