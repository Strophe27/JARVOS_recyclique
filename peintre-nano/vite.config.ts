import fs from 'node:fs';
import react from '@vitejs/plugin-react';
import { defineConfig, searchForWorkspaceRoot } from 'vite';

const runningInContainer = fs.existsSync('/.dockerenv') || fs.existsSync('/run/.containerenv');
const devProxyTarget =
  process.env.PEINTRE_DEV_PROXY_TARGET ||
  process.env.DEV_PROXY_TARGET ||
  process.env.VITE_DEV_PROXY_TARGET ||
  (runningInContainer ? 'http://api:8000' : 'http://localhost:8000');

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
