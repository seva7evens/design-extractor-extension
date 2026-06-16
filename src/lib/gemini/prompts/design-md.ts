import { isMultiViewportEvidence, primaryExtractionEvidence } from '@/lib/extraction/multi-viewport';
import type { DesignEvidence, ExtractionEvidence } from '@/lib/extraction/types';

export const DESIGN_MD_SYSTEM_PROMPT = `You are a senior design systems analyst and frontend design engineer.
You receive screenshot-derived visual evidence, DOM/layout evidence, computed styles, and extracted tokens.

Priority order:
1. measured computed styles and token evidence
2. visual screenshot observations
3. DOM semantics
4. careful inference

Rules:
- Do not invent unseen sections.
- Do not invent values when measured values exist.
- Do not output generic advice.
- Do not output implementation code.
- Do not mention that you are an AI.
- Do not mention the extraction pipeline.
- Do not include citations.
- Do not include raw JSON.
- Output only the final DESIGN.md markdown.
- Use exact hex colors.
- Use exact font sizes, weights, and line heights when available.
- Use token references inside component definitions.
- Keep YAML parseable.
- Preserve section order.
- Avoid duplicate sections.
- Include Do's and Don'ts.
- Include Implementation Notes for AI coding agents.
- Mark uncertainty only where truly necessary.
- Ensure all token references resolve.
- Ensure each component references existing tokens.
- Treat componentInventory as a required checklist for Components.
- Treat layoutRegions as the source of visible page order and responsive structure.
- Mention loading, empty, disabled, error, or skeleton states only when stateHints or visual evidence supports them.
- If multiple viewports are present, include concrete desktop/mobile responsive differences.
- Treat visualClusters as screenshot-backed visual bands; use them to cover areas DOM semantics may under-describe.

Format:
Start with YAML front matter, then markdown body. No wrapping code fence.
Required body sections in order:
## Overview
## Colors
## Typography
## Layout
## Elevation & Depth
## Shapes
## Components
## Do's and Don'ts
## Implementation Notes`;

export function designMdUserPrompt(args: {
  evidence: DesignEvidence;
  visualReport: unknown;
  screenshotMode: string;
}): string {
  const primary = primaryExtractionEvidence(args.evidence);
  const multi = isMultiViewportEvidence(args.evidence) ? args.evidence : undefined;
  return JSON.stringify({
    task: 'Generate a Google Stitch-compatible DESIGN.md for the captured page.',
    source: {
      url: primary.metadata.url,
      hostname: primary.metadata.hostname,
      title: primary.metadata.title,
      screenshotMode: args.screenshotMode
    },
    frontmatterRequired: ['version', 'name', 'description', 'colors', 'typography', 'rounded', 'spacing', 'components'],
    tokens: multi?.mergedTokens ?? primary.tokens,
    componentInventory: multi?.mergedComponentInventory ?? primary.componentInventory,
    layoutRegions: primary.layoutRegions,
    stateHints: primary.stateHints,
    responsiveFindings: multi?.responsiveFindings ?? [],
    visualClusters: multi?.viewports.flatMap((viewport) => viewport.visualClusters.slice(0, 12)) ?? [],
    viewports: multi?.viewports.map((viewport) => compactViewport(viewport.evidence, viewport.label, viewport.visualClusters.length)) ?? [],
    visualReport: args.visualReport,
    importantNodes: primary.nodes
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 240)
      .map((node) => ({
        id: node.id,
        kind: node.kind,
        tag: node.tag,
        text: node.text,
        rect: node.rect,
        styles: node.styles,
        asset: node.asset
      }))
  });
}

function compactViewport(evidence: ExtractionEvidence, label: string, visualClusterCount: number) {
  return {
    label,
    viewport: {
      width: evidence.metadata.viewportWidth,
      height: evidence.metadata.viewportHeight,
      documentHeight: evidence.metadata.documentHeight
    },
    componentInventory: evidence.componentInventory.slice(0, 20),
    layoutRegions: evidence.layoutRegions.slice(0, 12),
    stateHints: evidence.stateHints,
    visualClusterCount
  };
}

export function repairDesignMdPrompt(markdown: string, issues: string[]): string {
  return JSON.stringify({
    task: 'Repair this DESIGN.md. Return corrected DESIGN.md only.',
    issues,
    markdown
  });
}
