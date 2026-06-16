import { readFile } from 'node:fs/promises';
import { validateDesignMd } from '../src/lib/design-md/validate';

export type ComparisonReport = {
  overallScore: number;
  tokenScore: number;
  structureScore: number;
  narrativeScore: number;
  evidenceAlignmentScore: number;
  issues: string[];
  recommendations: string[];
};

if (process.argv.includes('--lint')) {
  const file = process.argv.at(-1);
  if (!file || file === '--lint') {
    console.error('Usage: pnpm designmd:lint -- <file>');
    process.exit(1);
  }
  const validation = validateDesignMd(await readFile(file, 'utf8'));
  for (const issue of validation.issues) console.error(issue);
  process.exit(validation.ok ? 0 : 1);
}

export function compareDesignMd(generated: string, reference?: string): ComparisonReport {
  const validation = validateDesignMd(generated);
  const issues = [...validation.issues];
  const recommendations: string[] = [];
  const structureScore = Math.max(0, 100 - validation.issues.length * 12);
  const narrativeScore = scoreNarrative(generated, issues, recommendations);
  const tokenScore = scoreTokens(generated, reference, issues, recommendations);
  const evidenceAlignmentScore = scoreEvidenceAlignment(generated, issues, recommendations);
  const overallScore = Math.round(structureScore * 0.25 + tokenScore * 0.3 + narrativeScore * 0.25 + evidenceAlignmentScore * 0.2);
  return { overallScore, tokenScore, structureScore, narrativeScore, evidenceAlignmentScore, issues, recommendations };
}

function scoreNarrative(markdown: string, issues: string[], recommendations: string[]): number {
  const words = markdown.split(/\s+/).length;
  let score = 100;
  if (words < 600) {
    score -= 25;
    issues.push('Narrative is short');
    recommendations.push('Add evidence-backed rationale for colors, typography, layout, and components');
  }
  if (/modern clean design/i.test(markdown)) {
    score -= 20;
    issues.push('Contains generic phrasing');
  }
  if (!/Do's and Don'ts/.test(markdown)) score -= 20;
  return Math.max(0, score);
}

function scoreTokens(generated: string, reference: string | undefined, issues: string[], recommendations: string[]): number {
  const generatedColors = colors(generated);
  if (generatedColors.length < 3) {
    issues.push('Too few generated colors');
    recommendations.push('Improve color extraction or synthesis');
    return 45;
  }
  if (!reference) return Math.min(100, 60 + generatedColors.length * 3);
  const referenceColors = colors(reference);
  const exact = generatedColors.filter((color) => referenceColors.includes(color)).length;
  const near = generatedColors.filter((color) => referenceColors.some((candidate) => colorDistance(color, candidate) <= 18)).length;
  return Math.min(100, Math.round((exact * 12 + near * 8 + Math.min(generatedColors.length, 12) * 3) / Math.max(1, referenceColors.length) * 10));
}

function scoreEvidenceAlignment(markdown: string, issues: string[], recommendations: string[]): number {
  const tokenReferences = markdown.match(/\{[a-zA-Z0-9_.-]+\}/g)?.length ?? 0;
  if (tokenReferences < 4) {
    issues.push('Few token references in prose/components');
    recommendations.push('Reference YAML tokens from component and guidance prose');
    return 70;
  }
  return 90;
}

function colors(markdown: string): string[] {
  return Array.from(new Set(markdown.match(/#[0-9a-f]{6}\b/gi)?.map((item) => item.toLowerCase()) ?? []));
}

function colorDistance(a: string, b: string): number {
  const ar = parseInt(a.slice(1, 3), 16);
  const ag = parseInt(a.slice(3, 5), 16);
  const ab = parseInt(a.slice(5, 7), 16);
  const br = parseInt(b.slice(1, 3), 16);
  const bg = parseInt(b.slice(3, 5), 16);
  const bb = parseInt(b.slice(5, 7), 16);
  return Math.sqrt((ar - br) ** 2 + (ag - bg) ** 2 + (ab - bb) ** 2);
}
