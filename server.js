const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Servimos la SPA (un único index.html)
app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));

// Estado de todas las salas:
// rooms = {
//   "Prova": {
//     users:   { socketId: { username, color } },
//     strokes: [ { color, width, points: [ {x, y}, ... ] } ]
//   }
// }
const rooms = {};
const MAX_STROKES = 500; // buffer de trazos recientes por sala

function randomColor() {
  return 'hsl(' + Math.floor(Math.random() * 360) + ', 80%, 45%)';
}

function sendUsers(roomName) {
  io.to(roomName).emit('room_users', Object.values(rooms[roomName].users));
}

function sendRoomList() {
  io.emit('room_list', Object.keys(rooms));
}

function leaveRoom(socket) {
  const roomName = socket.data.roomName;
  if (!roomName) return;
  delete rooms[roomName].users[socket.id];
  socket.leave(roomName);
  socket.to(roomName).emit('user_left', socket.id); // para borrar su cursor
  sendUsers(roomName);
  socket.data.roomName = null;
}

io.on('connection', (socket) => {
  // Nada más conectar le enviamos la lista de salas
  socket.emit('room_list', Object.keys(rooms));

  socket.on('join_room', ({ roomName, username }) => {
    leaveRoom(socket); // por si ya estaba en otra sala

    // Si la sala no existe, se crea
    if (!rooms[roomName]) {
      rooms[roomName] = { users: {}, strokes: [] };
      sendRoomList();
    }
    const room = rooms[roomName];

    room.users[socket.id] = { username, color: randomColor() };
    socket.data.roomName = roomName;
    socket.join(roomName);

    // Sincronización inicial: le mandamos lo que ya está dibujado
    socket.emit('init_state', room.strokes);
    sendUsers(roomName);
  });

  socket.on('cursor_move', ({ x, y }) => {
    const roomName = socket.data.roomName;
    if (!roomName) return;
    const user = rooms[roomName].users[socket.id];
    // socket.to(...) = a todos los de la sala MENOS a mí (sin eco)
    socket.to(roomName).emit('cursor_move', {
      id: socket.id, username: user.username, color: user.color, x, y
    });
  });

  socket.on('draw_begin', ({ x, y, color, width }) => {
    const roomName = socket.data.roomName;
    if (!roomName) return;

    // Guardamos el trazo en el buffer de la sala
    const stroke = { color, width, points: [{ x, y }] };
    socket.data.stroke = stroke;
    const strokes = rooms[roomName].strokes;
    strokes.push(stroke);
    if (strokes.length > MAX_STROKES) strokes.shift();

    socket.to(roomName).emit('draw_begin', { id: socket.id, x, y, color, width });
  });

  socket.on('draw_move', ({ x, y }) => {
    const roomName = socket.data.roomName;
    if (!roomName || !socket.data.stroke) return;
    socket.data.stroke.points.push({ x, y });
    socket.to(roomName).emit('draw_move', { id: socket.id, x, y });
  });

  socket.on('draw_end', () => {
    const roomName = socket.data.roomName;
    if (!roomName) return;
    socket.data.stroke = null;
    socket.to(roomName).emit('draw_end', { id: socket.id });
  });

  socket.on('clear_canvas', () => {
    const roomName = socket.data.roomName;
    if (!roomName) return;
    rooms[roomName].strokes = [];
    io.to(roomName).emit('clear_canvas'); // io.to = a todos, incluido yo
  });

  socket.on('leave_room', () => leaveRoom(socket));
  socket.on('disconnect', () => leaveRoom(socket));
});

server.listen(3000, () => console.log('PaintRooms en http://localhost:3000'));
