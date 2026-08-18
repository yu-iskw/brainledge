import { describe, expect, it } from 'vitest';

import { resolveServerDataDir } from './data-dir.js';
import { parseMcpProfiles } from './mcp/profiles.js';

import { defaultListenHost, defaultListenPort } from './index.js';

describe('server helpers', () => {
  it('resolves data dir, default listen, and mcp profiles', () => {
    expect(resolveServerDataDir().length).toBeGreaterThan(0);
    expect(defaultListenHost()).toMatch(/127|localhost/u);
    expect(defaultListenPort()).toBeGreaterThan(0);
    expect(parseMcpProfiles(undefined)).toContain('memory-read');
    expect(parseMcpProfiles('knowledge-read')).toEqual(['knowledge-read']);
    expect(parseMcpProfiles('knowledge-read,not-a-profile')).toEqual(['knowledge-read']);
  });
});
