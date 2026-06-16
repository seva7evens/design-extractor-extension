import { browser } from 'wxt/browser';

export async function downloadText(filename: string, content: string, mimeType = 'text/plain;charset=utf-8'): Promise<void> {
  const dataUrl = `data:${mimeType};base64,${btoa(unescape(encodeURIComponent(content)))}`;
  await browser.downloads.download({ url: dataUrl, filename, saveAs: true });
}

export async function downloadDataUrl(filename: string, dataUrl: string): Promise<void> {
  await browser.downloads.download({ url: dataUrl, filename, saveAs: true });
}
