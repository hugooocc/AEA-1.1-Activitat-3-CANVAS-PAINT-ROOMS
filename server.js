const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Servimos la app de Vue compilada
app.use(express.static('client/dist'));

// Aquí guardamos los usuarios y los trazos de cada sala
const rooms = {};
const colors = ['red', 'blue', 'green', 'orange', 'purple', 'brown'];

io.on('connection', (socket) => {
  let roomName = null;   // sala de este usuario
  let stroke = null;     // trazo que está dibujando ahora

  socket.on('join_room', (data) => {
    roomName = data.roomName;

    // Si la sala no existe la creamos
    if (!rooms[roomName]) {
      rooms[roomName] = { users: {}, strokes: [] };
    }

    const color = colors[Math.floor(Math.random() * colors.length)];
    rooms[roomName].users[socket.id] = { username: data.username, color: color };
    socket.join(roomName);

    // Le mandamos lo que ya hay dibujado
    socket.emit('init_state', rooms[roomName].strokes);
    io.to(roomName).emit('room_users', Object.values(rooms[roomName].users));
  });

  socket.on('cursor_move', (data) => {
    const user = rooms[roomName].users[socket.id];
    socket.to(roomName).emit('cursor_move', {
      id: socket.id, username: user.username, color: user.color, x: data.x, y: data.y
    });
  });

  socket.on('draw_begin', (data) => {
    stroke = { color: data.color, width: data.width, points: [{ x: data.x, y: data.y }] };
    rooms[roomName].strokes.push(stroke);

    // Solo guardamos los últimos 500 trazos
    if (rooms[roomName].strokes.length > 500) {
      rooms[roomName].strokes.shift();
    }

    socket.to(roomName).emit('draw_begin', { id: socket.id, ...data });
  });

  socket.on('draw_move', (data) => {
    stroke.points.push({ x: data.x, y: data.y });
    socket.to(roomName).emit('draw_move', { id: socket.id, x: data.x, y: data.y });
  });

  socket.on('draw_end', () => {
    stroke = null;
  });

  socket.on('clear_canvas', () => {
    rooms[roomName].strokes = [];
    io.to(roomName).emit('clear_canvas');
  });

  socket.on('disconnect', () => {
    if (!roomName) return;
    delete rooms[roomName].users[socket.id];
    io.to(roomName).emit('room_users', Object.values(rooms[roomName].users));
    io.to(roomName).emit('user_left', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Servidor en http://localhost:' + PORT));
