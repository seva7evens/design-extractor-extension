import { defineBackground } from '#imports';
import { browser } from 'wxt/browser';
import { artifactFilenames } from '@/lib/browser/filenames';
import { downloadDataUrl, downloadText } from '@/lib/browser/download';
import { buildMultiViewportEvidence } from '@/lib/extraction/multi-viewport';
import { buildVisualClusters, stripSegmentDataUrls } from '@/lib/extraction/visual-clusters';
import { ExtractionOptionsSchema, type DesignEvidence, type ExtractionEvidence, type ProgressEvent, type ViewportEvidence } from '@/lib/extraction/types';
import { validateGeminiKey, listGeminiModels } from '@/lib/gemini/client';
import { chooseDefaultModel, filterTextModels, filterVisionModels } from '@/lib/gemini/model-filter';
import { generateDesignMdPipeline } from '@/lib/gemini/pipeline';
import type { RuntimeRequest, RuntimeResponse } from '@/lib/messaging/protocol';
import { captureFullPageScreenshot, captureViewportScreenshot } from '@/lib/screenshot/capture';
import { addGenerationHistory, getSettings, saveSettings } from '@/lib/storage/settings';
import { redactJson } from '@/lib/security/redact';

export default defineBackground(() => {
  chrome.runtime.onMessage.addListener((request: RuntimeRequest, _sender, sendResponse) => {
    handleMessage(request)
      .then((data) => sendResponse({ ok: true, data } satisfies RuntimeResponse))
      .catch((error) => sendResponse({ ok: false, error: { message: error instanceof Error ? error.message : String(error) } } satisfies RuntimeResponse));
    return true;
  });
});

async function handleMessage(request: RuntimeRequest): Promise<unknown> {
  switch (request.type) {
    case 'GET_SETTINGS':
      return getSettings();
    case 'SAVE_SETTINGS':
      return saveSettings(request.settings);
    case 'VALIDATE_GEMINI_KEY': {
      const result = await validateGeminiKey(request.apiKey);
      if (result.status === 'valid') {
        const visionModels = filterVisionModels(result.models);
        const textModels = filterTextModels(result.models);
        await saveSettings({
          apiKey: request.apiKey,
          cachedModels: result.models,
          modelCacheDate: new Date().toISOString(),
          visionModel: chooseDefaultModel(visionModels),
          textModel: chooseDefaultModel(textModels)
        });
      }
      return result;
    }
    case 'LIST_GEMINI_MODELS':
      return listGeminiModels(request.apiKey);
    case 'GENERATE_DESIGN_MD':
      return generateForActiveTab(ExtractionOptionsSchema.parse(request.options));
    case 'DOWNLOAD_ARTIFACT':
      if (request.dataUrl) return downloadDataUrl(request.filename, request.dataUrl);
      return downloadText(request.filename, request.content ?? '', request.mimeType);
    default:
      throw new Error('Unsupported request');
  }
}

async function generateForActiveTab(options: ReturnType<typeof ExtractionOptionsSchema.parse>) {
  const settings = await getSettings();
  if (!settings.apiKey) throw new Error('Add and validate a Gemini API key first');
  emitProgress('Checking page access');
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url) throw new Error('No active tab is available');
  if (!/^https?:\/\//i.test(tab.url)) throw new Error('This page type is restricted. Open an http or https page.');

  const multiViewport = settings.includeMobileEvidence && options.captureMode === 'fullPage';
  emitProgress(multiViewport ? 'Extracting desktop viewport' : 'Extracting DOM');
  const desktop = await captureViewportEvidence(tab.id, 'desktop', options);
  const viewports = [desktop];
  if (multiViewport) {
    emitProgress('Extracting mobile viewport');
    const mobile = await captureMobileViewport(tab, options).catch((error) => {
      desktop.evidence.warnings.push(`Mobile viewport extraction skipped: ${error instanceof Error ? error.message : String(error)}`);
      return undefined;
    });
    if (mobile) viewports.push(mobile);
  }
  const evidence: DesignEvidence = viewports.length > 1 ? buildMultiViewportEvidence(viewports) : desktop.evidence;
  const screenshotDataUrl = desktop.screenshotDataUrl;

  emitProgress('Analyzing visual system');
  const generated = await generateDesignMdPipeline({
    apiKey: settings.apiKey,
    visionModel: settings.visionModel,
    textModel: settings.textModel,
    evidence: redactJson(evidence),
    screenshotDataUrl,
    screenshotMode: options.captureMode
  });

  emitProgress('Validating output');
  const files = artifactFilenames(desktop.evidence.metadata.hostname);
  const artifacts = {
    filename: files.design,
    markdown: generated.markdown,
    screenshotFilename: files.screenshot,
    screenshotDataUrl,
    evidenceFilename: files.evidence,
    evidence: settings.includeEvidenceJson ? evidence : undefined,
    visualReportFilename: files.visualReport,
    visualReport: settings.includeVisualReportJson ? generated.visualReport : undefined,
    validationIssues: generated.validationIssues
  };
  await addGenerationHistory({
    filename: artifacts.filename,
    markdown: artifacts.markdown,
    url: desktop.evidence.metadata.url,
    title: desktop.evidence.metadata.title
  });
  emitProgress('Ready');
  return artifacts;
}

async function captureViewportEvidence(
  tabId: number,
  label: 'desktop' | 'mobile',
  options: ReturnType<typeof ExtractionOptionsSchema.parse>
): Promise<ViewportEvidence> {
  const evidence = await extractFromTab(tabId, options);
  emitProgress(`Capturing ${label} screenshot`);
  const screenshot =
    options.captureMode === 'fullPage'
      ? await captureFullPageScreenshot(tabId)
      : { dataUrl: await captureViewportScreenshot(), warnings: [], segments: [], segmentAnalyses: [] };
  evidence.warnings.push(...screenshot.warnings);
  const segments = stripSegmentDataUrls(screenshot.segments);
  return {
    label,
    viewport: {
      width: evidence.metadata.viewportWidth,
      height: evidence.metadata.viewportHeight,
      devicePixelRatio: evidence.metadata.devicePixelRatio
    },
    evidence,
    screenshotDataUrl: screenshot.dataUrl,
    screenshotSegments: segments,
    visualClusters: buildVisualClusters({ viewport: label, evidence, segments, analyses: screenshot.segmentAnalyses })
  };
}

async function captureMobileViewport(tab: chrome.tabs.Tab, options: ReturnType<typeof ExtractionOptionsSchema.parse>): Promise<ViewportEvidence | undefined> {
  if (!tab.id || tab.windowId === undefined) return undefined;
  let original: chrome.windows.Window | undefined;
  try {
    original = await browser.windows.get(tab.windowId);
    await browser.windows.update(tab.windowId, { state: 'normal', width: 390, height: 844, focused: true });
    await wait(700);
    return await captureViewportEvidence(tab.id, 'mobile', options);
  } finally {
    if (original) {
      const restore: chrome.windows.UpdateInfo = {
        left: original.left,
        top: original.top,
        width: original.width,
        height: original.height,
        focused: true
      };
      await browser.windows.update(tab.windowId, restore).catch(() => undefined);
      if (original.state && original.state !== 'normal') await browser.windows.update(tab.windowId, { state: original.state }).catch(() => undefined);
      await wait(300);
    }
  }
}

async function extractFromTab(tabId: number, options: ReturnType<typeof ExtractionOptionsSchema.parse>): Promise<ExtractionEvidence> {
  await browser.scripting.executeScript({ target: { tabId }, files: ['/content-scripts/content.js'] });
  const [result] = await browser.scripting.executeScript({
    target: { tabId },
    args: [options],
    func: async (extractOptions) => {
      const extractor = (globalThis as any).__DESIGN_MD_EXTRACT_PAGE;
      if (!extractor) throw new Error('Extractor did not load');
      return extractor(extractOptions);
    }
  });
  if (!result.result) throw new Error('Extraction returned no evidence');
  return result.result as ExtractionEvidence;
}

function emitProgress(step: string): void {
  const event: ProgressEvent = { step, message: step, at: new Date().toISOString() };
  chrome.runtime.sendMessage({ type: 'PROGRESS_EVENT', event }, () => void chrome.runtime.lastError);
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
