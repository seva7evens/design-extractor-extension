import { browser } from 'wxt/browser';
import {
  GeminiSettingsSchema,
  GenerationStateSchema,
  type GeminiSettings,
  type GeneratedArtifacts,
  type GenerationState,
  type ProgressEvent
} from '@/lib/extraction/types';

const SETTINGS_KEY = 'designMdSettings';
const HISTORY_KEY = 'designMdHistory';
const GENERATION_STATE_KEY = 'designMdGenerationState';

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

export async function getGenerationState(): Promise<GenerationState> {
  const result = await browser.storage.local.get(GENERATION_STATE_KEY);
  return GenerationStateSchema.parse(result[GENERATION_STATE_KEY] ?? {});
}

export async function setGenerationState(update: GenerationState): Promise<void> {
  await browser.storage.local.set({ [GENERATION_STATE_KEY]: GenerationStateSchema.parse(update) });
}

export async function appendGenerationEvent(event: ProgressEvent): Promise<void> {
  const current = await getGenerationState();
  if (current.status !== 'running') return;
  await setGenerationState({ ...current, events: [...current.events, event].slice(-5) });
}

export function compactArtifacts(artifacts: GeneratedArtifacts): GeneratedArtifacts {
  return {
    filename: artifacts.filename,
    markdown: artifacts.markdown,
    screenshotFilename: artifacts.screenshotFilename,
    evidenceFilename: artifacts.evidenceFilename,
    visualReportFilename: artifacts.visualReportFilename,
    validationIssues: artifacts.validationIssues
  };
}
