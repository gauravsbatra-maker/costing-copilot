import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { include: ['tests/*.convex.test.ts'], fileParallelism: false, reporters: ['verbose'] } });
