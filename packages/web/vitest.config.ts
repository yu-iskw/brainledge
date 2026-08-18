import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: '@brainledge/web',
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['dist/**'],
    passWithNoTests: true,
  },
});
