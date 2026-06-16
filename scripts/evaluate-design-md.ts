import { readFile, writeFile } from 'node:fs/promises';
import { DesignEvidenceSchema, type DesignEvidence } from '../src/lib/extraction/types';
import { isMultiViewportEvidence, primaryExtractionEvidence } from '../src/lib/extraction/multi-viewport';
import { compareDesignMd } from './compare-design-md';

export type DesignMdEvaluationReport = {
  overallScore: number;
  baseScore: number;
  componentCoverageScore: number;
  layoutCoverageScore: number;
  stateCoverageScore: number;
  responsiveCoverageScore: number;
  visualClusterCoverageScore: number;
  issues: string[];
  recommendations: string[];
};

if (process.argv[1]?.endsWith('evaluate-design-md.ts')) {
  const designPath = argValue('--design');
  const evidencePath = argValue('--evidence');
  if (!designPath || !evidencePath) {
    console.error('Usage: tsx scripts/evaluate-design-md.ts --design <DESIGN.md> --evidence <evidence.json> [--out <report.json>]');
    process.exit(1);
  }
  const markdown = await readFile(designPath, 'utf8');
  const evidence = DesignEvidenceSchema.parse(JSON.parse(await readFile(evidencePath, 'utf8')));
  const report = evaluateDesignMd(markdown, evidence);
  const out = argValue('--out');
  if (out) await writeFile(out, JSON.stringify(report, null, 2));
  else console.log(JSON.stringify(report, null, 2));
}

export function evaluateDesignMd(markdown: string, evidence: DesignEvidence): DesignMdEvaluationReport {
  const base = compareDesignMd(markdown);
  const issues = [...base.issues];
  const recommendations = [...base.recommendations];
  const componentCoverageScore = coverageScore(markdown, componentTerms(evidence), 'components', issues, recommendations);
  const layoutCoverageScore = coverageScore(markdown, layoutTerms(evidence), 'layout regions', issues, recommendations);
  const stateCoverageScore = stateScore(markdown, evidence, issues, recommendations);
  const responsiveCoverageScore = responsiveScore(markdown, evidence, issues, recommendations);
  const visualClusterCoverageScore = visualClusterScore(markdown, evidence, issues, recommendations);
  const overallScore = Math.round(
    base.overallScore * 0.35 +
      componentCoverageScore * 0.2 +
      layoutCoverageScore * 0.15 +
      stateCoverageScore * 0.1 +
      responsiveCoverageScore * 0.1 +
      visualClusterCoverageScore * 0.1
  );
  return {
    overallScore,
    baseScore: base.overallScore,
    componentCoverageScore,
    layoutCoverageScore,
    stateCoverageScore,
    responsiveCoverageScore,
    visualClusterCoverageScore,
    issues,
    recommendations
  };
}

function componentTerms(evidence: DesignEvidence): string[] {
  const items = isMultiViewportEvidence(evidence) ? evidence.mergedComponentInventory : evidence.componentInventory;
  return Array.from(new Set(items.slice(0, 18).flatMap((item) => [item.name, item.kind]))).filter(Boolean);
}

function layoutTerms(evidence: DesignEvidence): string[] {
  const primary = primaryExtractionEvidence(evidence);
  const terms = primary.layoutRegions.flatMap((region) => [region.kind, region.label?.split(/\s+/).slice(0, 3).join(' ') ?? '']);
  return Array.from(new Set(terms.concat(['header', 'hero', 'footer']).filter((term) => term.length > 2))).slice(0, 18);
}

function visualTerms(evidence: DesignEvidence): string[] {
  if (!isMultiViewportEvidence(evidence)) return ['visual', 'screenshot'];
  return Array.from(
    new Set(
      evidence.viewports.flatMap((viewport) =>
        viewport.visualClusters.flatMap((cluster) => [viewport.label, ...cluster.componentKinds, ...cluster.dominantColors.slice(0, 2)])
      )
    )
  )
    .filter(Boolean)
    .slice(0, 24);
}

function visualClusterScore(markdown: string, evidence: DesignEvidence, issues: string[], recommendations: string[]): number {
  if (!isMultiViewportEvidence(evidence)) {
    issues.push('Missing visual cluster evidence');
    recommendations.push('Capture desktop and mobile evidence for visual cluster evaluation');
    return 50;
  }
  const clusters = evidence.viewports.flatMap((viewport) => viewport.visualClusters);
  if (!clusters.length) {
    issues.push('Missing visual clusters');
    recommendations.push('Attach screenshot segment clusters to DESIGN.md evidence');
    return 50;
  }
  const coverage = coverageScore(markdown, visualTerms(evidence), 'visual clusters', issues, recommendations);
  const detailed = clusters.filter(
    (cluster) =>
      cluster.dominantColors.length > 0 ||
      cluster.brightness > 0 ||
      cluster.contrast > 0 ||
      cluster.density > 0
  ).length;
  const detailScore = Math.round((detailed / clusters.length) * 100);
  const score = Math.round(coverage * 0.6 + detailScore * 0.4);
  if (detailScore < 70) {
    issues.push('Low visual cluster evidence detail');
    recommendations.push('Include dominant colors, brightness, contrast, or density for screenshot clusters');
  }
  return score;
}

function stateScore(markdown: string, evidence: DesignEvidence, issues: string[], recommendations: string[]): number {
  const states = isMultiViewportEvidence(evidence)
    ? evidence.viewports.flatMap((viewport) => viewport.evidence.stateHints.map((hint) => hint.state))
    : evidence.stateHints.map((hint) => hint.state);
  const unique = Array.from(new Set(states));
  if (!unique.length) return 100;
  return coverageScore(markdown, unique, 'states', issues, recommendations);
}

function responsiveScore(markdown: string, evidence: DesignEvidence, issues: string[], recommendations: string[]): number {
  if (!isMultiViewportEvidence(evidence) || evidence.viewports.length < 2) {
    issues.push('Missing multi-viewport evidence');
    recommendations.push('Capture desktop and mobile evidence for responsive evaluation');
    return 50;
  }
  return coverageScore(markdown, ['desktop', 'mobile', 'responsive', 'viewport'], 'responsive behavior', issues, recommendations);
}

function coverageScore(markdown: string, terms: string[], label: string, issues: string[], recommendations: string[]): number {
  const unique = Array.from(new Set(terms.map((term) => term.toLowerCase()).filter((term) => term.length > 1))).slice(0, 24);
  if (!unique.length) return 100;
  const text = markdown.toLowerCase();
  const hit = unique.filter((term) => text.includes(term)).length;
  const score = Math.round((hit / unique.length) * 100);
  if (score < 70) {
    issues.push(`Low ${label} coverage`);
    recommendations.push(`Mention more evidence-backed ${label} in DESIGN.md`);
  }
  return score;
}

function argValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}
