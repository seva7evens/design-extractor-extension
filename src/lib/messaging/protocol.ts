import type { ExtractionOptions, GeneratedArtifacts, GeminiSettings, GenerationState, ScreenshotSegmentAnalysis } from '@/lib/extraction/types';

export type RuntimeRequest =
  | { type: 'GET_SETTINGS' }
  | { type: 'GET_GENERATION_STATE' }
  | { type: 'SAVE_SETTINGS'; settings: Partial<GeminiSettings> }
  | { type: 'VALIDATE_GEMINI_KEY'; apiKey: string }
  | { type: 'LIST_GEMINI_MODELS'; apiKey: string }
  | { type: 'GENERATE_DESIGN_MD'; options: ExtractionOptions }
  | { type: 'DOWNLOAD_ARTIFACT'; filename: string; dataUrl?: string; content?: string; mimeType?: string }
  | { type: 'STITCH_SCREENSHOTS'; segments: ScreenshotSegment[]; width: number; height: number };

export type RuntimeResponse<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: { message: string; details?: string; code?: string } };

export type ScreenshotSegment = {
  dataUrl: string;
  y: number;
  width: number;
  height: number;
  devicePixelRatio: number;
};

export type ScreenshotStitchResponse = {
  dataUrl: string;
  analysis: ScreenshotSegmentAnalysis[];
};

export type GenerateResponse = GeneratedArtifacts;
export type GenerationStateResponse = GenerationState;

export function userMessage(error: unknown): RuntimeResponse<never> {
  const message = error instanceof Error ? error.message : String(error);
  return { ok: false, error: { message } };
}
