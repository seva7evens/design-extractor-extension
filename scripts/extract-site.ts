import 'dotenv/config';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { artifactFilenames } from '../src/lib/browser/filenames';
import { localDesignMdFromEvidence } from '../src/lib/design-md/local-generate';
import { extractPageEvidenceInPage } from '../src/lib/extraction/in-page';
import { buildMultiViewportEvidence } from '../src/lib/extraction/multi-viewport';
import type { ExtractionOptions } from '../src/lib/extraction/types';
import { buildVisualClusters } from '../src/lib/extraction/visual-clusters';
import { generateDesignMdPipeline } from '../src/lib/gemini/pipeline';
import { compareDesignMd } from './compare-design-md';
import { evaluateDesignMd } from './evaluate-design-md';

const url = process.argv.find((arg) => /^https?:\/\//.test(arg));
if (!url) {
  console.error('Usage: pnpm extract:site -- <url>');
  process.exit(1);
}

const outRoot = process.argv.includes('--out')
  ? process.argv[process.argv.indexOf('--out') + 1]
  : `artifacts/eval/${artifactFilenames(url).slug}`;

await mkdir(outRoot, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 }, deviceScaleFactor: 1 });
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(2500);
const extractionOptions = {
  captureMode: 'fullPage',
  includeRawCssVariables: process.argv.includes('--raw-css'),
  maxNodes: 1000,
  maxTextLength: 240
} satisfies Partial<ExtractionOptions>;
const desktopEvidence = await page.evaluate(extractPageEvidenceInPage, extractionOptions);
const files = artifactFilenames(desktopEvidence.metadata.hostname);
const screenshotPath = `${outRoot}/${files.screenshot}`;
await page.screenshot({ path: screenshotPath, fullPage: true });
const modelScreenshot = await page.screenshot({ fullPage: false });
const desktopViewport = {
  label: 'desktop' as const,
  viewport: {
    width: desktopEvidence.metadata.viewportWidth,
    height: desktopEvidence.metadata.viewportHeight,
    devicePixelRatio: desktopEvidence.metadata.devicePixelRatio
  },
  evidence: desktopEvidence,
  screenshotDataUrl: `data:image/png;base64,${modelScreenshot.toString('base64')}`,
  screenshotSegments: [{ y: 0, width: desktopEvidence.metadata.viewportWidth, height: desktopEvidence.metadata.documentHeight, devicePixelRatio: desktopEvidence.metadata.devicePixelRatio }],
  visualClusters: buildVisualClusters({
    viewport: 'desktop',
    evidence: desktopEvidence,
    segments: [{ y: 0, width: desktopEvidence.metadata.viewportWidth, height: desktopEvidence.metadata.documentHeight, devicePixelRatio: desktopEvidence.metadata.devicePixelRatio }]
  })
};

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(800);
const mobileEvidence = await page.evaluate(extractPageEvidenceInPage, extractionOptions);
const mobileScreenshot = await page.screenshot({ fullPage: true });
await writeFile(`${outRoot}/${files.slug}-mobile-fullpage.png`, mobileScreenshot);
const mobileViewport = {
  label: 'mobile' as const,
  viewport: {
    width: mobileEvidence.metadata.viewportWidth,
    height: mobileEvidence.metadata.viewportHeight,
    devicePixelRatio: mobileEvidence.metadata.devicePixelRatio
  },
  evidence: mobileEvidence,
  screenshotSegments: [{ y: 0, width: mobileEvidence.metadata.viewportWidth, height: mobileEvidence.metadata.documentHeight, devicePixelRatio: mobileEvidence.metadata.devicePixelRatio }],
  visualClusters: buildVisualClusters({
    viewport: 'mobile',
    evidence: mobileEvidence,
    segments: [{ y: 0, width: mobileEvidence.metadata.viewportWidth, height: mobileEvidence.metadata.documentHeight, devicePixelRatio: mobileEvidence.metadata.devicePixelRatio }]
  })
};
const evidence = buildMultiViewportEvidence([desktopViewport, mobileViewport]);
await browser.close();

await writeFile(`${outRoot}/${files.evidence}`, JSON.stringify(evidence, null, 2));
const screenshotDataUrl = `data:image/png;base64,${modelScreenshot.toString('base64')}`;
const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
const visionModel = process.env.GEMINI_VISION_MODEL || 'gemini-3.5-flash';
const textModel = process.env.GEMINI_TEXT_MODEL || 'gemini-3.5-flash';

let markdown: string;
let visualReport: unknown = { skipped: 'GOOGLE_API_KEY missing; local fallback used' };
let validationIssues: string[] = [];
if (apiKey && !process.argv.includes('--no-ai')) {
  try {
    const result = await generateDesignMdPipeline({ apiKey, visionModel, textModel, evidence, screenshotDataUrl, screenshotMode: 'fullPage' });
    markdown = result.markdown;
    visualReport = result.visualReport;
    validationIssues = result.validationIssues;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    markdown = localDesignMdFromEvidence(evidence);
    visualReport = { error: message, fallback: 'Local evidence-based DESIGN.md used after Gemini failure' };
    await writeFile(`${outRoot}/ai-error.txt`, message);
  }
} else {
  markdown = localDesignMdFromEvidence(evidence);
}

await writeFile(`${outRoot}/${files.design}`, markdown);
await writeFile(`${outRoot}/${files.visualReport}`, JSON.stringify(visualReport, null, 2));
await writeFile(`${outRoot}/comparison-report.json`, JSON.stringify({ ...compareDesignMd(markdown), validationIssues }, null, 2));
await writeFile(`${outRoot}/evaluation-report.json`, JSON.stringify(evaluateDesignMd(markdown, evidence), null, 2));
console.log(`Wrote ${outRoot}`);
