import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  base: '/mrms/',
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/mrms/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/meeting-room/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
