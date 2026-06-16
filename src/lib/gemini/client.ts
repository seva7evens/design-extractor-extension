import { GeminiModelSchema, type GeminiModel } from '@/lib/extraction/types';
import { stripCodeFences } from '@/lib/design-md/validate';

const API_ROOT = 'https://generativelanguage.googleapis.com/v1beta';

export type GeminiErrorCode = 'invalid' | 'quota' | 'model' | 'network' | 'unknown';

export class GeminiError extends Error {
  constructor(
    message: string,
    readonly code: GeminiErrorCode,
    readonly status?: number
  ) {
    super(message);
  }
}

export async function listGeminiModels(apiKey: string): Promise<GeminiModel[]> {
  const response = await geminiFetch(`${API_ROOT}/models?pageSize=1000`, apiKey);
  const data = await response.json();
  return (data.models ?? []).map((model: unknown) => GeminiModelSchema.parse(model));
}

export async function validateGeminiKey(apiKey: string): Promise<{ status: 'valid' | 'invalid' | 'quota' | 'unknown'; models: GeminiModel[] }> {
  try {
    const models = await listGeminiModels(apiKey);
    return { status: 'valid', models };
  } catch (error) {
    if (error instanceof GeminiError) {
      if (error.code === 'invalid') return { status: 'invalid', models: [] };
      if (error.code === 'quota') return { status: 'quota', models: [] };
    }
    return { status: 'unknown', models: [] };
  }
}

export async function generateGeminiContent(args: {
  apiKey: string;
  model: string;
  parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }>;
  systemInstruction?: string;
  responseMimeType?: 'application/json' | 'text/plain';
  temperature?: number;
}): Promise<string> {
  const model = args.model.startsWith('models/') ? args.model : `models/${args.model}`;
  const response = await geminiFetch(`${API_ROOT}/${model}:generateContent`, args.apiKey, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: args.parts }],
      systemInstruction: args.systemInstruction ? { parts: [{ text: args.systemInstruction }] } : undefined,
      generationConfig: {
        temperature: args.temperature ?? 0.2,
        responseMimeType: args.responseMimeType
      }
    })
  });
  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? '').join('') ?? '';
  if (!text.trim()) throw new GeminiError('Gemini returned an empty response', 'unknown', response.status);
  return stripCodeFences(text);
}

function withKey(url: string, apiKey: string): string {
  const parsed = new URL(url);
  parsed.searchParams.set('key', apiKey);
  return parsed.toString();
}

async function geminiFetch(url: string, apiKey: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutMs =
    typeof process !== 'undefined' && process.env.GEMINI_TIMEOUT_MS ? Number.parseInt(process.env.GEMINI_TIMEOUT_MS, 10) : 120000;
  const timeout = setTimeout(() => controller.abort(), Number.isFinite(timeoutMs) ? timeoutMs : 120000);
  let response: Response;
  try {
    response = await fetch(withKey(url, apiKey), { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw new GeminiError('Gemini request timed out', 'network');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
  if (response.ok) return response;
  let message = `Gemini request failed (${response.status})`;
  try {
    const body = await response.json();
    message = body.error?.message ?? message;
  } catch {
    // Keep generic message; never include the API key or request URL.
  }
  if (response.status === 400 || response.status === 401 || response.status === 403) throw new GeminiError(message, 'invalid', response.status);
  if (response.status === 404) throw new GeminiError(message, 'model', response.status);
  if (response.status === 429) throw new GeminiError(message, 'quota', response.status);
  if (response.status >= 500) throw new GeminiError(message, 'network', response.status);
  throw new GeminiError(message, 'unknown', response.status);
}
