import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/@babel/parser')) return 'ast-parser';
          if (id.includes('node_modules/@supabase')) return 'supabase';
          if (id.includes('node_modules/mermaid') || id.includes('node_modules/d3')) return 'diagrams';
          if (id.includes('node_modules/react')) return 'react-vendor';
          return undefined;
        }
      }
    }
  }
})
