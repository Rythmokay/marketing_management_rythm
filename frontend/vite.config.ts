import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Local development: send API calls to the Spring Boot backend
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
})

