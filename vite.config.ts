import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      input: resolve(__dirname, 'src/popup.html'),
      output: {
        entryFileNames: 'popup.js',
        chunkFileNames: '[name].js',
        assetFileNames: 'popup.css',
        manualChunks: undefined,
      },
    },
    sourcemap: false,
    reportCompressedSize: false,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
