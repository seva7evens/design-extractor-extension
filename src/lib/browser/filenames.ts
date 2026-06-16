export function domainSlug(input: string): string {
  const hostname = toHostname(input);
  return hostname
    .toLowerCase()
    .replace(/^www\./, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function artifactFilenames(input: string) {
  const slug = domainSlug(input) || 'site';
  return {
    slug,
    design: `${slug}-DESIGN.md`,
    screenshot: `${slug}-fullpage.png`,
    evidence: `${slug}-evidence.json`,
    visualReport: `${slug}-visual-report.json`
  };
}

function toHostname(input: string): string {
  try {
    return new URL(input).hostname;
  } catch {
    return input.replace(/^https?:\/\//, '').split('/')[0] || input;
  }
}
