import 'dotenv/config';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { artifactFilenames } from '../src/lib/browser/filenames';
import { compareDesignMd } from './compare-design-md';

const url = process.argv.find((arg) => /^https?:\/\//.test(arg)) ?? 'https://www.gov.uk/';
const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('GOOGLE_API_KEY or GEMINI_API_KEY is required for manual extension smoke.');
  process.exit(1);
}

const extensionPath = path.resolve('.output/chrome-mv3');
const slug = artifactFilenames(url).slug;
const outDir = `artifacts/manual-smoke/${slug}`;
const profilePath = path.resolve(outDir, 'profile');
await rm(profilePath, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

const context = await chromium.launchPersistentContext(profilePath, {
  headless: false,
  viewport: { width: 1440, height: 1000 },
  args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`]
});
context.setDefaultTimeout(900000);

try {
  const serviceWorker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
  const extensionId = new URL(serviceWorker.url()).hostname;
  const extensionPage = await context.newPage();
  await extensionPage.goto(`chrome-extension://${extensionId}/popup.html`);
  await extensionPage.evaluate(
    (settings) =>
      chrome.storage.local.set({
        designMdSettings: settings,
        designMdHistory: []
      }),
    {
      apiKey,
      visionModel: process.env.GEMINI_VISION_MODEL || 'gemini-3.5-flash',
      textModel: process.env.GEMINI_TEXT_MODEL || 'gemini-3.5-flash',
      captureMode: 'fullPage',
      includeEvidenceJson: true,
      includeVisualReportJson: true,
      includeRawCssVariables: false,
      includeMobileEvidence: true,
      cachedModels: []
    }
  );

  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.bringToFront();
  console.log(`Manual smoke ready: ${url}`);
  console.log('Click the Design MD extension action or press Command/Ctrl+Shift+Y, then click Generate DESIGN.md in the popup.');
  console.log('Waiting up to 10 minutes for designMdHistory...');

  const started = Date.now();
  const item = await waitForHistory(extensionPage, started, url);
  const files = artifactFilenames(item.url || url);
  await writeFile(`${outDir}/${files.design}`, item.markdown);
  const report = compareDesignMd(item.markdown);
  await writeFile(`${outDir}/report.json`, JSON.stringify({ ok: true, url: item.url, filename: item.filename, report }, null, 2));
  console.log(`Manual smoke passed: ${outDir}/report.json`);
} finally {
  await context.close();
}

async function waitForHistory(extensionPage: any, started: number, targetUrl: string): Promise<{ filename: string; url: string; markdown: string; date: string }> {
  const targetHost = new URL(targetUrl).hostname.replace(/^www\./, '');
  while (Date.now() - started < 10 * 60_000) {
    const history = await extensionPage.evaluate(async () => {
      const result = await chrome.storage.local.get('designMdHistory');
      return result.designMdHistory ?? [];
    });
    const item = history.find((entry: any) => {
      const entryHost = entry.url ? new URL(entry.url).hostname.replace(/^www\./, '') : '';
      return entry.markdown && entryHost === targetHost && Date.parse(entry.date) >= started;
    });
    if (item) return item;
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error('Timed out waiting for DESIGN.md history entry');
}
