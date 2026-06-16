import 'dotenv/config';
import { execFile } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { chromium } from '@playwright/test';
import { artifactFilenames } from '../src/lib/browser/filenames';
import type { GeneratedArtifacts } from '../src/lib/extraction/types';
import type { RuntimeResponse } from '../src/lib/messaging/protocol';
import { compareDesignMd } from './compare-design-md';

const sites = [
  { slug: 'govuk', url: 'https://www.gov.uk/' },
  { slug: 'stripe', url: 'https://stripe.com/' },
  { slug: 'raycast', url: 'https://www.raycast.com/' }
];

const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('GOOGLE_API_KEY or GEMINI_API_KEY is required for live extension smoke.');
  process.exit(1);
}

const extensionPath = path.resolve('.output/chrome-mv3');
const profilePath = path.resolve('artifacts/live-smoke/extension-profile');
const actionShortcut = process.platform === 'darwin' ? 'Meta+Shift+Y' : 'Control+Shift+Y';
const execFileAsync = promisify(execFile);
await rm(profilePath, { recursive: true, force: true });

const context = await chromium.launchPersistentContext(profilePath, {
  headless: false,
  viewport: { width: 1440, height: 1000 },
  args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`]
});
context.setDefaultTimeout(240000);

try {
  const serviceWorker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
  const extensionId = new URL(serviceWorker.url()).hostname;
  const extensionPage = await context.newPage();
  await extensionPage.goto(`chrome-extension://${extensionId}/popup.html`);
  await extensionPage.evaluate(
    (settings) =>
      chrome.storage.local.set({
        designMdSettings: settings
      }),
    {
      apiKey,
      visionModel: process.env.GEMINI_VISION_MODEL || 'gemini-3.5-flash',
      textModel: process.env.GEMINI_TEXT_MODEL || 'gemini-3.5-flash',
      captureMode: 'fullPage',
      includeEvidenceJson: true,
      includeVisualReportJson: true,
      includeRawCssVariables: false,
      cachedModels: []
    }
  );

  const summary: Array<{ slug: string; ok: boolean; score?: number; error?: string }> = [];
  for (const site of sites) {
    const outDir = `artifacts/live-smoke/${site.slug}`;
    await mkdir(outDir, { recursive: true });
    const page = await context.newPage();
    try {
      await page.goto(site.url, { waitUntil: 'domcontentloaded', timeout: 90000 });
      await page.waitForTimeout(3000);
      const currentUrl = page.url();
      await invokeActionShortcut(page);
      const response = await extensionPage.evaluate(
        async ({ currentUrl }) => {
          const tabs = await chrome.tabs.query({});
          const tab = tabs.find((item) => item.url === currentUrl);
          if (!tab?.id) throw new Error(`Target tab not found: ${currentUrl}`);
          await chrome.tabs.update(tab.id, { active: true });
          return chrome.runtime.sendMessage({
            type: 'GENERATE_DESIGN_MD',
            options: { captureMode: 'fullPage', includeRawCssVariables: false, maxNodes: 1000, maxTextLength: 240 }
          });
        },
        { currentUrl }
      ) as RuntimeResponse<GeneratedArtifacts>;

      if (!response.ok) throw new Error(response.error.message);
      const data = response.data;
      const files = artifactFilenames(currentUrl);
      await writeFile(`${outDir}/extension-${files.design}`, data.markdown);
      if (data.evidence) await writeFile(`${outDir}/extension-${files.evidence}`, JSON.stringify(data.evidence, null, 2));
      if (data.visualReport) await writeFile(`${outDir}/extension-${files.visualReport}`, JSON.stringify(data.visualReport, null, 2));
      if (data.screenshotDataUrl) await writeFile(`${outDir}/extension-${files.screenshot}`, Buffer.from(data.screenshotDataUrl.split(',')[1] ?? '', 'base64'));
      const report = compareDesignMd(data.markdown);
      await writeFile(`${outDir}/extension-comparison-report.json`, JSON.stringify(report, null, 2));
      summary.push({ slug: site.slug, ok: true, score: report.overallScore });
      console.log(`${site.slug}: ${report.overallScore}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await writeFile(`${outDir}/extension-error.txt`, message);
      summary.push({ slug: site.slug, ok: false, error: message });
      console.error(`${site.slug}: ${message}`);
    } finally {
      await page.close().catch(() => undefined);
    }
  }
  await writeFile('artifacts/live-smoke/extension-summary.json', JSON.stringify(summary, null, 2));
} finally {
  await context.close();
}

async function invokeActionShortcut(page: Awaited<ReturnType<typeof context.newPage>>): Promise<void> {
  await page.bringToFront();
  await page.keyboard.press(actionShortcut);
  if (process.platform === 'darwin') {
    await execFileAsync('osascript', [
      '-e',
      'tell application "Chromium" to activate',
      '-e',
      'tell application "System Events" to keystroke "y" using {command down, shift down}'
    ]).catch(() => undefined);
  }
  await page.waitForTimeout(700);
}
