import { browser } from 'wxt/browser';
import type { ScreenshotSegment, ScreenshotStitchResponse } from '@/lib/messaging/protocol';
import type { ScreenshotSegmentAnalysis } from '@/lib/extraction/types';
import { CAPTURE_VISIBLE_TAB_MIN_INTERVAL_MS, isCaptureQuotaError, nextCaptureDelay } from './capture-policy';

const MAX_CAPTURE_HEIGHT = 16000;
let lastCaptureVisibleTabAt = 0;

export async function captureViewportScreenshot(): Promise<string> {
  await wait(nextCaptureDelay(Date.now(), lastCaptureVisibleTabAt));
  try {
    const dataUrl = await browser.tabs.captureVisibleTab({ format: 'png' });
    lastCaptureVisibleTabAt = Date.now();
    return dataUrl;
  } catch (error) {
    if (!isCaptureQuotaError(error)) throw error;
    await wait(CAPTURE_VISIBLE_TAB_MIN_INTERVAL_MS);
    const dataUrl = await browser.tabs.captureVisibleTab({ format: 'png' });
    lastCaptureVisibleTabAt = Date.now();
    return dataUrl;
  }
}

export async function captureFullPageScreenshot(tabId: number): Promise<{
  dataUrl: string;
  warnings: string[];
  segments: ScreenshotSegment[];
  segmentAnalyses: ScreenshotSegmentAnalysis[];
}> {
  const warnings: string[] = [];
  const metrics = await pageMetrics(tabId);
  const height = Math.min(metrics.documentHeight, MAX_CAPTURE_HEIGHT);
  if (metrics.documentHeight > MAX_CAPTURE_HEIGHT) warnings.push(`Page height capped at ${MAX_CAPTURE_HEIGHT}px`);
  const positions = scrollPositions(height, metrics.viewportHeight);
  const segments: ScreenshotSegment[] = [];
  for (const y of positions) {
    await setScroll(tabId, y);
    await wait(220);
    const dataUrl = await captureViewportScreenshot();
    segments.push({ dataUrl, y, width: metrics.viewportWidth, height: metrics.viewportHeight, devicePixelRatio: metrics.devicePixelRatio });
  }
  await setScroll(tabId, metrics.scrollY);
  const stitched = await stitchInOffscreen(segments, metrics.viewportWidth, height);
  return { dataUrl: stitched.dataUrl, warnings, segments, segmentAnalyses: stitched.analysis };
}

async function pageMetrics(tabId: number) {
  const [result] = await browser.scripting.executeScript({
    target: { tabId },
    func: () => ({
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      documentWidth: Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth ?? 0),
      documentHeight: Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight ?? 0),
      scrollY: window.scrollY,
      devicePixelRatio: window.devicePixelRatio || 1
    })
  });
  return result.result!;
}

async function setScroll(tabId: number, y: number): Promise<void> {
  await browser.scripting.executeScript({
    target: { tabId },
    args: [y],
    func: (nextY: number) => window.scrollTo({ top: nextY, left: 0, behavior: 'instant' as ScrollBehavior })
  });
}

function scrollPositions(height: number, viewportHeight: number): number[] {
  const overlap = Math.min(120, Math.floor(viewportHeight * 0.15));
  const step = Math.max(1, viewportHeight - overlap);
  const positions: number[] = [];
  for (let y = 0; y < height; y += step) positions.push(y);
  const last = Math.max(0, height - viewportHeight);
  if (positions.at(-1) !== last) positions.push(last);
  return Array.from(new Set(positions));
}

async function stitchInOffscreen(segments: ScreenshotSegment[], width: number, height: number): Promise<ScreenshotStitchResponse> {
  if (!chrome.offscreen?.createDocument) return { dataUrl: segments[0].dataUrl, analysis: [] };
  const offscreenUrl = chrome.runtime.getURL('/offscreen.html');
  const existing = await chrome.runtime.getContexts?.({ contextTypes: ['OFFSCREEN_DOCUMENT'], documentUrls: [offscreenUrl] });
  if (!existing?.length) {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: [chrome.offscreen.Reason.BLOBS],
      justification: 'Stitch full-page screenshots with a canvas'
    });
  }
  const response = await browser.runtime.sendMessage({ type: 'STITCH_SCREENSHOTS', segments, width, height });
  return { dataUrl: response?.dataUrl ?? segments[0].dataUrl, analysis: response?.analysis ?? [] };
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
