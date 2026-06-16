import { isMultiViewportEvidence, primaryExtractionEvidence } from '@/lib/extraction/multi-viewport';
import type { DesignEvidence, ExtractionEvidence, VisualCluster } from '@/lib/extraction/types';

export function localDesignMdFromEvidence(input: DesignEvidence): string {
  const multi = isMultiViewportEvidence(input) ? input : undefined;
  const primary = primaryExtractionEvidence(input);
  const evidence: ExtractionEvidence = multi
    ? {
        ...primary,
        tokens: multi.mergedTokens,
        componentInventory: multi.mergedComponentInventory
      }
    : primary;
  const extractedColors = Object.fromEntries(
    evidence.tokens.colors.slice(0, 14).map((color, index) => [index === 0 ? color.role : `${color.role}-${index}`, color.value])
  );
  const extractedTypography = Object.fromEntries(
    evidence.tokens.typography.slice(0, 8).map((type, index) => [
      index === 0 ? type.role : `${type.role}-${index}`,
      {
        fontFamily: type.fontFamily,
        fontSize: type.fontSize,
        fontWeight: type.fontWeight,
        lineHeight: type.lineHeight,
        letterSpacing: type.letterSpacing
      }
    ])
  );
  const extractedRounded = Object.fromEntries(evidence.tokens.radius.slice(0, 8).map((item) => [item.role, item.value]));
  const extractedSpacing = Object.fromEntries(evidence.tokens.spacing.slice(0, 8).map((item) => [item.role, item.value]));
  const colors = Object.keys(extractedColors).length ? extractedColors : { primary: '#000000', canvas: '#ffffff' };
  const typography = Object.keys(extractedTypography).length
    ? extractedTypography
    : { body: { fontFamily: 'system-ui', fontSize: '16px', fontWeight: '400', lineHeight: 'normal', letterSpacing: '0px' } };
  const rounded = Object.keys(extractedRounded).length ? extractedRounded : { none: '0px', sm: '6px', pill: '9999px' };
  const spacing = Object.keys(extractedSpacing).length ? extractedSpacing : { sm: '8px', md: '16px', lg: '24px' };
  const firstColor = Object.keys(colors)[0] ?? 'primary';
  const backgroundColor = preferredToken(colors, ['canvas', 'surface', 'ink', 'gradient'], firstColor);
  const textColor = preferredToken(colors, ['body', 'ink', 'inverse-text', 'accent'], Object.keys(colors)[1] ?? firstColor);
  const firstType = Object.keys(typography)[0] ?? 'body';
  const firstRounded = Object.keys(rounded)[0] ?? 'sm';
  const firstSpacing = Object.keys(spacing)[0] ?? 'md';
  const components = componentTokens(evidence, colors, rounded, backgroundColor, textColor, firstType, firstRounded, firstSpacing);
  const regions = evidence.layoutRegions.slice(0, 10);
  const inventory = evidence.componentInventory.slice(0, 14);
  const states = evidence.stateHints.slice(0, 8);
  const visualClusters = multi?.viewports.flatMap((viewport) => viewport.visualClusters.slice(0, 8)) ?? [];

  return `---
version: alpha
name: ${safeName(evidence.metadata.hostname)}-design-analysis
description: Evidence-backed visual summary for ${evidence.metadata.hostname}.
colors:
${yamlMap(colors)}
typography:
${yamlMap(typography)}
rounded:
${yamlMap(rounded)}
spacing:
${yamlMap(spacing)}
components:
${yamlMap(components, 2)}
---

## Overview
${evidence.metadata.hostname} uses the visible layout, typography, and color tokens captured from ${evidence.metadata.url}. The page was measured at ${evidence.metadata.viewportWidth}x${evidence.metadata.viewportHeight}px with a document size of ${evidence.metadata.documentWidth}x${evidence.metadata.documentHeight}px. This DESIGN.md is generated from computed styles, DOM semantics, component inventory, and screenshot capture; it should be treated as factual evidence rather than brand strategy.

The primary visible structure is ${regions.map((region) => region.kind).join(', ') || 'the captured document flow'}. The evidence contains ${evidence.nodes.length} significant nodes, ${inventory.length} component groups, and ${states.length} explicit state hints. ${multi ? `It also includes ${multi.viewports.length} viewport captures and ${visualClusters.length} screenshot-backed visual clusters.` : ''} Recreate only visible surfaces, hierarchy, and interactions; do not add unseen pages, hidden navigation states, or marketing claims.

## Colors
Use the measured color tokens above. The largest surfaces and repeated text colors should drive canvas, ink, accent, and border choices.

${evidence.tokens.colors
  .slice(0, 10)
  .map((color) => `- ${color.role}: ${color.value}, ${color.usageCount} uses, area ${color.area}px, sample nodes ${color.nodeIds.join(', ')}.`)
  .join('\n')}

Prefer token references such as {colors.${backgroundColor}} and {colors.${textColor}} inside components. Avoid adding extra accent colors unless a measured component already used them.

## Typography
Use the measured font families, sizes, weights, line heights, and letter spacing from the YAML tokens. Larger groups represent the dominant hierarchy.

${evidence.tokens.typography
  .slice(0, 8)
  .map((type) => `- ${type.role}: ${type.fontFamily}, ${type.fontSize}, weight ${type.fontWeight}, line-height ${type.lineHeight}, letter-spacing ${type.letterSpacing}, ${type.count} samples.`)
  .join('\n')}

Keep body copy on {typography.${firstType}} unless a more specific measured token is present. Preserve tight heading rhythm, capitalization, and numeric/stat styling where captured.

## Layout
Preserve the captured spacing rhythm, section ordering, and major content blocks.

${regions
  .map(
    (region) =>
      `- ${region.kind} ${region.label ? `(${region.label}) ` : ''}at y=${region.rect.documentY}px, ${region.rect.width}x${region.rect.height}px, selector ${region.selector}, child kinds: ${region.childKinds.join(', ') || 'none'}.`
  )
  .join('\n')}

Use spacing tokens like {spacing.${firstSpacing}} for component padding and map larger section gaps to the upper measured spacing tokens. Respect fixed content widths, side rails, grids, and single-column collapse when those are visible in the captured document.

${multi?.responsiveFindings.length ? `Responsive evidence:\n${multi.responsiveFindings.map((finding) => `- ${finding}`).join('\n')}` : ''}

## Elevation & Depth
Use measured shadow tokens when present. Avoid adding decorative depth that was not captured.

${evidence.tokens.shadows.length ? evidence.tokens.shadows.map((shadow) => `- ${shadow.role}: ${shadow.value}, ${shadow.count} samples.`).join('\n') : '- No dominant shadow token was measured; prefer flat surfaces, borders, and color contrast.'}

## Shapes
Use the measured radius scale. Keep pills and larger radii reserved for components that used them in the source page. Default repeated component rounding should reference {rounded.${firstRounded}} unless another measured radius is closer.

${evidence.tokens.radius.map((item) => `- ${item.role}: ${item.value}, ${item.count} samples.`).join('\n')}

## Components
Recreate only visible components from the component inventory. Each component should reference existing tokens for colors, typography, spacing, and radius.

${inventory
  .map(
    (item) =>
      `- **${item.name}** (${item.count} sample${item.count === 1 ? '' : 's'}, kind ${item.kind}, nodes ${item.nodeIds.join(', ')}): use {typography.${firstType}}, {spacing.${firstSpacing}}, and measured styles ${inlineStyles(item.styles)}. Text evidence: ${item.textSamples.join(' / ') || 'visual or structural component with little text'}.`
  )
  .join('\n')}

${states.length ? `State evidence:\n${states.map((state) => `- ${state.state} (${state.confidence}): nodes ${state.nodeIds.join(', ')}, evidence ${state.evidence.join(' / ')}.`).join('\n')}` : 'No explicit loading, empty, disabled, error, or success states were measured. Do not invent those states.'}

${visualClusters.length ? `Visual clusters:\n${visualClusters.map(clusterLine).join('\n')}` : ''}

## Do's and Don'ts
Do use measured tokens. Do preserve visible hierarchy, section order, repeated card rhythm, and actual text density. Do keep component definitions tied to {colors.${backgroundColor}}, {typography.${firstType}}, {spacing.${firstSpacing}}, and {rounded.${firstRounded}} where appropriate.

Don't invent hidden states, unseen pages, extra brand colors, unmeasured shadows, or new radii. Don't replace a flat source layout with heavy cards. Don't simplify repeated components into a single generic block when the inventory shows distinct navigation, cards, forms, media, rankings, stats, or partner grids.

## Implementation Notes
For AI coding agents: treat YAML tokens as normative and prose as guidance. If a value is missing, infer from the closest measured token instead of introducing a new one.

Start implementation from the layoutRegions order, then map each componentInventory item to a reusable component only when it appears more than once or has a clear semantic role. Use node IDs to trace any disputed value back to evidence JSON. If the screenshot and DOM disagree, prefer computed token evidence for exact values and use the screenshot for visual hierarchy, density, and cropping.${multi ? ' Preserve desktop/mobile differences from responsive evidence instead of assuming one breakpoint fits all.' : ''}`;
}

function yamlMap(value: Record<string, unknown>, indent = 2): string {
  return Object.entries(value)
    .map(([key, item]) => {
      if (item && typeof item === 'object') return `${' '.repeat(indent)}${key}:\n${yamlMap(item as Record<string, unknown>, indent + 2)}`;
      return `${' '.repeat(indent)}${key}: ${JSON.stringify(item)}`;
    })
    .join('\n');
}

function safeName(input: string): string {
  return input.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'site';
}

function componentTokens(
  evidence: ExtractionEvidence,
  colors: Record<string, unknown>,
  roundedTokens: Record<string, unknown>,
  backgroundColor: string,
  textColor: string,
  typography: string,
  rounded: string,
  spacing: string
): Record<string, unknown> {
  const entries = evidence.componentInventory.slice(0, 10).map((item, index) => [
    safeName(`${item.name}-${index + 1}`),
    {
      backgroundColor: `{colors.${tokenForColor(colors, item.styles['background-color'] || item.styles['background-image']) ?? backgroundColor}}`,
      textColor: `{colors.${tokenForColor(colors, item.styles.color) ?? textColor}}`,
      typography: `{typography.${typography}}`,
      rounded: `{rounded.${tokenForValue(roundedTokens, item.styles['border-radius']) ?? rounded}}`,
      padding: `{spacing.${spacing}}`
    }
  ]);
  if (!entries.length) {
    entries.push([
      'button-primary',
      {
        backgroundColor: `{colors.${backgroundColor}}`,
        textColor: `{colors.${textColor}}`,
        typography: `{typography.${typography}}`,
        rounded: `{rounded.${rounded}}`,
        padding: `{spacing.${spacing}}`
      }
    ]);
  }
  return Object.fromEntries(entries);
}

function preferredToken(tokens: Record<string, unknown>, prefixes: string[], fallback: string): string {
  return Object.keys(tokens).find((key) => prefixes.some((prefix) => key.startsWith(prefix))) ?? fallback;
}

function tokenForColor(tokens: Record<string, unknown>, raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  return tokenForValue(tokens, normalizeColorValue(raw));
}

function tokenForValue(tokens: Record<string, unknown>, raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const normalized = normalizeColorValue(raw);
  return Object.entries(tokens).find(([, value]) => String(value).toLowerCase() === normalized)?.[0];
}

function normalizeColorValue(input: string): string {
  const value = input.trim().toLowerCase();
  const rgb = value.match(/^rgba?\(([^)]+)\)$/);
  if (!rgb) return value;
  const [r, g, b] = rgb[1].split(',').slice(0, 3).map((part) => Math.max(0, Math.min(255, Math.round(Number.parseFloat(part) || 0))));
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function toHex(value: number): string {
  return value.toString(16).padStart(2, '0');
}

function inlineStyles(styles: Record<string, string>): string {
  const text = Object.entries(styles)
    .slice(0, 8)
    .map(([key, value]) => `${key}: ${value}`)
    .join('; ');
  return text || 'no distinctive computed styles';
}

function clusterLine(cluster: VisualCluster): string {
  return `- ${cluster.viewport} y=${cluster.yRange.start}-${cluster.yRange.end}: ${cluster.componentKinds.join(', ') || 'visual band'}, colors ${cluster.dominantColors.join(', ') || 'unknown'}, density ${cluster.density}, confidence ${cluster.confidence}.`;
}
