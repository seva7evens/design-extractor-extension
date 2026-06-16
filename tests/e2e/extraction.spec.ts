import 'dotenv/config';
import { test, expect } from '@playwright/test';
import { localDesignMdFromEvidence } from '../../src/lib/design-md/local-generate';
import { validateDesignMd } from '../../src/lib/design-md/validate';
import { extractPageEvidenceInPage } from '../../src/lib/extraction/in-page';
import { buildMultiViewportEvidence } from '../../src/lib/extraction/multi-viewport';
import type { ExtractionOptions } from '../../src/lib/extraction/types';
import { buildVisualClusters } from '../../src/lib/extraction/visual-clusters';
import { GeminiError, generateGeminiContent } from '../../src/lib/gemini/client';
import { DEFAULT_GEMINI_MODEL } from '../../src/lib/gemini/model-filter';

test('extracts CSS variables, computed styles, and visible nodes from a fixture page', async ({ page }) => {
  await page.setContent(`
    <style>
      :root { --color-primary: #0f62fe; --space-md: 16px; --radius-card: 12px; }
      body { margin: 0; font-family: Arial, sans-serif; color: #111827; }
      header { background: #f4f7fb; padding: 32px; }
      h1 { font-size: 48px; line-height: 1.05; letter-spacing: -1px; }
      .card { border-radius: var(--radius-card); box-shadow: 0 12px 30px rgba(0,0,0,.12); padding: var(--space-md); }
      button { background: var(--color-primary); color: white; border-radius: 9999px; padding: 12px 20px; }
    </style>
    <header><nav><a href="#">Docs</a></nav><h1>Design systems from pages</h1><button>Generate</button></header>
    <main><section class="card"><h2>Reusable evidence</h2><p>Cards, typography, and tokens.</p></section></main>
  `);
  const extractionOptions = {
    captureMode: 'fullPage',
    includeRawCssVariables: true,
    maxNodes: 1000,
    maxTextLength: 240
  } satisfies Partial<ExtractionOptions>;
  const evidence = await page.evaluate(extractPageEvidenceInPage, extractionOptions);
  expect(evidence.nodes.some((node) => node.kind === 'button')).toBe(true);
  expect(evidence.componentInventory.some((item) => item.name === 'button')).toBe(true);
  expect(evidence.layoutRegions.some((region) => region.kind === 'header')).toBe(true);
  expect(evidence.tokens.cssVariables['--color-primary']).toBe('#0f62fe');
  expect(evidence.tokens.colors.some((token) => token.value === '#0f62fe')).toBe(true);
});

test('captures screenshot and produces mock DESIGN.md without API key', async ({ page }, testInfo) => {
  await page.setContent('<main style="padding:40px;font:20px system-ui;color:#111;background:#fff"><h1>Fixture</h1><button>Go</button></main>');
  const extractionOptions = {
    captureMode: 'fullPage',
    includeRawCssVariables: false,
    maxNodes: 1000,
    maxTextLength: 240
  } satisfies Partial<ExtractionOptions>;
  const evidence = await page.evaluate(extractPageEvidenceInPage, extractionOptions);
  const screenshot = await page.screenshot({ fullPage: true });
  await testInfo.attach('screenshot', { body: screenshot, contentType: 'image/png' });
  expect(screenshot.length).toBeGreaterThan(1000);
  const markdown = localDesignMdFromEvidence(evidence);
  expect(validateDesignMd(markdown).ok).toBe(true);
});

test('builds multi-viewport evidence from desktop and mobile fixture states', async ({ page }) => {
  await page.setContent(`
    <style>
      body { margin: 0; font: 16px Inter, sans-serif; }
      .hero { padding: 48px; background: #07080a; color: #fff; }
      .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; padding: 32px; }
      .card { border-radius: 12px; background: #f4f8fb; padding: 24px; }
      @media (max-width: 600px) {
        .hero { padding: 24px; }
        .grid { grid-template-columns: 1fr; gap: 12px; }
      }
    </style>
    <main><section class="hero"><h1>Responsive product</h1></section><section class="grid"><article class="card">One</article><article class="card">Two</article></section></main>
  `);
  const options = { captureMode: 'fullPage', includeRawCssVariables: false, maxNodes: 1000, maxTextLength: 240 } satisfies Partial<ExtractionOptions>;
  await page.setViewportSize({ width: 1200, height: 900 });
  const desktop = await page.evaluate(extractPageEvidenceInPage, options);
  await page.setViewportSize({ width: 390, height: 844 });
  const mobile = await page.evaluate(extractPageEvidenceInPage, options);
  const desktopSegment = { y: 0, width: desktop.metadata.viewportWidth, height: desktop.metadata.documentHeight, devicePixelRatio: 1 };
  const mobileSegment = { y: 0, width: mobile.metadata.viewportWidth, height: mobile.metadata.documentHeight, devicePixelRatio: 1 };
  const multi = buildMultiViewportEvidence([
    {
      label: 'desktop',
      viewport: { width: desktop.metadata.viewportWidth, height: desktop.metadata.viewportHeight, devicePixelRatio: 1 },
      evidence: desktop,
      screenshotSegments: [desktopSegment],
      visualClusters: buildVisualClusters({ viewport: 'desktop', evidence: desktop, segments: [desktopSegment] })
    },
    {
      label: 'mobile',
      viewport: { width: mobile.metadata.viewportWidth, height: mobile.metadata.viewportHeight, devicePixelRatio: 1 },
      evidence: mobile,
      screenshotSegments: [mobileSegment],
      visualClusters: buildVisualClusters({ viewport: 'mobile', evidence: mobile, segments: [mobileSegment] })
    }
  ]);
  expect(multi.viewports).toHaveLength(2);
  expect(multi.responsiveFindings.join(' ')).toContain('mobile viewport');
  expect(localDesignMdFromEvidence(multi)).toContain('Responsive evidence');
});

test('real Gemini smoke is env-gated', async ({ page }, testInfo) => {
  void page;
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  test.skip(!apiKey, 'GOOGLE_API_KEY not set');
  try {
    const text = await generateGeminiContent({
      apiKey: apiKey!,
      model: process.env.GEMINI_TEXT_MODEL || DEFAULT_GEMINI_MODEL,
      parts: [{ text: 'Return exactly: ok' }],
      temperature: 0
    });
    await testInfo.attach('gemini-response', { body: text, contentType: 'text/plain' });
    expect(text.toLowerCase()).toContain('ok');
  } catch (error) {
    if (error instanceof GeminiError && ['quota', 'network'].includes(error.code)) {
      test.skip(true, `Gemini unavailable: ${error.message.split('\n')[0]}`);
    }
    throw error;
  }
});
