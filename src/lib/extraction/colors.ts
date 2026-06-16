export function normalizeColor(input: string | undefined): string | undefined {
  if (!input) return undefined;
  const value = input.trim().toLowerCase();
  if (!value || value === 'transparent' || value === 'rgba(0, 0, 0, 0)' || value === 'rgba(0,0,0,0)') {
    return undefined;
  }
  if (/^#[0-9a-f]{3}$/.test(value)) {
    return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`;
  }
  if (/^#[0-9a-f]{6}$/.test(value)) return value;

  const rgb = value.match(/^rgba?\(([^)]+)\)$/);
  if (!rgb) return value.includes('gradient(') ? value : undefined;
  const parts = rgb[1].split(',').map((part) => part.trim());
  const [r, g, b] = parts.slice(0, 3).map((part) => clamp255(Number.parseFloat(part)));
  const alpha = parts[3] === undefined ? 1 : Number.parseFloat(parts[3]);
  if (alpha <= 0.02) return undefined;
  const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  return alpha >= 0.98 ? hex : `rgba(${r}, ${g}, ${b}, ${round(alpha)})`;
}

export function colorDistance(a: string, b: string): number {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  if (!ca || !cb) return Number.POSITIVE_INFINITY;
  return Math.sqrt((ca.r - cb.r) ** 2 + (ca.g - cb.g) ** 2 + (ca.b - cb.b) ** 2);
}

export function luminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const channels = [rgb.r, rgb.g, rgb.b].map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

export function classifyColor(hex: string, usageCount: number, area: number): string {
  if (!hex.startsWith('#')) return hex.includes('gradient') ? 'gradient' : 'effect';
  const l = luminance(hex);
  if (l > 0.93 && area > 20000) return 'canvas';
  if (l > 0.82) return area > 8000 ? 'surface' : 'surface-muted';
  if (l < 0.08) return area > 8000 ? 'ink' : 'body';
  if (usageCount > 8 && area < 20000) return 'primary';
  if (l < 0.35) return 'muted';
  return usageCount > 3 ? 'accent' : 'border';
}

function clamp255(value: number): number {
  return Math.max(0, Math.min(255, Math.round(Number.isFinite(value) ? value : 0)));
}

function toHex(value: number): string {
  return value.toString(16).padStart(2, '0');
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | undefined {
  const match = hex.match(/^#([0-9a-f]{6})$/i);
  if (!match) return undefined;
  const raw = match[1];
  return {
    r: Number.parseInt(raw.slice(0, 2), 16),
    g: Number.parseInt(raw.slice(2, 4), 16),
    b: Number.parseInt(raw.slice(4, 6), 16)
  };
}
