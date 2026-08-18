import { describe, expect, it } from 'vitest';

import { runCli } from '../../src/main.js';

describe('runCli', () => {
  it('exits 1 for unknown commands and 0 for usage with no command', async () => {
    expect(await runCli(['node', 'brainledge', 'nosuch'])).toBe(1);
    expect(await runCli(['node', 'brainledge'])).toBe(0);
  });
});
