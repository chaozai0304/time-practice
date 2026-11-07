import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { rollupOptions: { input: { app: fileURLToPath(new URL('./index.html', import.meta.url)), guardMotion: fileURLToPath(new URL('./guard-motion.html', import.meta.url)) } } },
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
})
