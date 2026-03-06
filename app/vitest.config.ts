import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: [
      'packages/*/src/**/*.test.ts',
      'evals/**/*.test.ts',
      'evals/**/*.eval.ts',
    ],
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**/*.ts'],
      exclude: ['**/*.test.ts', '**/*.d.ts'],
    },
  },
  resolve: {
    alias: {
      '@copia/types': '/Users/sumikolli/Documents/experiments/copia/packages/types/src',
      '@copia/data-service': '/Users/sumikolli/Documents/experiments/copia/packages/data-service/src',
      '@copia/rule-engine': '/Users/sumikolli/Documents/experiments/copia/packages/rule-engine/src',
      '@copia/mcp-server': '/Users/sumikolli/Documents/experiments/copia/packages/mcp-server/src',
      '@copia/ai-layer': '/Users/sumikolli/Documents/experiments/copia/packages/ai-layer/src',
    },
  },
});
