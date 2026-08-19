import { expect, test } from '@playwright/test';

const screenshotDir = 'test-results/screenshots';

const REMEMBER_CONTENT = 'Dana works at the cafe.';
const ALICE_CONTENT = 'Alice moved to Tokyo in July 2026.';
const ALICE_PARIS = 'Alice moved to Paris in August 2026.';
const CAROL_CONTENT = 'Carol lives in Paris.';
const RECALL_QUERY = 'Where does Dana work?';
const ALICE_QUERY = 'Where does Alice live?';
const DANA_OR_CAFE = /Dana|cafe/iu;
const MARKDOWN_NOTE = '# Cafe note\n\nDana prefers the window seat.';
const TECHNICAL_ID = /ks_|ep_|ent_|ing_|principal_/iu;
const ISO_INSTANT = /T\d{2}:\d{2}:\d{2}/u;

test('space workbench capture, recall receipts, and inspect', async ({ page }) => {
  await page.goto('/');
  await page.locator('#new-space-toggle').click();
  await page.locator('#space-name-input').fill('workbench-lab');
  await page.locator('#space-create-button').click();
  await expect(page.locator('#overview-space')).toHaveText('workbench-lab');
  await expect(page.locator('#overview-heading')).toHaveText('Capture');
  await expect(page.locator('#tab-capture')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#memories-heading')).toBeVisible();
  await expect(page.locator('#overview-space')).not.toHaveText(TECHNICAL_ID);
  await expect(page.locator('#overview-principal')).toContainText(/This device/iu);
  await expect(page.locator('#overview-principal')).toHaveCSS('text-transform', 'none');
  await expect(page.locator('#overview-principal')).not.toHaveText(TECHNICAL_ID);
  await expect(page.locator('#overview-principal')).not.toHaveText(/PERSONAL/u);
  await expect(page.locator('#memory-list')).toContainText(/Nothing captured yet/iu);
  await page.screenshot({
    path: `${screenshotDir}/01-empty-or-loaded.png`,
    fullPage: true,
  });

  await page.locator('#remember-input').fill(REMEMBER_CONTENT);
  await page.locator('#remember-button').click();
  await expect(page.locator('#remember-status')).toHaveText(/^Saved$/u);
  await expect(page.locator('#extract-on-map')).toBeVisible();
  await expect(page.locator('#extract-on-map')).toHaveText('Extract on map');
  await expect(page.locator('#memory-list')).toContainText(DANA_OR_CAFE);
  await expect(page.locator('#memory-list')).not.toHaveText(ISO_INSTANT);
  await expect(page.locator('#memory-list')).not.toHaveText(TECHNICAL_ID);
  await page.screenshot({
    path: `${screenshotDir}/02-after-remember.png`,
    fullPage: true,
  });

  await page.locator('#tab-recall').click();
  await expect(page.locator('#panel-recall')).toBeVisible();
  await expect(page.locator('#overview-heading')).toHaveText('Recall');
  await page.locator('#recall-input').fill(RECALL_QUERY);
  await page.locator('#recall-button').click();
  await expect(page.locator('#recall-output')).toHaveText(DANA_OR_CAFE);
  await expect(page.locator('#recall-receipts')).toContainText(/Facts not extracted yet/iu);
  await expect(page.locator('#recall-memories')).toContainText(DANA_OR_CAFE);
  await page.screenshot({
    path: `${screenshotDir}/03-after-recall.png`,
    fullPage: true,
  });

  await page.locator('#tab-capture').click();
  await expect(page.locator('#overview-heading')).toHaveText('Capture');
  await expect(page.locator('#extract-on-map')).toBeVisible();
  await expect(page.locator('#extract-on-map')).not.toHaveText(/ep_/u);
  await page.locator('#ingest-toggle').click();
  await expect(page.locator('#ingest-form')).toBeVisible();
  await page.locator('#ingest-markdown').fill(MARKDOWN_NOTE);
  await page.locator('#ingest-button').click();
  await expect(page.locator('#ingestion-status')).toContainText(
    /Ingest (queued|running|succeeded)/iu,
  );
  await expect(page.locator('#ingestion-status')).not.toHaveText(TECHNICAL_ID);
  await expect(page.locator('#memory-list')).toContainText(/Dana prefers the window seat/iu, {
    timeout: 20_000,
  });
  await expect(page.locator('#memory-list')).not.toContainText('# Cafe note');
  await page.screenshot({
    path: `${screenshotDir}/04-after-markdown-ingest.png`,
    fullPage: true,
  });

  await page.locator('#remember-input').fill(ALICE_CONTENT);
  await page.locator('#remember-button').click();
  await page
    .locator('#remember-status')
    .getByText(/^Saved$/u)
    .waitFor();
  await page.locator('#remember-input').fill(CAROL_CONTENT);
  await page.locator('#remember-button').click();
  await page
    .locator('#remember-status')
    .getByText(/^Saved$/u)
    .waitFor();

  await page.locator('#tab-inspect').click();
  await expect(page.locator('#panel-inspect')).toBeVisible();
  await expect(page.locator('#overview-heading')).toHaveText('Inspect');
  await page.locator('#consolidate-button').click();
  await expect(page.locator('#extract-accept-all')).toBeVisible();
  await page
    .locator('.extract-proposed-item')
    .filter({ hasText: /Dana/iu })
    .locator('.extract-skip-one')
    .click();
  await page.locator('#extract-accept-all').click();
  await expect(page.locator('#inspect-status')).toContainText(/Extracted/iu);
  await expect(page.locator('#rail-facts')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#graph-list')).not.toContainText(/Dana/iu);
  await expect(page.locator('#inspect-dossier')).not.toHaveText(TECHNICAL_ID);
  await expect(page.locator('#graph-list')).not.toHaveText(/livesIn|ent_/u);
  await page.screenshot({
    path: `${screenshotDir}/05-after-inspect-extract.png`,
    fullPage: true,
  });

  await page.locator('#tab-recall').click();
  await page.locator('#recall-input').fill(ALICE_QUERY);
  await page.locator('#recall-button').click();
  await expect(page.locator('#recall-output')).toContainText(/Tokyo/iu);
  await expect(page.locator('#recall-receipts')).toContainText(/Alice lives in Tokyo/iu);
  await expect(page.locator('#recall-receipts')).not.toContainText(/Paris|ent_/iu);
  await expect(page.locator('#provenance-list')).not.toHaveText(TECHNICAL_ID);
  await page.screenshot({
    path: `${screenshotDir}/06-alice-receipts.png`,
    fullPage: true,
  });

  await page.locator('#recall-receipts li').first().click();
  await expect(page.locator('#overview-heading')).toHaveText('Inspect');
  await expect(page.locator('#inspect-dossier')).toContainText(/Tokyo/iu);
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const graph = (
          window as unknown as {
            brainledgeGraph?: { highlights: () => { edges: string[] } };
          }
        ).brainledgeGraph;
        return graph?.highlights().edges.length ?? 0;
      }),
    )
    .toBeGreaterThan(0);
  await page.screenshot({
    path: `${screenshotDir}/06c-recall-overlay.png`,
    fullPage: true,
  });

  await page.locator('#tab-recall').click();
  await page.locator('#recall-memories li').first().click();
  await expect(page.locator('#overview-heading')).toHaveText('Inspect');
  await expect(page.locator('#inspect-dossier')).toContainText(/Alice|Tokyo/iu);

  await page.locator('#tab-capture').click();
  await page.locator('#remember-input').fill(ALICE_PARIS);
  await page.locator('#remember-button').click();
  await page
    .locator('#remember-status')
    .getByText(/^Saved$/u)
    .waitFor();
  await page.locator('#tab-inspect').click();
  await page.locator('#consolidate-button').click();
  await expect(page.locator('#extract-proposed')).toContainText(/closes Alice lives in Tokyo/iu);
  await page.locator('#extract-accept-all').click();
  await expect(page.locator('#inspect-status')).toContainText(/Extracted/iu);
  await expect(page.locator('#graph-list')).toContainText(/Paris/iu);

  await page.locator('#as-of-input').fill('2026-07-15');
  await expect(page.locator('#graph-list')).toContainText(/Alice lives in Tokyo/iu);
  await expect(page.locator('#graph-list')).not.toContainText(/Alice lives in Paris/iu);
  await page.screenshot({
    path: `${screenshotDir}/06b-as-of-july.png`,
    fullPage: true,
  });

  await page.locator('#tab-recall').click();
  await expect(page.locator('#recall-output')).toContainText(/Tokyo/iu);
  await expect(page.locator('#recall-output')).not.toContainText(/Paris/iu);
});
