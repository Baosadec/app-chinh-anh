import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    // Important: This must match your repository name on GitHub
    base: '/app-chinh-anh/', 
    plugins: [react()],
    define: {
      // Expose process.env.API_KEY to the client-side code safely
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
    },
  };
});