import type {
  ComponentInventoryItem,
  DesignEvidence,
  DesignTokens,
  ExtractionEvidence,
  MultiViewportEvidence,
  ViewportEvidence
} from './types';

export function isMultiViewportEvidence(evidence: DesignEvidence): evidence is MultiViewportEvidence {
  return 'viewports' in evidence && Array.isArray(evidence.viewports);
}

export function primaryExtractionEvidence(evidence: DesignEvidence): ExtractionEvidence {
  if (!isMultiViewportEvidence(evidence)) return evidence;
  return evidence.viewports.find((item) => item.label === evidence.primary)?.evidence ?? evidence.viewports[0].evidence;
}

export function buildMultiViewportEvidence(viewports: ViewportEvidence[], primary: 'desktop' | 'mobile' = 'desktop'): MultiViewportEvidence {
  const safeViewports = viewports.length ? viewports : [];
  if (!safeViewports.length) throw new Error('At least one viewport evidence item is required');
  return {
    primary,
    viewports: safeViewports,
    mergedTokens: mergeTokens(safeViewports.map((item) => item.evidence.tokens)),
    mergedComponentInventory: mergeComponentInventory(safeViewports),
    responsiveFindings: responsiveFindings(safeViewports),
    warnings: safeViewports.flatMap((item) => item.evidence.warnings)
  };
}

export function mergeTokens(tokens: DesignTokens[]): DesignTokens {
  const first = tokens[0];
  const cssVariables = Object.assign({}, ...tokens.map((item) => item.cssVariables));
  return {
    colors: mergeByValue(tokens.flatMap((item) => item.colors), 'value').slice(0, 40),
    typography: mergeByValue(tokens.flatMap((item) => item.typography), (item) =>
      [item.fontFamily, item.fontSize, item.fontWeight, item.lineHeight, item.letterSpacing].join('|')
    ).slice(0, 28),
    spacing: mergeByValue(tokens.flatMap((item) => item.spacing), 'value').slice(0, 12),
    radius: mergeByValue(tokens.flatMap((item) => item.radius), 'value').slice(0, 12),
    shadows: mergeByValue(tokens.flatMap((item) => item.shadows), 'value').slice(0, 16),
    surfaces: mergeByValue(tokens.flatMap((item) => item.surfaces), 'value').slice(0, 16),
    cssVariables: Object.keys(cssVariables).length ? cssVariables : first.cssVariables
  };
}

export function mergeComponentInventory(viewports: ViewportEvidence[]): ComponentInventoryItem[] {
  const map = new Map<string, ComponentInventoryItem>();
  for (const viewport of viewports) {
    for (const item of viewport.evidence.componentInventory) {
      const key = `${item.name}|${item.kind}`;
      const current = map.get(key) ?? { ...item, count: 0, nodeIds: [], textSamples: [], rectSamples: [], styles: item.styles };
      current.count += item.count;
      current.nodeIds.push(...item.nodeIds.map((id) => `${viewport.label}:${id}`));
      current.textSamples = Array.from(new Set([...current.textSamples, ...item.textSamples])).slice(0, 6);
      current.rectSamples = [...current.rectSamples, ...item.rectSamples].slice(0, 6);
      map.set(key, current);
    }
  }
  return Array.from(map.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 48);
}

function responsiveFindings(viewports: ViewportEvidence[]): string[] {
  if (viewports.length < 2) return [];
  const desktop = viewports.find((item) => item.label === 'desktop') ?? viewports[0];
  const mobile = viewports.find((item) => item.label === 'mobile') ?? viewports[1];
  const desktopNames = new Set(desktop.evidence.componentInventory.map((item) => item.name));
  const mobileNames = new Set(mobile.evidence.componentInventory.map((item) => item.name));
  const mobileOnly = [...mobileNames].filter((name) => !desktopNames.has(name)).slice(0, 8);
  const desktopOnly = [...desktopNames].filter((name) => !mobileNames.has(name)).slice(0, 8);
  return [
    `Desktop viewport ${desktop.viewport.width}x${desktop.viewport.height}; mobile viewport ${mobile.viewport.width}x${mobile.viewport.height}.`,
    `Desktop has ${desktop.evidence.componentInventory.length} component groups; mobile has ${mobile.evidence.componentInventory.length}.`,
    `Desktop document height ${desktop.evidence.metadata.documentHeight}px; mobile document height ${mobile.evidence.metadata.documentHeight}px.`,
    mobileOnly.length ? `Mobile-only component groups: ${mobileOnly.join(', ')}.` : '',
    desktopOnly.length ? `Desktop-only component groups: ${desktopOnly.join(', ')}.` : ''
  ].filter(Boolean);
}

function mergeByValue<T extends Record<string, any>>(items: T[], key: keyof T | ((item: T) => string)): T[] {
  const map = new Map<string, T>();
  for (const item of items) {
    const value = typeof key === 'function' ? key(item) : String(item[key]);
    const current = map.get(value);
    if (!current) {
      map.set(value, { ...item, nodeIds: [...(item.nodeIds ?? [])] });
      continue;
    }
    const target = current as Record<string, any>;
    if ('usageCount' in target) target.usageCount = (target.usageCount ?? 0) + (item.usageCount ?? 0);
    if ('count' in target) target.count = (target.count ?? 0) + (item.count ?? 0);
    if ('area' in target) target.area = (target.area ?? 0) + (item.area ?? 0);
    if ('nodeIds' in target) target.nodeIds = Array.from(new Set([...(target.nodeIds ?? []), ...(item.nodeIds ?? [])])).slice(0, 16);
  }
  return Array.from(map.values()).sort((a, b) => (b.area ?? b.usageCount ?? b.count ?? 0) - (a.area ?? a.usageCount ?? a.count ?? 0));
}
