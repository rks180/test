import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 60_000,
    hookTimeout: 120_000, // first run downloads the in-memory mongod binary
    env: { NODE_ENV: 'test' },
    fileParallelism: false, // one in-memory mongo per file otherwise
  },
});
