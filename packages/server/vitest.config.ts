import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: '@brainledge/server',
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['dist/**'],
  },
});
