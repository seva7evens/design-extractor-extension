# Design Extractor Extension

Design Extractor is a Chromium extension that turns the currently open website into an evidence-backed `DESIGN.md`: tokens, layout notes, component inventory, responsive evidence, screenshots, and implementation guidance for AI coding agents.

The project has no backend. It runs locally in the browser, uses the user's own Gemini API key, and keeps the extension permission model Web Store-safe.

## Quick Start

### 1. Get the Repository

Clone the repository, which is the recommended way to keep the prebuilt extension and source in sync:

```bash
git clone https://github.com/seva7evens/design-extractor-extension.git
cd design-extractor-extension
```

Alternatively, download the repository as a ZIP from GitHub and unzip it locally.

### 2. Load the Prebuilt Extension in Chrome

1. Open `chrome://extensions/`.
2. Turn on `Developer mode`.
3. Click `Load unpacked`.
4. Select this folder from the repository:

```text
extension-build/chrome-mv3
```

Do not select the repository root and do not select the ZIP file. Chrome needs the unpacked extension folder that contains `manifest.json`.

## Basic Usage

1. Open any normal `http` or `https` website.
2. Click the Design MD extension icon.
3. Paste your Gemini API key.
4. Click `Validate key`.
5. Click `Generate DESIGN.md`.
6. Download or copy the generated artifacts.

The extension can generate:

- `<domain>-DESIGN.md`
- `<domain>-fullpage.png`
- optional `<domain>-evidence.json`
- optional `<domain>-visual-report.json`

The default Gemini model is `gemini-3.1-flash-lite` for both vision and text steps, because it is the stable, efficient default for this workflow. You can still choose another available `generateContent` model after key validation.

## What the Project Does

Design MD extracts a page as design evidence, not as a marketing summary. The output is meant to help another agent or engineer rebuild the visible interface with higher fidelity.

It captures:

- visible DOM structure and semantic hints
- bounding boxes, document positions, z-index, and layout regions
- computed styles for visible nodes
- CSS variables when enabled
- color, typography, spacing, radius, shadow, and surface tokens
- component inventory with text samples, styles, and node references
- state hints such as loading, disabled, empty, error, success, and skeleton when visible
- desktop and mobile viewport evidence
- full-page screenshots and screenshot segment metadata
- visual clusters that connect screenshot bands back to DOM/component evidence

It then turns that evidence into a `DESIGN.md` with:

- YAML design tokens
- layout and component notes
- responsive observations
- state evidence
- visual checklist items
- implementation constraints for AI coding agents

## DESIGN.md Generation Methodology

### 1. User-Gesture Page Access

The extension uses Chrome's `activeTab` model. It only injects extraction code after the user opens the popup and starts generation on the current tab.

This avoids broad host permissions such as `<all_urls>` and keeps the extension aligned with Chrome Web Store expectations.

### 2. Desktop Evidence Pass

The first pass captures the current page exactly as the user is viewing it:

- viewport width, height, document size, device pixel ratio
- visible nodes and layout regions
- computed styles
- design tokens
- component inventory
- state hints
- screenshot or full-page stitched screenshot

This desktop pass is the primary evidence source for the generated screenshot artifact.

### 3. Mobile Evidence Pass

For full-page generation, mobile evidence is enabled by default.

The background worker temporarily resizes the current Chrome window to `390x844`, waits for layout to settle, extracts the same evidence again, captures the mobile screenshot, and then restores the original window bounds.

If resize or restore fails, generation does not fail. The extension falls back to desktop-only evidence and records a warning.

### 4. Multi-Viewport Merge

Desktop and mobile passes are merged into a single aggregate evidence object:

- `viewports`: desktop and mobile evidence entries
- `mergedTokens`: combined color, type, spacing, radius, shadow, and surface tokens
- `mergedComponentInventory`: components seen across both viewports
- `responsiveFindings`: viewport sizes, document-height differences, component-count differences, and desktop/mobile-only components
- `warnings`: capture and extraction warnings

The generated `DESIGN.md` should therefore describe both desktop and mobile behavior instead of assuming one layout works everywhere.

### 5. Full-Page Screenshot Capture

Full-page screenshots are captured through repeated `captureVisibleTab` calls with throttling, then stitched through an offscreen canvas document.

This is intentionally conservative:

- respects Chrome's `captureVisibleTab` quota
- does not use the `debugger` permission
- does not request persistent host access
- restores the user's scroll position after capture

Screenshot segments can also be analyzed for approximate dominant colors, brightness, contrast, and visual density. Those segment facts become visual clusters.

### 6. Visual Component Clustering

Visual clusters are lightweight heuristic evidence, not a computer-vision model.

For each screenshot segment, the pipeline intersects the segment's y-range with DOM nodes and component inventory. A cluster records:

- viewport label
- screenshot y-range
- related node IDs
- component kinds in that band
- dominant colors and density when available
- confidence level

This gives the prompt a visual checklist that is separate from DOM semantics, which helps cover areas that DOM labels under-describe.

### 7. Gemini Pipeline

When a Gemini API key is available, generation uses a two-step pipeline:

1. Visual analysis prompt: screenshot plus compact evidence.
2. DESIGN.md prompt: full evidence plus visual analysis.

The extension sends requests directly from the browser to `https://generativelanguage.googleapis.com`. There is no relay server.

If Gemini fails because of quota, high demand, network issues, or model errors, local scripts can fall back to a deterministic evidence-based `DESIGN.md`.

### 8. Dedicated Evaluation

The repository includes a local evaluator for generated `DESIGN.md` files:

- component coverage
- layout-region coverage
- state coverage
- responsive coverage
- visual-cluster coverage
- base token, structure, and narrative checks

Run it with:

```bash
pnpm evaluate:designmd -- --design path/to/DESIGN.md --evidence path/to/evidence.json --out report.json
```

The evaluator is intentionally not a vanity score. Visual clusters without real color, brightness, contrast, or density detail are capped so the score reflects practical usefulness for rebuilding a page.

## Privacy and Security

Design MD is BYOK: bring your own key.

The Gemini API key is stored in Chrome extension local storage and is only used for Gemini API requests.

Before model calls, evidence is redacted:

- emails become `[EMAIL]`
- phone numbers become `[PHONE]`
- card-like numbers become `[CARD]`
- token-like strings become `[TOKEN]`
- sensitive URL query parameters become `[REDACTED]`

The extractor does not collect cookies, `localStorage`, or `sessionStorage`.

Current extension permissions:

- `activeTab`
- `scripting`
- `storage`
- `tabs`
- `downloads`
- `offscreen`

The only host permission is:

```text
https://generativelanguage.googleapis.com/*
```

The extension does not use `<all_urls>`, `debugger`, remote code, telemetry, analytics, or third-party SaaS relays.

## Repository Layout

```text
extension-build/chrome-mv3/       Prebuilt unpacked extension for Chrome
public/icon/                      Extension icon source and PNG sizes
src/entrypoints/background.ts     Capture orchestration and Gemini pipeline entry
src/entrypoints/popup/            React popup UI
src/entrypoints/offscreen/        Canvas screenshot stitching and segment analysis
src/lib/extraction/               DOM extraction, schemas, multi-viewport merge, clusters
src/lib/gemini/                   Gemini client, model filtering, prompts, pipeline
src/lib/design-md/                Local fallback DESIGN.md generation and validation
scripts/                          Local extraction, eval, model listing, smoke scripts
tests/                            Unit and Playwright e2e tests
artifacts/                        Local generated eval artifacts
```

## Development Setup

Install dependencies:

```bash
pnpm install
```

Create local environment file:

```bash
cp .env.example .env
```

Set `GOOGLE_API_KEY` or `GEMINI_API_KEY` in `.env` for local Gemini scripts. Do not commit `.env`.

Run the extension in development:

```bash
pnpm dev
```

Build the extension:

```bash
pnpm build
```

Package a Chrome ZIP:

```bash
pnpm zip
```

After rebuilding, load `.output/chrome-mv3` in Chrome for local development, or copy it into `extension-build/chrome-mv3` when preparing a repository release.

## Updating the Prebuilt Extension Folder

When source changes should be available to users without requiring a build step, refresh the committed unpacked build:

```bash
pnpm build
rm -rf extension-build/chrome-mv3
mkdir -p extension-build
cp -R .output/chrome-mv3 extension-build/chrome-mv3
```

Then verify `extension-build/chrome-mv3/manifest.json` exists before committing.

## Local Harness

List available Gemini models:

```bash
pnpm models:list
```

Extract one site:

```bash
pnpm extract:site -- https://www.apple.com/
```

Extract without live AI calls:

```bash
pnpm extract:site -- https://www.apple.com/ --no-ai
```

Run the reference-site eval:

```bash
pnpm eval:sites
```

Run evals without live AI calls:

```bash
pnpm eval:sites --no-ai
```

Artifacts are written to `artifacts/eval/<slug>/`.

## Web Store-Safe Manual Smoke Test

The manual smoke test launches headed Chromium with the unpacked extension, opens a target site, preloads local settings, and waits for a real user action.

```bash
pnpm build
pnpm smoke:extension:manual -- https://www.gov.uk/
```

In the opened browser:

1. Click the Design MD extension action or press `Command+Shift+Y` on macOS, `Ctrl+Shift+Y` elsewhere.
2. Click `Generate DESIGN.md`.

The script watches `chrome.storage.local.designMdHistory` and writes a report when generation completes.

## Quality and Verification Commands

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
pnpm build
pnpm zip
```

Useful scripts:

- `pnpm models:list` - list Gemini models from `.env`
- `pnpm extract:site -- <url>` - extract and generate one site
- `pnpm eval:sites` - run reference-site evals
- `pnpm evaluate:designmd -- --design <file> --evidence <file>` - score one DESIGN.md
- `pnpm designmd:lint -- <file>` - local DESIGN.md validator

## Current Limitations

- Canvas and WebGL content may not expose meaningful DOM evidence.
- Cross-origin iframes are summarized by rectangle and source only.
- Hidden states are not exhaustively explored in extension mode.
- Cookie banners and overlays can still be classified too generically.
- Full-page visual clusters are currently heuristic and can be too coarse.
- Huge pages are capped to 16000 CSS px in extension full-page screenshot mode.
- Sticky headers can appear more than once in stitched screenshots on some pages.
- Authenticated/private pages may contain sensitive visible text; redaction is best-effort.

## DESIGN.md Contract

Generated files should include YAML front matter with:

- `version`
- `name`
- `description`
- `colors`
- `typography`
- `rounded`
- `spacing`
- `components`

Body sections should appear in this order:

1. `## Overview`
2. `## Colors`
3. `## Typography`
4. `## Layout`
5. `## Elevation & Depth`
6. `## Shapes`
7. `## Components`
8. `## Do's and Don'ts`
9. `## Implementation Notes`

Tokens are normative. Prose explains how to apply them. The generator should not invent hidden pages, unseen states, official brand claims, unmeasured colors, or unmeasured UI components.

## Troubleshooting

- `Invalid API key`: validate the key in Google AI Studio and retry.
- `Quota` or high demand: wait, or choose another available Flash model.
- `Restricted page`: open a normal `http` or `https` page.
- `Extraction returned no evidence`: reload the page and retry after content finishes loading.
- `Screenshot stitch failed`: use viewport mode or run the local harness.
- Extension icon or UI did not update: remove and reload the unpacked extension in `chrome://extensions/`.
