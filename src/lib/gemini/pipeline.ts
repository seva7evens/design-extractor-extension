import { validateDesignMd } from '@/lib/design-md/validate';
import type { DesignEvidence } from '@/lib/extraction/types';
import { generateGeminiContent } from './client';
import { DESIGN_MD_SYSTEM_PROMPT, designMdUserPrompt, repairDesignMdPrompt } from './prompts/design-md';
import { VISUAL_ANALYSIS_SYSTEM_PROMPT, visualAnalysisUserPrompt } from './prompts/visual-analysis';

export async function generateDesignMdPipeline(args: {
  apiKey: string;
  visionModel: string;
  textModel: string;
  evidence: DesignEvidence;
  screenshotDataUrl?: string;
  screenshotMode: string;
}): Promise<{ markdown: string; visualReport: unknown; validationIssues: string[] }> {
  const imagePart = args.screenshotDataUrl && args.screenshotDataUrl.length < 6_000_000
    ? { inlineData: { mimeType: mimeTypeFromDataUrl(args.screenshotDataUrl), data: base64FromDataUrl(args.screenshotDataUrl) } }
    : undefined;

  const visualText = await generateGeminiContent({
    apiKey: args.apiKey,
    model: args.visionModel,
    systemInstruction: VISUAL_ANALYSIS_SYSTEM_PROMPT,
    responseMimeType: 'application/json',
    parts: [imagePart, { text: visualAnalysisUserPrompt(args.evidence) }].filter(Boolean) as any[],
    temperature: 0.1
  });

  let visualReport: unknown;
  try {
    visualReport = JSON.parse(visualText);
  } catch {
    visualReport = { raw: visualText, confidenceNotes: ['Visual report was not valid JSON; using raw text.'] };
  }

  let markdown = await generateGeminiContent({
    apiKey: args.apiKey,
    model: args.textModel,
    systemInstruction: DESIGN_MD_SYSTEM_PROMPT,
    parts: [{ text: designMdUserPrompt({ evidence: args.evidence, visualReport, screenshotMode: args.screenshotMode }) }],
    temperature: 0.15
  });

  let validation = validateDesignMd(markdown);
  if (!validation.ok) {
    markdown = await generateGeminiContent({
      apiKey: args.apiKey,
      model: args.textModel,
      systemInstruction: DESIGN_MD_SYSTEM_PROMPT,
      parts: [{ text: repairDesignMdPrompt(markdown, validation.issues) }],
      temperature: 0
    });
    validation = validateDesignMd(markdown);
  }

  return { markdown, visualReport, validationIssues: validation.issues };
}

function base64FromDataUrl(dataUrl: string): string {
  return dataUrl.split(',')[1] ?? dataUrl;
}

function mimeTypeFromDataUrl(dataUrl: string): string {
  return dataUrl.match(/^data:([^;]+);base64,/)?.[1] ?? 'image/png';
}
