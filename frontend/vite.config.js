import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Build directly into the backend/dist folder for automatic deploy
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../backend/dist',
    emptyOutDir: true
  }
})
