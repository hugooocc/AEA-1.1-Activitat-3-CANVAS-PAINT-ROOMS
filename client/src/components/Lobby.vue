<script setup>
import { ref } from 'vue';

const emit = defineEmits(['join']);
const username = ref('');
const roomName = ref('');

function join() {
  if (username.value && roomName.value) {
    emit('join', { username: username.value, roomName: roomName.value });
  }
}
</script>

<template>
  <h1>PaintRooms</h1>
  <input v-model="username" placeholder="El teu nom">
  <input v-model="roomName" placeholder="Nom de la sala">
  <button @click="join">Entrar</button>
</template>
