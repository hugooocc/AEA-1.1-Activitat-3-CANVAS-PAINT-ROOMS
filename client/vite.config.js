import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  server: {
    // En desarrollo, Vite (puerto 5173) redirige Socket.IO al servidor Node (puerto 3000)
    proxy: {
      '/socket.io': { target: 'http://localhost:3000', ws: true }
    }
  }
});
