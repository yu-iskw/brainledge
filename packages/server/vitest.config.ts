import { defineProject } from 'vitest/config';

import { workspaceAliases } from '../../vitest.workspace-aliases.ts';

export default defineProject({
  resolve: { alias: workspaceAliases },
  test: {
    name: '@brainledge/server',
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['dist/**'],
  },
});
