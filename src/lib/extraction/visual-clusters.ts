import type { ExtractionEvidence, ScreenshotSegmentAnalysis, ScreenshotSegmentEvidence, VisualCluster } from './types';

export function buildVisualClusters(args: {
  viewport: 'desktop' | 'mobile';
  evidence: ExtractionEvidence;
  segments: ScreenshotSegmentEvidence[];
  analyses?: ScreenshotSegmentAnalysis[];
}): VisualCluster[] {
  const analyses = args.analyses ?? [];
  return args.segments.slice(0, 24).map((segment, index) => {
    const analysis = analyses.find((item) => Math.abs(item.y - segment.y) < 2);
    const start = segment.y;
    const end = segment.y + segment.height;
    const nodes = args.evidence.nodes
      .filter((node) => node.rect.documentY < end && node.rect.documentY + node.rect.height > start)
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 18);
    const componentKinds = Array.from(new Set(nodes.map((node) => node.kind).filter(Boolean))).slice(0, 8);
    return {
      viewport: args.viewport,
      yRange: { start, end },
      dominantColors: analysis?.dominantColors ?? [],
      brightness: round(analysis?.brightness ?? 0),
      contrast: round(analysis?.contrast ?? 0),
      density: round(analysis?.density ?? 0),
      nodeIds: nodes.map((node) => node.id),
      componentKinds,
      confidence: componentKinds.length || analysis ? (analysis ? 'high' : 'medium') : index === 0 ? 'medium' : 'low'
    };
  });
}

export function stripSegmentDataUrls(segments: ScreenshotSegmentEvidence[]): ScreenshotSegmentEvidence[] {
  return segments.map(({ dataUrl: _dataUrl, ...segment }) => segment);
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
