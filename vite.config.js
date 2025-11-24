import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  base: '/dta-analysis-js/',
  server: {
    port: 5173,
    host: true,
    open: true
  },
  build: {
    outDir: 'dist',
    minify: 'terser',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'chart-base': ['chart.js'],
          'chart-zoom': ['chartjs-plugin-zoom'],
          'papaparse': ['papaparse']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  },
  optimizeDeps: {
    include: ['chart.js', 'chartjs-plugin-zoom', 'papaparse']
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
