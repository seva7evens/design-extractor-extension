import YAML from 'yaml';

const REQUIRED_SECTIONS = [
  'Overview',
  'Colors',
  'Typography',
  'Layout',
  'Elevation & Depth',
  'Shapes',
  'Components',
  "Do's and Don'ts",
  'Implementation Notes'
];

export type DesignMdValidation = {
  ok: boolean;
  frontmatter?: Record<string, unknown>;
  issues: string[];
};

export function stripCodeFences(markdown: string): string {
  const trimmed = markdown.trim();
  const fence = trimmed.match(/^```(?:markdown|md)?\s*([\s\S]*?)```$/i);
  return fence ? fence[1].trim() : trimmed;
}

export function validateDesignMd(markdown: string): DesignMdValidation {
  const content = stripCodeFences(markdown);
  const issues: string[] = [];
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!frontmatterMatch) {
    return { ok: false, issues: ['Missing YAML front matter'] };
  }

  let frontmatter: Record<string, unknown> = {};
  try {
    frontmatter = YAML.parse(frontmatterMatch[1]) ?? {};
  } catch (error) {
    issues.push(`Invalid YAML: ${error instanceof Error ? error.message : String(error)}`);
  }

  for (const key of ['version', 'name', 'colors', 'typography', 'rounded', 'spacing', 'components']) {
    if (!(key in frontmatter)) issues.push(`Missing front matter key: ${key}`);
  }

  const headings = Array.from(content.matchAll(/^##\s+(.+)$/gm)).map((match) => match[1].trim());
  let lastIndex = -1;
  for (const section of REQUIRED_SECTIONS) {
    const index = headings.indexOf(section);
    if (index === -1) {
      issues.push(`Missing section: ${section}`);
    } else if (index < lastIndex) {
      issues.push(`Section out of order: ${section}`);
    }
    lastIndex = Math.max(lastIndex, index);
  }

  for (const reference of content.matchAll(/\{([a-zA-Z0-9_.-]+)\}/g)) {
    if (!resolvesReference(frontmatter, reference[1])) issues.push(`Broken token reference: {${reference[1]}}`);
  }

  return { ok: issues.length === 0, frontmatter, issues };
}

function resolvesReference(root: Record<string, unknown>, path: string): boolean {
  let current: unknown = root;
  for (const part of path.split('.')) {
    if (!current || typeof current !== 'object' || !(part in current)) return false;
    current = (current as Record<string, unknown>)[part];
  }
  return true;
}
