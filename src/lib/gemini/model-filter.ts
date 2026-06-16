import type { GeminiModel } from '@/lib/extraction/types';

export function supportsGenerateContent(model: GeminiModel): boolean {
  return model.supportedGenerationMethods.includes('generateContent');
}

export function displayModelName(model: GeminiModel): string {
  return model.name.replace(/^models\//, '');
}

export function filterTextModels(models: GeminiModel[]): GeminiModel[] {
  return models
    .filter(supportsGenerateContent)
    .filter((model) => !isExcludedGenerationModel(model.name))
    .sort(rankModel);
}

export function filterVisionModels(models: GeminiModel[]): GeminiModel[] {
  return filterTextModels(models)
    .filter((model) => /gemini/i.test(model.name))
    .sort(rankModel);
}

export const DEFAULT_GEMINI_MODEL = 'gemini-3.1-flash-lite';

export function chooseDefaultModel(models: GeminiModel[], fallback = DEFAULT_GEMINI_MODEL): string {
  const names = models.map(displayModelName);
  return names.find((name) => name === fallback) ?? names.find((name) => name === DEFAULT_GEMINI_MODEL) ?? names[0] ?? fallback;
}

function rankModel(a: GeminiModel, b: GeminiModel): number {
  return scoreName(displayModelName(b)) - scoreName(displayModelName(a));
}

function scoreName(name: string): number {
  let score = 0;
  if (name === DEFAULT_GEMINI_MODEL) score += 160;
  if (name === 'gemini-3.5-flash') score += 140;
  if (name === 'gemini-3-flash-preview') score += 95;
  if (name === 'gemini-2.5-flash') score += 80;
  if (name === 'gemini-2.5-flash-lite') score += 65;
  if (/pro/i.test(name)) score -= 60;
  if (/preview|exp|latest/i.test(name)) score -= 20;
  if (/3\.[0-9]/.test(name)) score += 20;
  if (/^gemini-3/.test(name)) score += 10;
  if (/2\.5/.test(name)) score += 10;
  if (/flash/i.test(name)) score += 5;
  return score;
}

function isExcludedGenerationModel(name: string): boolean {
  return /imagen|embedding|aqa|tts|native-audio|live|lyria|robotics|computer-use|deep-research|antigravity|nano-banana|image|gemini-2\.0/i.test(name);
}
