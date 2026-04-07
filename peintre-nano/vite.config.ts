import react from '@vitejs/plugin-react';
import { defineConfig, searchForWorkspaceRoot } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    fs: {
      // Docker dev mounts CREOS contracts outside `/app`; keep served manifests reachable.
      allow: [searchForWorkspaceRoot(process.cwd()), '/contracts'],
    },
    proxy: {
      // Keep the browser on the same origin in local Docker dev.
      '/api': {
        target: 'http://api:8000',
        changeOrigin: false,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
