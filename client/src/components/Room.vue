<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { io } from 'socket.io-client';

const props = defineProps(['username', 'roomName']);
const emit = defineEmits(['leave']);

const socket = io();
const canvas = ref(null);
const color = ref('#000000');
const width = ref(4);
const users = ref([]);
const cursors = ref({});

let drawing = false;
let last = null;      // mi último punto
const others = {};    // último punto de los otros usuarios

function drawLine(from, to, color, width) {
  const ctx = canvas.value.getContext('2d');
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
}

function clear() {
  canvas.value.getContext('2d').clearRect(0, 0, 800, 500);
}

onMounted(() => {
  // Al conectar (o reconectar) entramos en la sala
  socket.on('connect', () => {
    socket.emit('join_room', { username: props.username, roomName: props.roomName });
  });

  // Dibujamos lo que ya había en la sala
  socket.on('init_state', (strokes) => {
    for (const s of strokes) {
      for (let i = 1; i < s.points.length; i++) {
        drawLine(s.points[i - 1], s.points[i], s.color, s.width);
      }
    }
  });

  socket.on('room_users', (list) => {
    users.value = list;
  });

  socket.on('cursor_move', (data) => {
    cursors.value[data.id] = data;
  });

  socket.on('user_left', (id) => {
    delete cursors.value[id];
  });

  socket.on('draw_begin', (data) => {
    others[data.id] = data;
  });

  socket.on('draw_move', (data) => {
    const prev = others[data.id];
    drawLine(prev, data, prev.color, prev.width);
    prev.x = data.x;
    prev.y = data.y;
  });

  socket.on('clear_canvas', clear);
});

// Al salir de la sala cerramos la conexión
onUnmounted(() => {
  socket.disconnect();
});

// Eventos del ratón (pointer también funciona con touch)
function mouseDown(e) {
  drawing = true;
  last = { x: e.offsetX, y: e.offsetY };
  socket.emit('draw_begin', { x: last.x, y: last.y, color: color.value, width: width.value });
}

function mouseMove(e) {
  const pos = { x: e.offsetX, y: e.offsetY };
  socket.emit('cursor_move', pos);

  if (drawing) {
    drawLine(last, pos, color.value, width.value);
    socket.emit('draw_move', pos);
    last = pos;
  }
}

function mouseUp() {
  if (drawing) {
    drawing = false;
    socket.emit('draw_end');
  }
}
</script>

<template>
  <h2>Sala: {{ roomName }} ({{ username }})</h2>

  Color <input type="color" v-model="color">
  Gruix <input type="number" min="1" max="20" v-model="width">
  <button @click="socket.emit('clear_canvas')">Netejar</button>
  <button @click="emit('leave')">Sortir</button>

  <div class="board">
    <canvas ref="canvas" width="800" height="500"
      @pointerdown="mouseDown" @pointermove="mouseMove"
      @pointerup="mouseUp" @pointerleave="mouseUp"></canvas>

    <div v-for="c in cursors" class="cursor"
      :style="{ left: c.x + 'px', top: c.y + 'px', background: c.color }">
      {{ c.username }}
    </div>
  </div>

  <h3>Usuaris</h3>
  <ul>
    <li v-for="u in users" :style="{ color: u.color }">{{ u.username }}</li>
  </ul>
</template>

<style>
.board { position: relative; width: 800px; }
canvas { border: 1px solid black; touch-action: none; }
.cursor { position: absolute; color: white; font-size: 12px; padding: 2px 5px; pointer-events: none; }
</style>
