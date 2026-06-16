import { isMultiViewportEvidence, primaryExtractionEvidence } from '@/lib/extraction/multi-viewport';
import type { DesignEvidence, ExtractionEvidence } from '@/lib/extraction/types';

export const VISUAL_ANALYSIS_SYSTEM_PROMPT = `You are a senior visual design systems analyst.
Return strict JSON only. No markdown. No code fences.
Analyze screenshot-derived visual evidence, layout evidence, computed styles, and extracted tokens.
Prioritize measured evidence over inference. Do not invent hidden pages, states, components, or brand strategy.
Describe what is visible and useful for recreating the interface.`;

export function visualAnalysisUserPrompt(evidence: DesignEvidence): string {
  return JSON.stringify({
    task: 'Produce a compact visual report for DESIGN.md synthesis.',
    requiredShape: {
      overallVisualThesis: 'string',
      visualMood: 'string',
      surfaceRhythm: 'string',
      typographyObservations: ['string'],
      colorObservations: ['string'],
      layoutObservations: ['string'],
      responsiveObservations: ['string'],
      componentObservations: ['string'],
      visualClusterObservations: ['string'],
      imageStyle: 'string',
      interactionMotionHints: ['string'],
      dos: ['string'],
      donts: ['string'],
      confidenceNotes: ['string'],
      missingOrUncertainAreas: ['string']
    },
    evidence: compactEvidence(evidence)
  });
}

function compactEvidence(input: DesignEvidence) {
  const evidence = primaryExtractionEvidence(input);
  const multi = isMultiViewportEvidence(input) ? input : undefined;
  return {
    metadata: evidence.metadata,
    tokens: multi?.mergedTokens ?? evidence.tokens,
    responsiveFindings: multi?.responsiveFindings ?? [],
    visualClusters: multi?.viewports.flatMap((viewport) => viewport.visualClusters.slice(0, 10)) ?? [],
    viewports: multi?.viewports.map((viewport) => compactViewport(viewport.evidence, viewport.label)) ?? [],
    componentInventory: evidence.componentInventory,
    layoutRegions: evidence.layoutRegions,
      stateHints: evidence.stateHints,
      nodes: evidence.nodes
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 180)
      .map((node) => ({
        id: node.id,
        tag: node.tag,
        kind: node.kind,
        text: node.text,
        rect: node.rect,
        styles: node.styles,
        importance: node.importance
      })),
    warnings: evidence.warnings
  };
}

function compactViewport(evidence: ExtractionEvidence, label: string) {
  return {
    label,
    viewportWidth: evidence.metadata.viewportWidth,
    viewportHeight: evidence.metadata.viewportHeight,
    documentHeight: evidence.metadata.documentHeight,
    componentInventory: evidence.componentInventory.slice(0, 16),
    layoutRegions: evidence.layoutRegions.slice(0, 8),
    stateHints: evidence.stateHints
  };
}
