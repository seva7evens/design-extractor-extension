import type { RuntimeRequest, ScreenshotSegment, ScreenshotStitchResponse } from '@/lib/messaging/protocol';
import type { ScreenshotSegmentAnalysis } from '@/lib/extraction/types';

chrome.runtime.onMessage.addListener((request: RuntimeRequest, _sender, sendResponse) => {
  if (request.type !== 'STITCH_SCREENSHOTS') return false;
  stitch(request.segments, request.width, request.height)
    .then((response) => sendResponse(response))
    .catch((error) => sendResponse({ error: error instanceof Error ? error.message : String(error) }));
  return true;
});

async function stitch(segments: ScreenshotSegment[], cssWidth: number, cssHeight: number): Promise<ScreenshotStitchResponse> {
  const dpr = segments[0]?.devicePixelRatio || devicePixelRatio || 1;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(cssWidth * dpr));
  canvas.height = Math.max(1, Math.round(cssHeight * dpr));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is unavailable');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const analysis: ScreenshotSegmentAnalysis[] = [];
  for (const segment of segments) {
    const image = await loadImage(segment.dataUrl);
    analysis.push(analyzeImage(image, segment));
    const sourceHeight = Math.min(image.height, canvas.height - Math.round(segment.y * dpr));
    ctx.drawImage(image, 0, 0, image.width, sourceHeight, 0, Math.round(segment.y * dpr), canvas.width, sourceHeight);
  }
  return { dataUrl: canvas.toDataURL('image/png'), analysis };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not load screenshot segment'));
    image.src = src;
  });
}

function analyzeImage(image: HTMLImageElement, segment: ScreenshotSegment): ScreenshotSegmentAnalysis {
  const canvas = document.createElement('canvas');
  const width = Math.max(1, Math.min(160, image.width));
  const height = Math.max(1, Math.round((width / image.width) * image.height));
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return emptyAnalysis(segment);
  ctx.drawImage(image, 0, 0, width, height);
  const data = ctx.getImageData(0, 0, width, height).data;
  const buckets = new Map<string, number>();
  let sum = 0;
  let min = 255;
  let max = 0;
  let dense = 0;
  const stride = 4 * 4;
  for (let i = 0; i < data.length; i += stride) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    sum += lum;
    min = Math.min(min, lum);
    max = Math.max(max, lum);
    if (lum > 24 && lum < 232) dense += 1;
    const key = `#${toHex(Math.round(r / 32) * 32)}${toHex(Math.round(g / 32) * 32)}${toHex(Math.round(b / 32) * 32)}`;
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  const samples = Math.max(1, Math.ceil(data.length / stride));
  return {
    y: segment.y,
    width: segment.width,
    height: segment.height,
    dominantColors: Array.from(buckets.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([color]) => color),
    brightness: round(sum / samples / 255),
    contrast: round((max - min) / 255),
    density: round(dense / samples)
  };
}

function emptyAnalysis(segment: ScreenshotSegment): ScreenshotSegmentAnalysis {
  return { y: segment.y, width: segment.width, height: segment.height, dominantColors: [], brightness: 0, contrast: 0, density: 0 };
}

function toHex(value: number): string {
  return Math.max(0, Math.min(255, value)).toString(16).padStart(2, '0');
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
