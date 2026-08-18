/**
 * Playwright e2e against the compiled standalone server + web UI.
 * Prerequisite: `pnpm build` so `packages/cli/dist/main.js` and `packages/web/dist` exist.
 * Run locally: `pnpm --filter @brainledge/web test:e2e`
 * Not a required CI job — browsers are not installed in the default GitHub Actions gate.
 */
import { defineConfig, devices } from '@playwright/test';

const e2eHost = '127.0.0.1';
const e2ePort = 8798;
const e2eOrigin = `http://${e2eHost}:${String(e2ePort)}`;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [['list']],
  outputDir: 'test-results',
  use: {
    baseURL: e2eOrigin,
    screenshot: 'only-on-failure',
    trace: 'off',
    video: 'off',
  },
  webServer: {
    command: 'bash ./scripts/e2e-web-server.sh',
    url: `${e2eOrigin}/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      BRAINLEDGE_HOST: e2eHost,
      BRAINLEDGE_PORT: String(e2ePort),
    },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
