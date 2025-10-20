import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

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
      input: {
        popup: path.resolve(__dirname, 'src/popup.html'),
        background: path.resolve(__dirname, 'src/background.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          return chunkInfo.name === 'background' ? 'background.js' : 'popup.js';
        },
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
      '@': path.resolve(__dirname, './src'),
    },
  },
})
