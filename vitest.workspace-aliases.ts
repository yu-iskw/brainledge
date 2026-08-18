import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)));

/** Vitest loads workspace TypeScript; Node runtime uses package.json `exports` → dist. */
export const workspaceAliases = {
  '@brainledge/cli': path.join(repoRoot, 'packages/cli/src/index.ts'),
  '@brainledge/core': path.join(repoRoot, 'packages/core/src/index.ts'),
  '@brainledge/server': path.join(repoRoot, 'packages/server/src/index.ts'),
  '@brainledge/storage': path.join(repoRoot, 'packages/storage/src/index.ts'),
};
