# Design MD Agent Instructions

## Purpose

Build and maintain a production-grade Chromium MV3 extension plus local Playwright harness that extracts visible website design evidence and generates Google Stitch-compatible `DESIGN.md` files with BYOK Gemini.

## Architecture

- Frontend: WXT, React, TypeScript, Tailwind, lightweight custom primitives.
- Backend: none. TypeScript scripts provide local harness behavior.
- Extension flow: popup -> background -> active tab content extraction -> screenshot capture/stitch -> Gemini visual report -> Gemini DESIGN.md -> local downloads.
- Shared extraction lives in `src/lib/extraction` and must work from both content script and Playwright `page.evaluate`.
- Gemini integration lives in `src/lib/gemini` and uses direct REST calls to `generativelanguage.googleapis.com`.
- DESIGN.md validation lives in `src/lib/design-md`.

## Ponytail Rule

Use the Ponytail ladder before adding code:

1. Skip speculative requirements.
2. Prefer standard library.
3. Prefer native browser/extension APIs.
4. Prefer installed dependencies.
5. Prefer one clear line.
6. Only then write the smallest correct code.

Do not simplify away security, validation, accessibility, user-requested behavior, or data-loss prevention.

## Commands

- `pnpm dev`
- `pnpm build`
- `pnpm zip`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm test:e2e`
- `pnpm models:list`
- `pnpm extract:site -- <url>`
- `pnpm eval:sites`
- `pnpm designmd:lint -- <file>`
- `pnpm format`

## Coding Standards

- TypeScript strict mode.
- No hardcoded secrets.
- No backend.
- No telemetry, analytics, tracking, or remote code.
- No `<all_urls>` host permission.
- No `debugger` permission in the production path.
- Keep popup UI compact and utility-first; no marketing copy, confetti, promo badges, or decorative clutter.
- Use Zod for runtime schemas at trust boundaries.
- Keep browser messaging typed.
- Add focused tests for non-trivial parsing, scoring, validation, and security logic.

## Privacy And Security

- API key is stored only in extension local storage.
- API key may only be sent to Google Gemini API.
- Redact evidence before model calls.
- Never collect cookies, localStorage, or sessionStorage.
- Never collect password field values or hidden input values.
- Restore page scroll position after screenshot capture.
- Do not click arbitrary controls on live sites in extension mode.

## DESIGN.md Quality Rules

- YAML front matter starts and ends with `---`.
- Required front matter: `version`, `name`, `description`, `colors`, `typography`, `rounded`, `spacing`, `components`.
- Required body sections, in order: Overview, Colors, Typography, Layout, Elevation & Depth, Shapes, Components, Do's and Don'ts, Implementation Notes.
- Token references must resolve.
- Use measured values when available.
- Distinguish evidence-backed facts from inference.
- Do not invent hidden pages, states, components, or official brand affiliation.

## Definition Of Done

- Extension builds with `pnpm build`.
- `pnpm typecheck`, `pnpm lint`, and `pnpm test` pass.
- Popup implements key validation, dynamic model selectors, generation progress, copy, and downloads.
- Extraction captures DOM/layout, computed styles, tokens, CSS variables, and redacted evidence.
- Full-page screenshot path exists for extension and harness.
- Gemini prompts and two-stage pipeline exist.
- Local Playwright harness can run the 5 reference sites and write comparison reports.
- README and AGENTS.md are current.
- `.env` remains uncommitted.
