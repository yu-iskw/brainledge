import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: '@brainledge/core',
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['dist/**'],
  },
});
