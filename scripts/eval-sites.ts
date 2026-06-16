import 'dotenv/config';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { localDesignMdFromEvidence } from '../src/lib/design-md/local-generate';
import { extractPageEvidenceInPage } from '../src/lib/extraction/in-page';
import { buildMultiViewportEvidence } from '../src/lib/extraction/multi-viewport';
import type { ExtractionOptions } from '../src/lib/extraction/types';
import { buildVisualClusters } from '../src/lib/extraction/visual-clusters';
import { DEFAULT_GEMINI_MODEL } from '../src/lib/gemini/model-filter';
import { generateDesignMdPipeline } from '../src/lib/gemini/pipeline';
import { compareDesignMd, type ComparisonReport } from './compare-design-md';
import { evaluateDesignMd } from './evaluate-design-md';
import { referenceSites } from './fixtures/reference-sites';

const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
const noAi = process.argv.includes('--no-ai') || !apiKey;
process.env.GEMINI_TIMEOUT_MS ??= '90000';
const limitIndex = process.argv.indexOf('--limit');
const limit = limitIndex >= 0 ? Number(process.argv[limitIndex + 1]) : referenceSites.length;
const visionModel = process.env.GEMINI_VISION_MODEL || DEFAULT_GEMINI_MODEL;
const textModel = process.env.GEMINI_TEXT_MODEL || DEFAULT_GEMINI_MODEL;
const browser = await chromium.launch({ headless: true });
const summary: Array<{ slug: string; ok: boolean; report?: ComparisonReport; error?: string; aiError?: string }> = [];

for (const site of referenceSites.slice(0, limit)) {
  const outDir = `artifacts/eval/${site.slug}`;
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  try {
    console.log(`${site.slug}: opening ${site.url}`);
    const page = await browser.newPage({ viewport: { width: 1440, height: 1200 }, deviceScaleFactor: 1 });
    await page.goto(site.url, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(2500);
    console.log(`${site.slug}: extracting`);
    const extractionOptions = {
      captureMode: 'fullPage',
      includeRawCssVariables: false,
      maxNodes: 1000,
      maxTextLength: 240
    } satisfies Partial<ExtractionOptions>;
    const desktopEvidence = await page.evaluate(extractPageEvidenceInPage, extractionOptions);
    const screenshotPath = `${outDir}/screenshot.png`;
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
      screenshotSegments: [
        {
          y: 0,
          width: desktopEvidence.metadata.viewportWidth,
          height: desktopEvidence.metadata.documentHeight,
          devicePixelRatio: desktopEvidence.metadata.devicePixelRatio
        }
      ],
      visualClusters: buildVisualClusters({
        viewport: 'desktop',
        evidence: desktopEvidence,
        segments: [
          {
            y: 0,
            width: desktopEvidence.metadata.viewportWidth,
            height: desktopEvidence.metadata.documentHeight,
            devicePixelRatio: desktopEvidence.metadata.devicePixelRatio
          }
        ]
      })
    };
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(800);
    const mobileEvidence = await page.evaluate(extractPageEvidenceInPage, extractionOptions);
    const mobileScreenshot = await page.screenshot({ fullPage: true });
    await writeFile(`${outDir}/mobile-screenshot.png`, mobileScreenshot);
    const mobileViewport = {
      label: 'mobile' as const,
      viewport: {
        width: mobileEvidence.metadata.viewportWidth,
        height: mobileEvidence.metadata.viewportHeight,
        devicePixelRatio: mobileEvidence.metadata.devicePixelRatio
      },
      evidence: mobileEvidence,
      screenshotSegments: [
        {
          y: 0,
          width: mobileEvidence.metadata.viewportWidth,
          height: mobileEvidence.metadata.documentHeight,
          devicePixelRatio: mobileEvidence.metadata.devicePixelRatio
        }
      ],
      visualClusters: buildVisualClusters({
        viewport: 'mobile',
        evidence: mobileEvidence,
        segments: [
          {
            y: 0,
            width: mobileEvidence.metadata.viewportWidth,
            height: mobileEvidence.metadata.documentHeight,
            devicePixelRatio: mobileEvidence.metadata.devicePixelRatio
          }
        ]
      })
    };
    const evidence = buildMultiViewportEvidence([desktopViewport, mobileViewport]);
    await page.close();
    await writeFile(`${outDir}/evidence.json`, JSON.stringify(evidence, null, 2));
    const screenshotDataUrl = `data:image/png;base64,${modelScreenshot.toString('base64')}`;
    let markdown: string;
    let visualReport: unknown = { skipped: 'GOOGLE_API_KEY missing or --no-ai used; local fallback used' };
    let aiError: string | undefined;
    if (!noAi && apiKey) {
      console.log(`${site.slug}: generating`);
      try {
        const result = await generateDesignMdPipeline({ apiKey, visionModel, textModel, evidence, screenshotDataUrl, screenshotMode: 'fullPage' });
        markdown = result.markdown;
        visualReport = result.visualReport;
      } catch (error) {
        aiError = error instanceof Error ? error.message : String(error);
        markdown = localDesignMdFromEvidence(evidence);
        visualReport = { error: aiError, fallback: 'Local evidence-based DESIGN.md used after Gemini failure' };
        await writeFile(`${outDir}/ai-error.txt`, aiError);
        console.error(`${site.slug}: ${aiError}`);
      }
    } else {
      markdown = localDesignMdFromEvidence(evidence);
    }
    await writeFile(`${outDir}/DESIGN.md`, markdown);
    await writeFile(`${outDir}/visual-report.json`, JSON.stringify(visualReport, null, 2));
    const reference = await fetchReference(site.referenceDesignMdUrl);
    const report = compareDesignMd(markdown, reference);
    await writeFile(`${outDir}/comparison-report.json`, JSON.stringify(report, null, 2));
    await writeFile(`${outDir}/evaluation-report.json`, JSON.stringify(evaluateDesignMd(markdown, evidence), null, 2));
    await writeFile(`${outDir}/comparison-report.md`, reportMarkdown(site.name, report));
    summary.push({ slug: site.slug, ok: true, report, aiError });
    console.log(`${site.slug}: ${report.overallScore}${aiError ? ' (fallback)' : ''}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await writeFile(`${outDir}/error.txt`, message);
    summary.push({ slug: site.slug, ok: false, error: message });
    console.error(`${site.slug}: ${message}`);
  }
}

await browser.close();
await mkdir('artifacts/eval', { recursive: true });
await writeFile('artifacts/eval/summary.json', JSON.stringify(summary, null, 2));
console.log('Wrote artifacts/eval/summary.json');

async function fetchReference(url: string): Promise<string | undefined> {
  try {
    const response = await fetch(url);
    return response.ok ? response.text() : undefined;
  } catch {
    return undefined;
  }
}

function reportMarkdown(name: string, report: ComparisonReport): string {
  return `# ${name} eval

- Overall: ${report.overallScore}
- Structure: ${report.structureScore}
- Tokens: ${report.tokenScore}
- Narrative: ${report.narrativeScore}
- Evidence alignment: ${report.evidenceAlignmentScore}

## Issues
${report.issues.map((issue) => `- ${issue}`).join('\n') || '- None'}

## Recommendations
${report.recommendations.map((item) => `- ${item}`).join('\n') || '- None'}
`;
}
