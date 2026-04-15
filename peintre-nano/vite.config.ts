import react from '@vitejs/plugin-react';
import { defineConfig, searchForWorkspaceRoot } from 'vite';

const devProxyTarget = process.env.VITE_DEV_PROXY_TARGET || 'http://localhost:8000';

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
      // Same-origin API calls in dev: host mode defaults to localhost, Docker frontend overrides to `api:8000`.
      '/api': {
        target: devProxyTarget,
        changeOrigin: false,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
