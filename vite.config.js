import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  publicDir: 'public',
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
  }
});
