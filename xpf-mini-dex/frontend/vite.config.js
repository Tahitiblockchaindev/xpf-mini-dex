import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// On veut un build statique simple (servi par l'Express du backend)
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../backend/dist', // le backend servira ce dossier
    emptyOutDir: true
  }
})
