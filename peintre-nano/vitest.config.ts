import { mergeConfig } from 'vite';
import { defineConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
    // Défaut node : les fichiers sous tests/e2e/ qui touchent le DOM doivent déclarer
    // `// @vitest-environment jsdom` en tête (voir tests/e2e/README.md).
    environment: 'node',
    include: [
      'tests/unit/**/*.{test.ts,test.tsx}',
      'tests/e2e/**/*.{test.ts,test.tsx}',
      'tests/contract/**/*.{test.ts,test.tsx}',
    ],
  },
  }),
);
