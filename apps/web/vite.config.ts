import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  // Tauri dev server config
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      // On Windows, poll-based file watching is more reliable
      usePolling: process.platform === 'win32',
    },
  },

  // Vite clears the terminal on each rebuild — keep for Tauri
  clearScreen: false,

  envPrefix: ['VITE_', 'TAURI_'],

  build: {
    // Tauri supports ES2021+
    target: process.env.TAURI_ENV_PLATFORM === 'windows' ? 'chrome105' : 'safari13',
    minify: !process.env.TAURI_ENV_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
})
