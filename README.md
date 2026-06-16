# Design MD

Chromium extension and local evaluation harness that extract a live page's visible design evidence and generate a Google Stitch-compatible `DESIGN.md`.

## What It Does

Design MD combines four inputs:

- normalized DOM/layout evidence
- computed styles and CSS variables
- deterministic design tokens
- a viewport or stitched full-page screenshot

The extension sends those artifacts directly to Google Gemini with the user's own API key, then produces:

- `<domain>-DESIGN.md`
- `<domain>-fullpage.png`
- optional `<domain>-evidence.json`
- optional `<domain>-visual-report.json`

There is no backend, telemetry, tracking, remote code, or third-party SaaS relay.

## Privacy Model

This is BYOK. The Gemini API key is stored in local extension storage and is only used for requests to `https://generativelanguage.googleapis.com`.

Before model calls, evidence is redacted:

- emails -> `[EMAIL]`
- phone numbers -> `[PHONE]`
- card-like numbers -> `[CARD]`
- token-like strings -> `[TOKEN]`
- sensitive URL query params -> `[REDACTED]`

The extractor does not collect cookies, localStorage, or sessionStorage.

## Install

```bash
pnpm install
```

Create `.env` for local scripts:

```bash
cp .env.example .env
```

Set `GOOGLE_API_KEY` in `.env` for local Gemini runs. Do not commit `.env`.

## Extension Development

```bash
pnpm dev
pnpm build
pnpm zip
```

Load the unpacked Chromium extension from `.output/chrome-mv3` after `pnpm build`.

The popup lets you:

- paste and validate a Gemini API key
- dynamically list models that support `generateContent`
- choose vision and text models
- capture viewport or full page
- include evidence and visual report JSON
- copy or download generated artifacts

## Local Harness

List available Gemini models:

```bash
pnpm models:list
```

Extract one site:

```bash
pnpm extract:site -- https://www.apple.com/
```

Run the 5-site eval:

```bash
pnpm eval:sites
```

Run without live AI calls:

```bash
pnpm eval:sites --no-ai
```

Artifacts are written to `artifacts/eval/<slug>/`.

## Scripts

- `pnpm dev` - run WXT dev
- `pnpm build` - build extension
- `pnpm zip` - package extension
- `pnpm typecheck` - TypeScript check
- `pnpm lint` - ESLint
- `pnpm test` - Vitest unit tests
- `pnpm test:e2e` - Playwright tests
- `pnpm models:list` - list Gemini models from `.env`
- `pnpm extract:site -- <url>` - extract and generate one site
- `pnpm eval:sites` - run Apple, BMW M, Airtable, Binance, IBM evals
- `pnpm designmd:lint -- <file>` - local DESIGN.md validator
- `pnpm format` - Prettier

## Known Limitations

- Canvas/WebGL content may not expose semantic DOM evidence.
- Cross-origin iframes are summarized by rect/src only.
- Hidden states are not captured in extension mode.
- Huge pages are capped to 16000 CSS px in full-page screenshot mode.
- Responsive states require repeated captures or the local harness.
- Auth/private pages may contain sensitive visible text; redaction is best-effort.
- Full-page screenshot stitching can duplicate sticky headers on some pages.

## Security Notes

- Uses `activeTab` and programmatic script injection after a user action.
- Avoids `<all_urls>` host permissions.
- Uses a permanent host permission only for Gemini API requests.
- Does not use the `debugger` permission.
- Does not execute remote code.

## DESIGN.md Quality Rules

Generated files must include YAML front matter with `version`, `name`, `description`, `colors`, `typography`, `rounded`, `spacing`, and `components`.

Body sections must appear in order:

1. `## Overview`
2. `## Colors`
3. `## Typography`
4. `## Layout`
5. `## Elevation & Depth`
6. `## Shapes`
7. `## Components`
8. `## Do's and Don'ts`
9. `## Implementation Notes`

Tokens are normative. Prose explains how to apply them. Do not invent hidden pages, unseen states, or official brand claims.

## Troubleshooting

- `Invalid API key`: validate the key in Google AI Studio and retry.
- `Quota`: choose another available Flash model or wait for quota reset.
- `Restricted page`: open a normal `http` or `https` page.
- `Extraction returned no evidence`: reload the page and retry after content finishes loading.
- `Screenshot stitch failed`: use viewport mode or run the local harness.
