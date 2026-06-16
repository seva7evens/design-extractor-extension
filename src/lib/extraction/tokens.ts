import { colorDistance, normalizeColor } from './colors';

export function dedupeColors(values: string[], tolerance = 8): string[] {
  const output: string[] = [];
  for (const value of values.map(normalizeColor).filter(Boolean) as string[]) {
    if (!output.some((existing) => colorDistance(existing, value) <= tolerance)) output.push(value);
  }
  return output;
}

export type TypographySample = {
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
  letterSpacing: string;
};

export function groupTypography(samples: TypographySample[]): Array<TypographySample & { count: number }> {
  const map = new Map<string, TypographySample & { count: number }>();
  for (const sample of samples) {
    const key = `${sample.fontFamily}|${sample.fontSize}|${sample.fontWeight}|${sample.lineHeight}|${sample.letterSpacing}`;
    const current = map.get(key) ?? { ...sample, count: 0 };
    current.count += 1;
    map.set(key, current);
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

export function extractLengthScale(values: string[]): string[] {
  const counts = new Map<string, number>();
  for (const value of values) {
    for (const match of value.matchAll(/(?:^|\s)(\d+(?:\.\d+)?px|0)(?:\s|$)/g)) {
      const length = match[1] === '0' ? '0px' : match[1];
      counts.set(length, (counts.get(length) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .filter(([value]) => Number.parseFloat(value) <= 240)
    .sort((a, b) => b[1] - a[1] || Number.parseFloat(a[0]) - Number.parseFloat(b[0]))
    .map(([value]) => value);
}

export function classifyRadius(value: string): string {
  const px = Number.parseFloat(value);
  if (px === 0) return 'none';
  if (px <= 4) return 'xs';
  if (px <= 8) return 'sm';
  if (px <= 16) return 'md';
  if (px <= 28) return 'lg';
  if (px >= 999) return 'pill';
  return 'xl';
}

export function isVisibleBox(input: { display: string; visibility: string; opacity: string; width: number; height: number }): boolean {
  return input.display !== 'none' && input.visibility !== 'hidden' && Number.parseFloat(input.opacity || '1') > 0.02 && input.width >= 2 && input.height >= 2;
}
