import { expect, test } from '@playwright/test';

import type { Page } from '@playwright/test';

const screenshotDir = 'test-results/screenshots';
const TECHNICAL_ID = /ks_|ep_|ent_|ing_|principal_/iu;

interface Scenario {
  readonly id: string;
  readonly space: string;
  readonly notes: readonly string[];
  readonly question: string;
  readonly expectRecall: RegExp;
  readonly expectGraph: RegExp;
}

const SCENARIOS: readonly Scenario[] = [
  {
    id: 'residence',
    space: 'Residence',
    notes: ['Alice moved to Tokyo in July 2026.'],
    question: 'Where does Alice live?',
    expectRecall: /Tokyo/iu,
    expectGraph: /Alice|Tokyo/iu,
  },
  {
    id: 'supersede-city',
    space: 'Move',
    notes: ['Alice moved to Tokyo in July 2026.', 'Alice moved to Paris in August 2026.'],
    question: 'Where does Alice live?',
    expectRecall: /Paris|Tokyo/iu,
    expectGraph: /Paris|Tokyo/iu,
  },
  {
    id: 'cafe-job',
    space: 'Cafe',
    notes: ['Dana works at the cafe.'],
    question: 'Where does Dana work?',
    expectRecall: /Dana|cafe/iu,
    expectGraph: /Dana|Cafe|works/iu,
  },
  {
    id: 'hospital-job',
    space: 'Hospital',
    notes: ['Yosano works at the hospital.'],
    question: 'Where does Yosano work?',
    expectRecall: /hospital/iu,
    expectGraph: /Yosano|Hospital/iu,
  },
  {
    id: 'taught-geometry',
    space: 'Miletus',
    notes: ['Thales taught geometry in Miletus.'],
    question: 'What did Thales teach?',
    expectRecall: /geometry|Thales/iu,
    expectGraph: /Thales|Geometry|Miletus/iu,
  },
  {
    id: 'taught-philosophy',
    space: 'Alexandria',
    notes: ['Hypatia taught philosophy in Alexandria.'],
    question: 'What did Hypatia teach?',
    expectRecall: /philosophy|Hypatia/iu,
    expectGraph: /Hypatia|Philosophy|Alexandria/iu,
  },
  {
    id: 'two-jobs',
    space: 'Careers',
    notes: ['Dana works at the cafe.', 'Yosano works at the hospital.'],
    question: 'Who works at the hospital?',
    expectRecall: /Yosano|hospital/iu,
    expectGraph: /Cafe|Hospital/iu,
  },
  {
    id: 'kyoto',
    space: 'Kyoto',
    notes: ['Natsume lives in Kyoto.'],
    question: 'Where does Natsume live?',
    expectRecall: /Kyoto/iu,
    expectGraph: /Natsume|Kyoto/iu,
  },
  {
    id: 'carol-paris',
    space: 'Paris',
    notes: ['Carol lives in Paris.'],
    question: 'Where does Carol live?',
    expectRecall: /Paris/iu,
    expectGraph: /Carol|Paris/iu,
  },
  {
    id: 'mixed-map',
    space: 'Atlas',
    notes: [
      'Alice moved to Tokyo in July 2026.',
      'Dana works at the cafe.',
      'Thales taught geometry in Miletus.',
    ],
    question: 'Where does Alice live?',
    expectRecall: /Tokyo/iu,
    expectGraph: /works at|taught|lives in|Alice|Dana|Thales/iu,
  },
  {
    id: 'faculty',
    space: 'Faculty',
    notes: [
      'Thales taught geometry in Miletus.',
      'Thales taught astronomy in Miletus.',
      'Hypatia taught philosophy in Alexandria.',
    ],
    question: 'What did Thales teach?',
    expectRecall: /geometry|astronomy|Thales/iu,
    expectGraph: /Geometry|Astronomy|Philosophy/iu,
  },
  {
    id: 'newsroom',
    space: 'Newsroom',
    notes: ['Ranpo works at the agency.', 'Kunikida works at the agency.'],
    question: 'Who works at the agency?',
    expectRecall: /Ranpo|Kunikida|agency/iu,
    expectGraph: /Agency|works/iu,
  },
  {
    id: 'yokohama',
    space: 'Yokohama',
    notes: ['Kenji lives in Yokohama.'],
    question: 'Where does Kenji live?',
    expectRecall: /Yokohama|Kenji/iu,
    expectGraph: /Kenji|Yokohama/iu,
  },
  {
    id: 'dazai-agency',
    space: 'Port',
    notes: ['Dazai works at the agency.'],
    question: 'Where does Dazai work?',
    expectRecall: /Dazai|agency/iu,
    expectGraph: /Dazai|Agency|works/iu,
  },
  {
    id: 'two-cities',
    space: 'Cities',
    notes: ['Natsume lives in Kyoto.', 'Carol lives in Paris.'],
    question: 'Where does Carol live?',
    expectRecall: /Paris/iu,
    expectGraph: /Kyoto|Paris/iu,
  },
  {
    id: 'clinic',
    space: 'Clinic',
    notes: ['Yosano works at the hospital.', 'Kenji lives in Yokohama.'],
    question: 'Where does Yosano work?',
    expectRecall: /hospital/iu,
    expectGraph: /Hospital|Yokohama/iu,
  },
];

async function shot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: `${screenshotDir}/${name}`, fullPage: true });
}

async function canvasShot(page: Page, name: string): Promise<void> {
  await page.locator('.graph-frame').screenshot({ path: `${screenshotDir}/${name}` });
}

async function createSpace(page: Page, name: string): Promise<void> {
  await page.goto('/');
  await page.locator('#new-space-toggle').click();
  await page.locator('#space-name-input').fill(name);
  await page.locator('#space-create-button').click();
  await expect(page.locator('#overview-space')).toHaveText(name);
  await expect(page.locator('#overview-heading')).toHaveText('Capture');
}

async function rememberNotes(page: Page, notes: readonly string[]): Promise<void> {
  for (const content of notes) {
    await page.locator('#remember-input').fill(content);
    await page.locator('#remember-button').click();
    await page
      .locator('#remember-status')
      .getByText(/^Saved$/u)
      .waitFor();
  }
}

async function extractAndAccept(page: Page): Promise<void> {
  await page.locator('#consolidate-button').click();
  await expect(page.locator('#extract-accept-all')).toBeVisible();
  await page.locator('#extract-accept-all').click();
  await expect(page.locator('#inspect-status')).toContainText(/Extracted/iu);
}

test.describe.configure({ mode: 'serial' });

for (const scenario of SCENARIOS) {
  test(`scenario ${scenario.id}: capture, recall, extract, graph`, async ({ page }) => {
    test.setTimeout(90_000);
    await createSpace(page, scenario.space);
    await rememberNotes(page, scenario.notes);
    await expect(page.locator('#memory-list')).not.toHaveText(TECHNICAL_ID);
    await shot(page, `s-${scenario.id}-01-capture.png`);

    await page.locator('#tab-recall').click();
    await expect(page.locator('#overview-heading')).toHaveText('Recall');
    await page.locator('#recall-input').fill(scenario.question);
    await page.locator('#recall-button').click();
    await expect(page.locator('#recall-output')).toHaveText(scenario.expectRecall);
    await expect(page.locator('#recall-output')).not.toHaveClass(/sr-only/u);
    await shot(page, `s-${scenario.id}-02-recall.png`);

    await page.locator('#tab-inspect').click();
    await expect(page.locator('#overview-heading')).toHaveText('Inspect');
    await extractAndAccept(page);
    await expect(page.locator('#graph-list')).toHaveText(scenario.expectGraph);
    await expect(page.locator('#graph-list')).not.toHaveText(TECHNICAL_ID);
    await expect(page.locator('.graph-legend')).toBeVisible();
    await page.locator('#graph-fit').click();
    const fitted = await page.evaluate(() => {
      const canvas = document.querySelector('#knowledge-graph');
      const graph = (
        window as unknown as {
          brainledgeGraph?: {
            screenPositions: () => { x: number; y: number; label: string }[];
            nodeIds: () => string[];
          };
        }
      ).brainledgeGraph;
      if (!(canvas instanceof HTMLCanvasElement) || graph === undefined) {
        return { width: 0, height: 0, spanX: 0, spanY: 0, count: 0 };
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
        count: points.length,
      };
    });
    expect(fitted.count).toBeGreaterThan(1);
    expect(fitted.width).toBeGreaterThan(400);
    expect(fitted.height).toBeGreaterThan(280);
    const fill = Math.max(fitted.spanX / fitted.width, fitted.spanY / fitted.height);
    expect(fill).toBeGreaterThan(0.45);
    await shot(page, `s-${scenario.id}-03-inspect.png`);
    await canvasShot(page, `s-${scenario.id}-04-graph.png`);

    const box = await page.locator('#knowledge-graph').boundingBox();
    const positions = await page.evaluate(() => {
      const graph = (
        window as unknown as {
          brainledgeGraph?: { screenPositions: () => { x: number; y: number; label: string }[] };
        }
      ).brainledgeGraph;
      return graph?.screenPositions() ?? [];
    });
    expect(positions.length).toBeGreaterThan(0);
    expect(box).not.toBeNull();
    if (box === null) {
      return;
    }
    const first = positions[0];
    await page.mouse.click(box.x + first.x, box.y + first.y);
    await canvasShot(page, `s-${scenario.id}-05-selected.png`);
  });
}
