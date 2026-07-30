import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    server: {
      port: 3000,
      host: true,
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:5050',
          changeOrigin: true,
          secure: false
        }
      }
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
  };
})
