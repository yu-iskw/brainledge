import { expect, test } from '@playwright/test';

import type { Page } from '@playwright/test';

const screenshotDir = 'test-results/screenshots';

interface GraphDebug {
  zoomBy: (factor: number) => void;
  fit: () => void;
  selectNode: (id: string | undefined) => void;
  setCamera: (camera: { scale: number; tx: number; ty: number }) => void;
  camera: () => { scale: number; tx: number; ty: number };
  screenPositions: () => { id: string; label: string; x: number; y: number }[];
  nodeIds: () => string[];
}

const NOTES = [
  'Alice moved to Tokyo in July 2026.',
  'Carol lives in Paris.',
  'Dana works at the cafe.',
  'Natsume lives in Kyoto.',
  'Yosano works at the hospital.',
  'Thales taught geometry in Miletus.',
  'Hypatia taught philosophy in Alexandria.',
] as const;

async function shot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: `${screenshotDir}/${name}`, fullPage: true });
}

async function canvasShot(page: Page, name: string): Promise<void> {
  await page.locator('.graph-frame').screenshot({ path: `${screenshotDir}/${name}` });
}

async function extractAndAccept(page: Page): Promise<void> {
  await page.locator('#consolidate-button').click();
  await expect(page.locator('#extract-accept-all')).toBeVisible();
  await page.locator('#extract-accept-all').click();
  await expect(page.locator('#inspect-status')).toContainText(/Extracted/iu);
  await expect(page.locator('#rail-facts')).toHaveAttribute('aria-selected', 'true');
}

test('knowledge map canvas interactions produce a screenshot gallery', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/');
  await page.locator('#new-space-toggle').click();
  await page.locator('#space-name-input').fill('graph-lab');
  await page.locator('#space-create-button').click();
  await expect(page.locator('#overview-space')).toHaveText('graph-lab');
  for (const content of NOTES) {
    await page.locator('#remember-input').fill(content);
    await page.locator('#remember-button').click();
    await page
      .locator('#remember-status')
      .getByText(/^Saved$/u)
      .waitFor();
  }

  await page.locator('#tab-inspect').click();
  await expect(page.locator('#overview-heading')).toHaveText('Inspect');
  await expect(page.locator('#graph-empty')).toBeVisible();
  await expect(page.locator('#graph-empty-extract')).toBeVisible();
  await expect(page.locator('#graph-empty-extract')).toBeEnabled();
  await canvasShot(page, '007-graph-empty.png');

  await extractAndAccept(page);
  await expect(page.locator('#graph-caption')).toContainText(/nodes/iu);
  await expect(page.locator('#knowledge-graph')).toBeVisible();
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const graph = (window as unknown as { brainledgeGraph?: { nodeIds: () => string[] } })
          .brainledgeGraph;
        return graph?.nodeIds().length ?? 0;
      }),
    )
    .toBeGreaterThan(8);
  await page.locator('#graph-fit').click();
  await expect(page.locator('#graph-caption')).not.toHaveText(/ent_|fact_/u);
  const fitted = await page.evaluate(() => {
    const canvas = document.querySelector('#knowledge-graph');
    const graph = (window as unknown as { brainledgeGraph?: GraphDebug }).brainledgeGraph;
    if (!(canvas instanceof HTMLCanvasElement) || graph === undefined) {
      return { width: 0, height: 0, spanX: 0, spanY: 0, midX: 0, midY: 0 };
    }
    const rect = canvas.getBoundingClientRect();
    const points = graph.screenPositions();
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    return {
      width: rect.width,
      height: rect.height,
      spanX: Math.max(...xs) - Math.min(...xs),
      spanY: Math.max(...ys) - Math.min(...ys),
      midX: (Math.max(...xs) + Math.min(...xs)) / 2,
      midY: (Math.max(...ys) + Math.min(...ys)) / 2,
    };
  });
  const fill = Math.max(fitted.spanX / fitted.width, fitted.spanY / fitted.height);
  expect(fill).toBeGreaterThan(0.5);
  expect(fitted.midX).toBeGreaterThan(fitted.width * 0.3);
  expect(fitted.midX).toBeLessThan(fitted.width * 0.7);
  expect(fitted.midY).toBeGreaterThan(fitted.height * 0.3);
  expect(fitted.midY).toBeLessThan(fitted.height * 0.7);
  await shot(page, '008-graph-inspect-full.png');
  await canvasShot(page, '009-graph-fitted.png');

  await page.locator('#graph-zoom-in').click();
  await canvasShot(page, '010-graph-zoom-in.png');
  await page.locator('#graph-zoom-out').click();
  await canvasShot(page, '011-graph-zoom-out.png');
  await page.locator('#graph-fit').click();
  await canvasShot(page, '012-graph-fit.png');

  const box = await page.locator('#knowledge-graph').boundingBox();
  expect(box).not.toBeNull();
  if (box === null) {
    return;
  }

  const positions = await page.evaluate(() => {
    const graph = (window as unknown as { brainledgeGraph?: GraphDebug }).brainledgeGraph;
    return graph?.screenPositions() ?? [];
  });
  expect(positions.length).toBeGreaterThan(3);

  let index = 13;
  for (const node of positions.slice(0, 8)) {
    await page.mouse.click(box.x + node.x, box.y + node.y);
    const slug = node.label.replaceAll(/[^A-Za-z0-9]+/gu, '-').replaceAll(/^-|-$/gu, '');
    await canvasShot(page, `${String(index).padStart(3, '0')}-graph-select-${slug}.png`);
    index += 1;
  }

  await page.mouse.move(box.x + box.width / 2, box.y + 40);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 70, box.y + 90);
  await page.mouse.up();
  await canvasShot(page, `${String(index).padStart(3, '0')}-graph-panned.png`);
  index += 1;

  while (index <= 100) {
    await page.evaluate((offset) => {
      const graph = (window as unknown as { brainledgeGraph?: GraphDebug }).brainledgeGraph;
      if (graph === undefined) {
        return;
      }
      const current = graph.camera();
      graph.setCamera({
        scale: 0.55 + (offset % 10) * 0.12,
        tx: current.tx + (offset % 7) * 10 - 30,
        ty: current.ty + (offset % 5) * 8 - 16,
      });
      if (offset % 4 === 0) {
        const ids = graph.nodeIds();
        const id = ids[offset % ids.length];
        graph.selectNode(id);
      }
    }, index);
    await canvasShot(page, `${String(index).padStart(3, '0')}-graph-camera.png`);
    index += 1;
  }

  expect(index).toBe(101);
});
