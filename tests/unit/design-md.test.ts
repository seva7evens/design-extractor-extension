import { artifactFilenames, domainSlug } from '../../src/lib/browser/filenames';
import { validateDesignMd } from '../../src/lib/design-md/validate';

it('generates safe filenames', () => {
  expect(domainSlug('https://www.Apple.com/store')).toBe('apple-com');
  expect(artifactFilenames('https://bmw-m.com').design).toBe('bmw-m-com-DESIGN.md');
});

it('validates token references and section order', () => {
  const markdown = `---
version: alpha
name: Test
colors:
  primary: "#000000"
typography:
  body:
    fontFamily: system-ui
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
rounded:
  sm: 4px
spacing:
  md: 16px
components:
  button:
    backgroundColor: "{colors.primary}"
---
## Overview
Text
## Colors
Text
## Typography
Text
## Layout
Text
## Elevation & Depth
Text
## Shapes
Text
## Components
Text
## Do's and Don'ts
Text
## Implementation Notes
Text`;
  expect(validateDesignMd(markdown).ok).toBe(true);
});
