import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: '@brainledge/cli',
    include: ['src/**/*.{test,spec}.ts', 'tests/**/*.{test,spec}.ts'],
    exclude: ['dist/**'],
  },
});
