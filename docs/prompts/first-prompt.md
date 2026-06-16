самостоятельно изучи, установи и используй воркфлоу [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail) для реализации всей задачи(сам пропиши AGENTS.md в соответствии с задачей, по принципам ponytail:

You are GPT-5.5 Codex acting as a senior browser-extension architect, senior TypeScript engineer, product-minded designer, and QA engineer.

You must implement a production-ready Chromium extension and local evaluation harness that extracts a live website’s design system and generates a high-quality Google Stitch-compatible DESIGN.md file.

The project must be implemented end-to-end in this repository.

Do not ask me clarification questions unless absolutely blocked. Make reasonable production-grade assumptions and document them.

Current date for model/API assumptions: 2026-06-16.

Primary goal:
Build a Chromium extension that runs on the current active tab, extracts:

* DOM snapshot
* computed styles
* design tokens
* full-page screenshot

Then sends those artifacts directly to the user-selected Gemini models using BYOK and generates:

* `<domain>-DESIGN.md`
* `<domain>-fullpage.png`
* optional `<domain>-evidence.json`
* optional `<domain>-visual-report.json`

Architecture:
DOM snapshot + computed styles + design tokens + full-page screenshot -> Gemini vision model -> visual report -> Gemini text model -> `<DOMAIN>-DESIGN.md`

The extension must be BYOK:

* User pastes their own Gemini API key.
* API key is stored locally only.
* API key is never sent to any server except Google Gemini API.
* No backend.
* No telemetry.
* No remote code.
* No tracking.
* No analytics.
* No third-party SaaS dependency.

The UI must be minimal, utility-first, pleasant, and interactive:

* Minimalist visual design.
* No visual clutter.
* No unnecessary badges, promo chips, decorative cards, or long explanatory text.
* Clear controls.
* Small, tasteful progress animation.
* A visible current-step indicator showing which processing step is running.
* Clear error states.
* Copy and download buttons for generated DESIGN.md.
* Download screenshot and evidence JSON in a compact secondary area.
* The UI should feel like a professional developer utility, not a marketing toy.

Use this technology stack unless you find a serious blocker:

* WXT
* TypeScript
* React
* Manifest V3
* Vite
* Tailwind CSS
* shadcn/ui or lightweight custom primitives if shadcn adds unnecessary bulk
* Zod for runtime schemas
* Vitest for unit tests
* Playwright for extraction/evaluation tests
* pnpm
* `@google/genai` or direct Gemini REST wrapper, whichever is more robust in a browser extension context
* `@google/design.md` CLI for validation, if installable

You must create a clean, maintainable architecture. Avoid one giant file. Shared extraction logic must be reusable by both:

1. the browser extension content script
2. the local Playwright evaluation harness

Expected top-level structure:

.
├── src/
│   ├── entrypoints/
│   │   ├── background.ts
│   │   ├── content.ts
│   │   ├── popup/
│   │   │   ├── App.tsx
│   │   │   └── main.tsx
│   │   └── offscreen/
│   │       ├── index.html
│   │       └── main.ts
│   ├── components/
│   ├── lib/
│   │   ├── browser/
│   │   ├── extraction/
│   │   ├── gemini/
│   │   ├── design-md/
│   │   ├── screenshot/
│   │   ├── storage/
│   │   ├── messaging/
│   │   ├── progress/
│   │   └── security/
│   └── styles/
├── scripts/
│   ├── extract-site.ts
│   ├── eval-sites.ts
│   ├── compare-design-md.ts
│   ├── list-gemini-models.ts
│   └── fixtures/
│       └── reference-sites.ts
├── tests/
│   ├── unit/
│   └── e2e/
├── artifacts/
│   └── .gitkeep
├── AGENTS.md
├── README.md
├── .env.example
├── package.json
├── wxt.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── vitest.config.ts

Important existing references to study before implementing:

* Google Labs DESIGN.md format/spec repository: google-labs-code/design.md
* VoltAgent awesome-design-md repository, especially:

  * design-md/apple/DESIGN.md
  * design-md/bmw-m/DESIGN.md
  * design-md/airtable/DESIGN.md
  * design-md/binance/DESIGN.md
  * design-md/ibm/DESIGN.md
* getdesign.md examples and “What is DESIGN.md”
* Open-source competitors / references:

  * hasi98/designpull
  * dembrandt/dembrandt
  * jpoindexter/design-md-extractor
  * yuvrajangadsingh/brandmd
  * uselayout/app
  * uselayout/cli
  * Paidax01/web-to-design-md
  * educlopez/design-bites

Do not copy their code. Extract best practices and build a clean implementation.

First phase: inspect and plan

1. Inspect the repository.
2. Check package manager and existing files.
3. Create or update AGENTS.md with project instructions, commands, architecture rules, and definition of done.
4. Produce a short implementation plan before coding.
5. Then implement without waiting for approval unless there is a hard blocker.

Functional requirements

1. Extension popup

The popup must include:

* App title: “Design MD”
* Compact subtitle: “Extract the current page into DESIGN.md”
* API key input:

  * masked by default
  * show/hide toggle
  * save locally
  * validate button
  * status: valid / invalid / quota / unknown
* Model selectors:

  * Vision model dropdown
  * Text model dropdown
* The model dropdowns must be populated dynamically using the Gemini models API when the user validates the key.
* Do not hardcode only one model.
* Provide safe defaults if available:

  * vision default: `gemini-2.5-flash`
  * text default: `gemini-2.5-flash`
  * fallback cheaper text model: `gemini-2.5-flash-lite`
* Only show models that support `generateContent`.
* For vision model dropdown, prefer models that support image input or are known multimodal.
* For text model dropdown, prefer stable text-output models.
* Show model names plainly. Do not add promotional labels or excessive metadata.
* Capture mode:

  * current viewport
  * full page
* Optional advanced toggle:

  * include evidence JSON
  * include visual report JSON
  * include raw CSS variables
* Main action button:

  * “Generate DESIGN.md”
* Progress area:

  * animated progress bar
  * current step label
  * elapsed time
  * compact log of last 3 events maximum
* Output area:

  * generated filename
  * copy button
  * download DESIGN.md button
  * download screenshot button
  * download evidence JSON button if enabled
* Error area:

  * concise user-facing message
  * technical details collapsible

No clutter. No giant cards full of text. No fake badges. No confetti. No emojis.

2. Permissions

Use minimal MV3 permissions:

* `activeTab`
* `scripting`
* `storage`
* `tabs` only if truly needed
* `downloads` if using Chrome downloads API
* `offscreen` if using offscreen document for image stitching or Blob/download work

Avoid `<all_urls>` host permission unless absolutely necessary. Prefer activeTab after explicit user action.

Do not use `debugger` permission in the initial production path because it creates high trust friction. If you implement a future Pro mode stub, keep it disabled and documented only.

3. Page extraction

Create a robust extraction engine.

The content script must extract a normalized evidence object, not raw page garbage.

Do not send the full raw `document.documentElement.outerHTML` as the primary artifact. Raw HTML may be stored only as optional debug data and must be sanitized/truncated.

Evidence object should include:

Page metadata:

* url
* origin
* hostname
* title
* viewport width/height
* document width/height
* devicePixelRatio
* language
* color-scheme if available
* meta theme-color
* detected framework hints if safely detectable:

  * Next.js
  * Nuxt
  * Astro
  * SvelteKit
  * Shopify
  * Webflow
  * Squarespace
  * WordPress
  * Tailwind
  * Framer

DOM/layout nodes:
For significant visible elements only:

* stable generated node id
* tag
* role
* accessible name if available
* visible text sample
* selector hint
* class name sample, not huge class dumps
* id only if not random-looking
* rect:

  * x, y, width, height
  * documentX, documentY
  * viewport-relative and document-relative if useful
* visibility
* z-index
* parent id
* child ids
* depth
* semantic kind:

  * page
  * header
  * nav
  * hero
  * section
  * card
  * button
  * link
  * input
  * form
  * footer
  * image
  * icon
  * logo
  * text
  * media
  * unknown
* importance score

Computed styles:
Capture only properties that influence design:

Typography:

* font-family
* font-size
* font-weight
* line-height
* letter-spacing
* text-transform
* font-style
* font-variation-settings
* font-feature-settings
* text-align

Color:

* color
* background-color
* background-image if gradient
* border-color
* outline-color
* text-decoration-color
* opacity

Layout:

* display
* position
* flex-direction
* align-items
* justify-content
* gap
* grid-template-columns
* grid-template-rows
* column-gap
* row-gap
* max-width
* width
* height
* padding
* margin
* inset values for fixed/sticky

Shape:

* border-radius
* border-width
* border-style
* overflow
* clip-path if relevant

Depth:

* box-shadow
* text-shadow
* backdrop-filter
* filter

Motion:

* transition-property
* transition-duration
* transition-timing-function
* animation-name
* animation-duration
* transform

Assets:

* image src/currentSrc if same-origin or public URL
* alt text
* dimensions
* background image URLs if visible
* SVG presence
* icon-like SVG hints
* logo candidate

CSS variables:

* collect `:root` custom properties
* collect custom properties from body and major containers
* preserve variables that look like colors, spacing, typography, radius, shadow, z-index, motion
* dedupe and normalize

Stylesheet rules:

* attempt to read accessible `document.styleSheets`
* handle CORS failures gracefully
* never crash on restricted stylesheets
* store only useful rules or variable declarations
* do not flood evidence with massive framework CSS

Element filtering:
Exclude:

* script, style, meta, link, noscript
* display none
* visibility hidden
* opacity 0 unless it is a meaningful interaction state
* width/height 0
* offscreen tracking pixels
* analytics
* hidden inputs
* password fields
* iframes that cannot be read, but include iframe rect and src hostname
* repeated icon path data
* giant SVG path bodies
* random hydration blobs

Include:

* major layout sections
* headings
* paragraphs with meaningful copy
* CTA buttons
* nav links
* cards
* forms
* pricing cards
* feature blocks
* image/media blocks
* footer columns
* sticky bars
* modal/dialog if currently visible

Importance scoring:
Implement a deterministic scoring system based on:

* visible area
* semantic tag/role
* text presence
* interactivity
* position in page
* heading level
* unique style contribution
* image/media role
* component-like repetition
* high color/style distinctiveness

Use score to keep evidence compact:

* keep all major sections
* keep all headings
* keep all interactive controls
* keep representative repeated components
* cap total nodes by default around 800-1200
* cap deeply nested descendants
* summarize repeated patterns instead of listing 100 identical cards

Design token extraction:
Create deterministic extraction modules:

* color tokens:

  * normalize rgb/rgba/hsl/hex to hex/rgba
  * dedupe near-identical colors
  * ignore transparent/noise
  * classify:

    * primary
    * accent
    * canvas
    * surface
    * surface-muted
    * ink
    * body
    * muted
    * border/hairline
    * success/warning/error if detected
  * track usage count, area, roles, example node ids

* typography tokens:

  * group by font family, size, weight, line height, letter spacing
  * classify:

    * display-xl
    * display-lg
    * display-md
    * title-lg
    * title-md
    * body
    * body-sm
    * caption
    * button
    * nav-link
  * include evidence node ids

* spacing:

  * derive common gaps, paddings, margins from computed styles and layout rects
  * ignore one-off layout accidents
  * infer base grid when possible
  * produce xxs/xs/sm/md/lg/xl/xxl/section

* radius:

  * collect actual border-radius values
  * classify none/xs/sm/md/lg/xl/pill/full

* shadows:

  * collect box-shadow/text-shadow
  * classify soft/elevated/modal/product/image if possible

* surfaces:

  * identify major background surfaces by area
  * sort by visual role and luminance

* components:

  * infer repeated patterns:

    * button-primary
    * button-secondary
    * text-link
    * top-nav
    * hero-band
    * feature-card
    * pricing-card
    * input
    * footer
    * badge only if truly present
  * do not invent components that are not visible

* breakpoints:

  * from media queries if accessible
  * from Playwright eval harness by extracting multiple viewport sizes
  * in extension current-tab mode, mark breakpoints as “not captured” unless CSS media queries provide evidence

Interaction states:

* In extension mode, capture current state only.
* In Playwright evaluation mode, simulate hover/focus on representative buttons, links, inputs, tabs, and nav items.
* Store hover/focus state evidence if successfully captured.
* Do not mutate destructive controls.

Redaction:
Before sending anything to Gemini:

* replace emails with `[EMAIL]`
* replace phone numbers with `[PHONE]`
* replace credit-card-like sequences with `[CARD]`
* replace long auth/token-like strings with `[TOKEN]`
* remove password values
* remove hidden input values
* remove cookies/localStorage/sessionStorage entirely
* remove form field values unless they are placeholders
* if URL contains sensitive query params, redact:

  * token
  * key
  * password
  * session
  * auth
  * code
  * state
* Do not collect browser cookies.
* Do not collect localStorage.
* Do not collect sessionStorage.

4. Screenshot capture

Implement full-page screenshot capture in extension safe mode.

Preferred safe path:

* Use `chrome.tabs.captureVisibleTab` after explicit user click.
* Ask content script for document height, viewport height, scroll positions, fixed/sticky elements.
* Scroll from top to bottom.
* Wait after each scroll for lazy loading and layout stabilization.
* Capture visible viewport screenshot.
* Stitch screenshots using an offscreen document/canvas or a safe browser-compatible approach.
* Respect devicePixelRatio.
* Avoid duplicate overlap.
* Attempt to reduce duplicate sticky headers/footers:

  * at minimum document known limitation
  * ideally detect fixed/sticky elements and mask duplicate bands during stitching
* Restore original scroll position at the end.
* Downscale/compress if full image is too huge.
* Produce PNG or high-quality WebP.
* Store screenshot artifact in memory until download or model call.

Current viewport mode:

* Capture only visible viewport.
* Still extract full DOM evidence if possible.
* Mark screenshot mode in evidence.

Long page handling:

* If document height is too large, set max capture height and warn.
* Default max stitched height: 16000 CSS px unless technically safe to go higher.
* If page is huge, segment screenshots and send selected visual slices:

  * top/hero
  * middle representative sections
  * bottom/footer
  * plus evidence JSON
* Do not crash.

5. Gemini integration

Implement a Gemini client for BYOK.

Required behavior:

* API key is stored in extension storage.
* Validate key by listing models or making a tiny model request.
* `scripts/list-gemini-models.ts` must read `.env` with `GOOGLE_API_KEY` and print available models and supported methods.
* The extension must dynamically list available models via the key.
* The model list must be cached locally with refresh button.
* If model list fails, show clear error.
* If chosen model fails due to quota/unavailability, show clear error and suggest another available Flash model.
* Do not leak API key in logs.

Model selection:

* Vision model dropdown:

  * show models returned by Google that can call generateContent and are likely multimodal.
  * default to `gemini-2.5-flash` when available.
  * allow `gemini-2.5-flash-lite` for cheaper/faster mode.
  * allow Pro only if returned by the key.
* Text model dropdown:

  * show text-output generateContent models.
  * default to `gemini-2.5-flash`.
  * allow `gemini-2.5-pro` if returned and available.
  * allow `gemini-2.5-flash-lite`.

Important:

* Do not use Gemini image generation models for screenshot understanding unless they explicitly support the required image input/text output workflow.
* Do not use deprecated Gemini 2.0 Flash.
* Do not use Imagen models.
* Do not hardcode pricing claims in the UI.

Two-stage AI pipeline:

Stage A: Visual analysis
Input:

* full-page screenshot or selected visual slices
* compact design tokens
* section map
* major layout nodes

Output:

* strict JSON visual report:

  * overall visual thesis
  * visual mood
  * surface rhythm
  * typography observations
  * color observations
  * layout observations
  * component observations
  * image/photography/illustration style
  * interaction/motion hints if visible
  * visible do/don’t rules
  * confidence notes
  * missing/uncertain areas

Stage B: DESIGN.md generation
Input:

* visual report
* normalized evidence JSON
* design tokens
* source URL/domain
* screenshot metadata
* strict DESIGN.md system prompt

Output:

* only markdown content for `<domain>-DESIGN.md`
* valid YAML front matter followed by markdown body
* no code fences around the output
* no commentary outside the DESIGN.md

6. DESIGN.md output requirements

Generated DESIGN.md must follow Google DESIGN.md spec:

* YAML front matter at top between `---` fences.
* Machine-readable tokens in YAML.
* Markdown body with rationale.
* Tokens are normative values.
* Prose explains how to apply values.
* Token references must resolve.

Front matter should include:

* `version: alpha`
* `name: <Domain>-design-analysis`
* `description: <concise visual thesis>`
* `colors`
* `typography`
* `rounded`
* `spacing`
* `components`

Optional front matter:

* `shadows`
* `motion`
* `breakpoints`
* `surfaces`
  Only include optional keys if useful and valid. Avoid creating nonstandard chaos unless it helps.

Markdown body should include these sections in this order:

1. `## Overview`
2. `## Colors`
3. `## Typography`
4. `## Layout`
5. `## Elevation & Depth`
6. `## Shapes`
7. `## Components`
8. `## Do's and Don'ts`
9. `## Implementation Notes`

The Google spec lists canonical sections; if Implementation Notes is non-canonical, keep it after canonical sections. Do not duplicate headings.

Style of DESIGN.md:

* Similar quality and density to VoltAgent awesome-design-md examples.
* Not generic.
* Not fluffy.
* Not marketing copy.
* Must describe the actual design system of the captured page/resource.
* Must include exact token values from evidence whenever possible.
* Must distinguish evidence-backed facts from inferred approximations.
* Must avoid hallucinating hidden pages, states, components, or brand strategy.
* Must avoid claiming official brand affiliation.
* Must not say “modern clean design” unless the evidence is genuinely that shallow.
* Must capture visual rules:

  * what colors mean
  * where typography changes
  * how spacing rhythm works
  * how components behave
  * what not to do when recreating the UI
* Must be useful for AI coding agents to reproduce a matching UI.

Quality bar:

* A developer should be able to give the generated DESIGN.md to Codex/Cursor/Claude and get a UI close to the original site’s visual language.
* It should not merely list CSS values.
* It should explain design intent using the measured evidence.

7. The Gemini prompts inside the app

Create prompt files/modules:

* `src/lib/gemini/prompts/visual-analysis.ts`
* `src/lib/gemini/prompts/design-md.ts`

The system prompt for DESIGN.md generation must include:

* Role:
  You are a senior design systems analyst and frontend design engineer.
* Inputs:
  You receive screenshot-derived visual evidence, DOM/layout evidence, computed styles, and extracted tokens.
* Priority order:

  1. measured computed styles and token evidence
  2. visual screenshot observations
  3. DOM semantics
  4. careful inference
* Rules:

  * Do not invent unseen sections.
  * Do not invent values when measured values exist.
  * Do not output generic advice.
  * Do not output implementation code.
  * Do not mention that you are an AI.
  * Do not mention the extraction pipeline.
  * Do not include citations.
  * Do not include raw JSON.
  * Output only the final DESIGN.md markdown.
  * Use exact hex colors.
  * Use exact font sizes/weights/line heights when available.
  * Use token references inside component definitions.
  * Keep YAML parseable.
  * Preserve section order.
  * Avoid duplicate sections.
  * Include Do’s and Don’ts.
  * Include Implementation Notes for AI coding agents.
  * Mark uncertainty only where truly necessary.
* Formatting:

  * Start with YAML front matter.
  * Then markdown body.
  * No wrapping code fence.
* Validation:

  * Ensure all token references resolve.
  * Ensure contrast pairs are reasonable.
  * Ensure each component references existing tokens.
  * Ensure all required sections exist.

8. Local evaluation harness

There is a `.env` file in the repository root that contains:

GOOGLE_API_KEY=...

Use it for local scripts and tests. Do not commit `.env`. Create `.env.example`.

Build a local Playwright-based harness that can run without the extension UI:

* It must open a URL.
* It must extract DOM snapshot + computed styles + design tokens using shared extraction modules.
* It must capture full-page screenshot.
* It must call Gemini with selected models.
* It must generate DESIGN.md into `artifacts/eval/<slug>/`.
* It must save:

  * evidence.json
  * visual-report.json
  * screenshot.png
  * generated DESIGN.md
  * comparison report JSON/MD

Test against 5 websites that correspond to examples in VoltAgent awesome-design-md:

* Apple
* BMW M
* Airtable
* Binance
* IBM

Use official public URLs from the corresponding examples if discoverable from the repo. If not discoverable, choose the obvious official homepage/product page and document the choice.

The eval harness must compare generated DESIGN.md against reference DESIGN.md from the awesome-design-md repository.

Do not require exact text match. Compare structurally and semantically:

* DESIGN.md lint passes.
* YAML front matter parses.
* Required sections exist in order.
* Token reference resolution passes.
* Color coverage:

  * extracted/generated colors compared to reference colors with tolerance.
  * report exact, near, missing, extra.
* Typography coverage:

  * font families
  * sizes
  * weights
  * line heights
* Spacing/radius coverage:

  * common scales
* Component coverage:

  * button, nav, card, input, hero, footer, etc.
* Narrative coverage:

  * does Overview mention actual visual thesis?
  * does Colors section assign semantic roles?
  * does Typography section explain hierarchy?
  * does Layout section explain rhythm/grid?
  * does Do’s/Don’ts section exist and include actionable constraints?
* Length and density:

  * not too short
  * not generic
  * no empty sections
* Evidence alignment:

  * every major generated token should be supported by evidence or marked inferred.

Create scoring:

* overall score 0-100
* token score
* structure score
* narrative score
* evidence alignment score
* issues list
* actionable recommendations

Suggested pass threshold:

* structure score >= 90
* token score >= 70
* narrative score >= 75
* evidence alignment score >= 80
* overall >= 80

The harness should not fail just because Apple changed its website. It should produce useful diagnostics.

9. Debug loop requirement

Before changing extraction logic during debugging:

* Use the Playwright harness to extract:

  * DOM snapshot
  * computed styles
  * design tokens
  * full-page screenshot
* Inspect how the extracted evidence relates to the screenshot.
* Identify missing evidence.
* Then update extraction logic.
* Rerun at least one eval site.
* Repeat until the output improves.

Do not blindly tweak the Gemini prompt when the extraction evidence is bad.
First fix extraction if:

* colors are missing
* fonts are wrong
* layout sections are missing
* important components are absent
* repeated components flood the evidence
* screenshot and DOM disagree

Only tune prompts when evidence is good but synthesis is weak.

10. Scripts

Add package scripts:

* `pnpm dev` - run WXT dev
* `pnpm build` - build extension
* `pnpm zip` - package extension if WXT supports it
* `pnpm typecheck`
* `pnpm lint`
* `pnpm test`
* `pnpm test:unit`
* `pnpm test:e2e`
* `pnpm models:list`
* `pnpm extract:site -- <url>`
* `pnpm eval:sites`
* `pnpm designmd:lint -- <file>`
* `pnpm format`

If exact script argument passing is inconvenient, document the correct invocation in README.

11. Unit tests

Add tests for:

* CSS color normalization
* color deduplication
* typography grouping
* spacing extraction
* radius extraction
* element visibility filtering
* importance scoring
* sensitive data redaction
* token reference validation
* filename/domain slug generation
* model filtering

12. E2E tests

Add Playwright tests for:

* extraction on a simple local fixture page
* extraction of CSS variables
* extraction of computed styles
* screenshot capture in local harness
* DESIGN.md generation mocked if no API key
* real Gemini test only if `GOOGLE_API_KEY` exists

Do not make CI depend on live Gemini by default. Real model calls should be opt-in or env-gated.

13. Error handling

Handle:

* invalid API key
* API quota exceeded
* model not found
* model does not support image input
* restricted pages:

  * chrome://
  * chrome-extension://
  * Chrome Web Store if restricted
* content script injection failure
* page too large
* screenshot stitch failure
* CORS stylesheet read errors
* empty extraction
* Gemini response not markdown
* Gemini response has invalid YAML
* broken token references
* user closes popup during generation
* service worker restarts

Provide concise UI messages and useful console diagnostics.

14. Storage

Store:

* Gemini API key
* selected vision model
* selected text model
* advanced options
* last 10 generations metadata:

  * title
  * URL
  * date
  * filename
  * maybe markdown content if small enough

Do not store screenshots forever by default. Avoid bloating extension storage.

15. Security and privacy

BYOK means the user owns the key, but still:

* Make privacy obvious in README.
* Do not send artifacts anywhere except Google Gemini API.
* Redact sensitive data before Gemini calls.
* Do not collect cookies/localStorage/sessionStorage.
* Do not run automatically on pages.
* Only run after explicit user click.
* Do not inject persistent page modifications.
* Do not alter page state beyond temporary scroll; restore scroll position.
* Do not click destructive elements during interaction-state capture.
* In extension mode, avoid interaction crawling by default.

16. UI design details

Popup dimensions:

* around 420px wide
* height flexible but not bloated
* use clean spacing
* neutral background
* subtle border
* accessible contrast
* clear focus rings
* compact form fields
* one primary button
* secondary buttons visually quiet
* progress animation should be subtle:

  * moving bar or stepper
  * no silly graphics
* Current step examples:

  * “Checking page access”
  * “Extracting DOM”
  * “Reading computed styles”
  * “Building design tokens”
  * “Capturing screenshot”
  * “Analyzing visual system”
  * “Writing DESIGN.md”
  * “Validating output”
  * “Ready”

Keep microcopy short:

* Good: “Invalid API key”
* Bad: “Oops! Something went wrong while trying to validate your magical AI key…”

17. Output filenames

Generate safe filenames:

* `apple-com-DESIGN.md`
* `bmw-m-com-DESIGN.md`
* `airtable-com-DESIGN.md`

Rules:

* lowercase hostname
* remove protocol
* replace invalid characters with hyphen
* collapse repeated hyphens
* suffix `-DESIGN.md`
* screenshot suffix `-fullpage.png`
* evidence suffix `-evidence.json`
* visual report suffix `-visual-report.json`

18. README

Write a clear README:

* What the extension does
* Why DOM + computed styles + tokens + screenshot are combined
* BYOK privacy model
* How to install dependencies
* How to run dev
* How to load unpacked extension in Chromium
* How to add Gemini API key
* How to run local eval with `.env`
* Available scripts
* Known limitations:

  * canvas/WebGL pages
  * cross-origin iframes
  * hidden states
  * private/auth pages and redaction
  * huge pages
  * responsive states require eval harness or multiple captures
* Security notes
* Troubleshooting

19. AGENTS.md

Create AGENTS.md containing:

* project purpose
* architecture overview
* commands
* coding standards
* testing standards
* privacy/security constraints
* DESIGN.md quality rules
* no AI slop rules
* definition of done

20. Definition of done

You are done only when:

* Extension builds successfully.
* TypeScript typecheck passes.
* Unit tests pass.
* WXT build passes.
* Popup UI is implemented.
* API key validation works or is implemented with clear fallback if live call cannot be tested.
* Model dropdowns are dynamic.
* Extraction engine works on a normal live page.
* Full-page screenshot works in at least the local harness and extension safe path is implemented.
* Gemini prompt modules exist.
* DESIGN.md generation pipeline exists.
* Output download/copy works.
* Redaction is implemented and tested.
* Local Playwright eval harness exists.
* The harness can run against at least 5 reference sites.
* Comparison report is generated.
* At least one real Gemini eval run is attempted when `GOOGLE_API_KEY` exists.
* Any live API failures are clearly documented with exact error.
* README is complete.
* AGENTS.md is complete.
* No secrets are committed.
* No obvious unused files, dead code, or console spam.
* You run:

  * `pnpm typecheck`
  * `pnpm lint`
  * `pnpm test`
  * `pnpm build`
  * `pnpm eval:sites` if `GOOGLE_API_KEY` exists

21. Implementation notes

Prefer robust plain TypeScript over clever abstractions.

Do not use heavy state management unless necessary. React state/hooks are enough for popup state. If you need shared state, use a tiny typed store.

Use Zod schemas for:

* extracted evidence
* design tokens
* visual report
* Gemini settings
* progress events
* generated artifact metadata

Use typed messaging between popup/background/content:

* `EXTRACT_PAGE`
* `CAPTURE_SCREENSHOT`
* `GENERATE_DESIGN_MD`
* `GET_SETTINGS`
* `SAVE_SETTINGS`
* `VALIDATE_GEMINI_KEY`
* `LIST_GEMINI_MODELS`
* `DOWNLOAD_ARTIFACT`

Do not pass huge payloads repeatedly through runtime messages if it causes limits. If needed, keep large artifacts in background memory during a generation session and pass lightweight IDs.

Service worker caveat:

* MV3 service workers can restart.
* Do not rely on long-lived global state for user settings.
* For in-progress generation, keep logic resilient.
* If popup closes, generation may not need to continue, but should fail gracefully.

22. Gemini response validation and repair

After Gemini returns DESIGN.md:

* Strip accidental code fences.
* Parse YAML front matter.
* Validate required token sections.
* Validate token references.
* Validate markdown sections.
* If validation fails, call a repair prompt once:

  * Give the invalid output and validation errors.
  * Ask Gemini to return corrected DESIGN.md only.
* Do not infinite-loop.
* If repair fails, show validation error and allow user to download raw output anyway with warning.

23. Avoid these mistakes

Do not:

* Send entire raw HTML as the main artifact.
* Send unredacted sensitive data.
* Hardcode only one Gemini model.
* Build a backend.
* Use Google Cloud Vision API.
* Use image generation models as the primary visual-understanding model.
* Create a cluttered UI.
* Add fake marketing badges.
* Add long explanatory text in the popup.
* Ignore CORS stylesheet errors.
* Crash on restricted pages.
* Store screenshots permanently by default.
* Pretend exact reconstruction is possible.
* Generate generic DESIGN.md with vague phrases.
* Overfit to Apple/BMW/Airtable examples.
* Make tests depend on live websites without graceful diagnostics.
* Make all extracted colors tokens if they are noise.
* Treat Tailwind atomic class names as semantic truth.
* Click random buttons on real websites.
* Leak API keys into logs.

24. Final response after implementation

When finished, report:

* What was built.
* Key files changed.
* Commands run and results.
* Eval results summary for 5 sites.
* Known limitations.
* How to run locally.
* Any failures or parts not completed.

Be honest. Do not claim production-ready if typecheck/build/tests/eval did not run.

Start now.
