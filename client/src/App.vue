<script setup>
import { ref } from 'vue';
import Lobby from './components/Lobby.vue';
import Room from './components/Room.vue';

// Si hemos refrescado, recuperamos el nombre y la sala
const user = ref(JSON.parse(sessionStorage.getItem('user')));

function join(data) {
  sessionStorage.setItem('user', JSON.stringify(data));
  user.value = data;
}

function leave() {
  sessionStorage.removeItem('user');
  user.value = null;
}
</script>

<template>
  <Lobby v-if="!user" @join="join" />
  <Room v-else :username="user.username" :roomName="user.roomName" @leave="leave" />
</template>
