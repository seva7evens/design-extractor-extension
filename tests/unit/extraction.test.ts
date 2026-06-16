import { normalizeColor } from '../../src/lib/extraction/colors';
import { scoreElement } from '../../src/lib/extraction/importance';
import { classifyRadius, dedupeColors, extractLengthScale, groupTypography, isVisibleBox } from '../../src/lib/extraction/tokens';

it('normalizes rgb and hex colors', () => {
  expect(normalizeColor('rgb(255, 0, 16)')).toBe('#ff0010');
  expect(normalizeColor('#abc')).toBe('#aabbcc');
  expect(normalizeColor('rgba(0,0,0,0)')).toBeUndefined();
});

it('deduplicates near-identical colors', () => {
  expect(dedupeColors(['#ffffff', 'rgb(254, 254, 254)', '#111111'])).toEqual(['#ffffff', '#111111']);
});

it('groups typography samples', () => {
  const groups = groupTypography([
    { fontFamily: 'Inter', fontSize: '16px', fontWeight: '400', lineHeight: '24px', letterSpacing: '0px' },
    { fontFamily: 'Inter', fontSize: '16px', fontWeight: '400', lineHeight: '24px', letterSpacing: '0px' },
    { fontFamily: 'Inter', fontSize: '32px', fontWeight: '700', lineHeight: '38px', letterSpacing: '0px' }
  ]);
  expect(groups[0].count).toBe(2);
});

it('extracts spacing scale and classifies radius', () => {
  expect(extractLengthScale(['0px 8px 16px', '16px 24px'])).toContain('16px');
  expect(classifyRadius('9999px')).toBe('pill');
});

it('filters invisible boxes', () => {
  expect(isVisibleBox({ display: 'block', visibility: 'visible', opacity: '1', width: 20, height: 20 })).toBe(true);
  expect(isVisibleBox({ display: 'none', visibility: 'visible', opacity: '1', width: 20, height: 20 })).toBe(false);
});

it('scores important interactive headings above plain boxes', () => {
  const heading = scoreElement({ tag: 'h1', textLength: 24, area: 50000, y: 100, interactive: false, headingLevel: 1, hasImage: false, uniqueStyleCount: 1 });
  const box = scoreElement({ tag: 'div', textLength: 0, area: 100, y: 4000, interactive: false, hasImage: false, uniqueStyleCount: 0 });
  expect(heading).toBeGreaterThan(box);
});
