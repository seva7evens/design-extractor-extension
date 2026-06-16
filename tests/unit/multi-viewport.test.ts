import { localDesignMdFromEvidence } from '../../src/lib/design-md/local-generate';
import { buildMultiViewportEvidence } from '../../src/lib/extraction/multi-viewport';
import { ExtractionEvidenceSchema, MultiViewportEvidenceSchema, type ExtractionEvidence, type ViewportEvidence } from '../../src/lib/extraction/types';
import { buildVisualClusters } from '../../src/lib/extraction/visual-clusters';
import { evaluateDesignMd } from '../../scripts/evaluate-design-md';

it('parses and merges desktop and mobile viewport evidence', () => {
  const desktop = viewport('desktop', evidence('desktop.test', 1440, 1200, ['card', 'hero']));
  const mobile = viewport('mobile', evidence('desktop.test', 390, 844, ['card', 'button']));
  const multi = buildMultiViewportEvidence([desktop, mobile]);
  expect(MultiViewportEvidenceSchema.parse(multi).viewports).toHaveLength(2);
  expect(multi.mergedComponentInventory.some((item) => item.name === 'button')).toBe(true);
  expect(multi.responsiveFindings.join(' ')).toContain('Desktop viewport');
});

it('builds visual clusters from segment ranges and evidence nodes', () => {
  const base = evidence('cluster.test', 1440, 900, ['hero', 'card']);
  const clusters = buildVisualClusters({
    viewport: 'desktop',
    evidence: base,
    segments: [{ y: 0, width: 1440, height: 900, devicePixelRatio: 1 }],
    analyses: [{ y: 0, width: 1440, height: 900, dominantColors: ['#000000'], brightness: 0.2, contrast: 0.7, density: 0.5 }]
  });
  expect(clusters[0].componentKinds).toContain('hero');
  expect(clusters[0].dominantColors).toEqual(['#000000']);
});

it('scores responsive and component coverage in generated DESIGN.md', () => {
  const multi = buildMultiViewportEvidence([
    viewport('desktop', evidence('eval.test', 1440, 1200, ['hero', 'card'])),
    viewport('mobile', evidence('eval.test', 390, 844, ['hero', 'button']))
  ]);
  const markdown = localDesignMdFromEvidence(multi);
  const report = evaluateDesignMd(markdown, multi);
  expect(report.componentCoverageScore).toBeGreaterThan(60);
  expect(report.responsiveCoverageScore).toBeGreaterThan(60);
});

function viewport(label: 'desktop' | 'mobile', item: ExtractionEvidence): ViewportEvidence {
  const segment = { y: 0, width: item.metadata.viewportWidth, height: item.metadata.documentHeight, devicePixelRatio: 1 };
  return {
    label,
    viewport: { width: item.metadata.viewportWidth, height: item.metadata.viewportHeight, devicePixelRatio: 1 },
    evidence: item,
    screenshotSegments: [segment],
    visualClusters: buildVisualClusters({ viewport: label, evidence: item, segments: [segment] })
  };
}

function evidence(hostname: string, width: number, height: number, kinds: string[]): ExtractionEvidence {
  return ExtractionEvidenceSchema.parse({
    metadata: {
      url: `https://${hostname}/`,
      origin: `https://${hostname}`,
      hostname,
      title: hostname,
      viewportWidth: width,
      viewportHeight: height,
      documentWidth: width,
      documentHeight: height * 2,
      devicePixelRatio: 1,
      frameworkHints: []
    },
    nodes: kinds.map((kind, index) => ({
      id: `n${index + 1}`,
      tag: kind === 'button' ? 'button' : 'section',
      text: `${kind} sample`,
      selector: kind,
      rect: { x: 0, y: index * 120, width: 300, height: 100, documentX: 0, documentY: index * 120 },
      visibility: 'visible',
      zIndex: 'auto',
      childIds: [],
      depth: 1,
      kind,
      importance: 50,
      styles: { color: 'rgb(0, 0, 0)', 'background-color': 'rgb(255, 255, 255)', 'font-size': '16px' }
    })),
    tokens: {
      colors: [
        { value: '#ffffff', role: 'canvas', usageCount: 2, area: 10000, nodeIds: ['n1'] },
        { value: '#000000', role: 'body', usageCount: 2, area: 1000, nodeIds: ['n1'] }
      ],
      typography: [
        { role: 'body', fontFamily: 'Inter', fontSize: '16px', fontWeight: '400', lineHeight: '24px', letterSpacing: '0px', count: 2, nodeIds: ['n1'] }
      ],
      spacing: [{ role: 'md', value: '16px', count: 2 }],
      radius: [{ role: 'sm', value: '8px', count: 2 }],
      shadows: [],
      surfaces: [],
      cssVariables: {}
    },
    componentInventory: kinds.map((kind, index) => ({
      name: kind,
      kind,
      count: 1,
      nodeIds: [`n${index + 1}`],
      textSamples: [`${kind} sample`],
      rectSamples: [{ x: 0, y: index * 120, width: 300, height: 100, documentX: 0, documentY: index * 120 }],
      styles: { color: 'rgb(0, 0, 0)', 'background-color': 'rgb(255, 255, 255)' }
    })),
    layoutRegions: [
      { id: 'n1', kind: kinds[0] ?? 'section', selector: 'section', rect: { x: 0, y: 0, width: 300, height: 100, documentX: 0, documentY: 0 }, childKinds: [] }
    ],
    stateHints: [],
    warnings: [],
    capturedAt: new Date().toISOString()
  });
}
