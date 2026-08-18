import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: '@brainledge/storage',
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['dist/**'],
  },
});
