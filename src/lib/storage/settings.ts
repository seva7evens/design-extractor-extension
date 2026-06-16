import { browser } from 'wxt/browser';
import { GeminiSettingsSchema, type GeminiSettings, type GeneratedArtifacts } from '@/lib/extraction/types';

const SETTINGS_KEY = 'designMdSettings';
const HISTORY_KEY = 'designMdHistory';

export async function getSettings(): Promise<GeminiSettings> {
  const result = await browser.storage.local.get(SETTINGS_KEY);
  return GeminiSettingsSchema.parse(result[SETTINGS_KEY] ?? {});
}

export async function saveSettings(update: Partial<GeminiSettings>): Promise<GeminiSettings> {
  const next = GeminiSettingsSchema.parse({ ...(await getSettings()), ...update });
  await browser.storage.local.set({ [SETTINGS_KEY]: next });
  return next;
}

export async function addGenerationHistory(item: Pick<GeneratedArtifacts, 'filename' | 'markdown'> & { url: string; title: string }): Promise<void> {
  const result = await browser.storage.local.get(HISTORY_KEY);
  const history = Array.isArray(result[HISTORY_KEY]) ? result[HISTORY_KEY] : [];
  const compact = {
    filename: item.filename,
    url: item.url,
    title: item.title,
    date: new Date().toISOString(),
    markdown: item.markdown.length < 150000 ? item.markdown : undefined
  };
  await browser.storage.local.set({ [HISTORY_KEY]: [compact, ...history].slice(0, 10) });
}
