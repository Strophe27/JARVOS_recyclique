import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    // Défaut node : les fichiers sous tests/e2e/ qui touchent le DOM doivent déclarer
    // `// @vitest-environment jsdom` en tête (voir tests/e2e/README.md).
    environment: 'node',
    include: ['tests/unit/**/*.{test.ts,test.tsx}', 'tests/e2e/**/*.{test.ts,test.tsx}'],
  },
});
