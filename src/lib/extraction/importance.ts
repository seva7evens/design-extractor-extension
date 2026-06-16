export function scoreElement(input: {
  tag: string;
  role?: string;
  textLength: number;
  area: number;
  y: number;
  interactive: boolean;
  headingLevel?: number;
  hasImage: boolean;
  uniqueStyleCount: number;
}): number {
  let score = Math.min(40, Math.log10(Math.max(1, input.area)) * 10);
  if (input.y < 1200) score += 8;
  if (input.interactive) score += 14;
  if (input.hasImage) score += 10;
  if (input.textLength > 0) score += Math.min(12, input.textLength / 18);
  if (input.headingLevel) score += 18 - input.headingLevel * 2;
  if (['header', 'nav', 'main', 'section', 'footer', 'article', 'form'].includes(input.tag)) score += 12;
  if (['button', 'link', 'textbox'].includes(input.role ?? '')) score += 10;
  score += Math.min(8, input.uniqueStyleCount);
  return Math.round(score * 10) / 10;
}
