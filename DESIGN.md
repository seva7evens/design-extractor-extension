---
version: 1.0.0
name: Sorce Mobile App
description: Evidence-backed mobile app design system for Sorce, focused on the iOS onboarding, swipe feed, applications, inbox, feedback, profile, paywall, and application-detail screens shown in the supplied screenshots.
colors:
  canvas: "#ffffff"
  ink: "#111111"
  text-muted: "#4a4a4a"
  text-subtle: "#7b7f86"
  border: "#e7e7e7"
  surface: "#ffffff"
  surface-muted: "#f4f4f5"
  surface-soft: "#fafafa"
  brand-green: "#50c878"
  brand-green-soft: "#dff7e8"
  brand-green-faint: "#eefaf3"
  danger: "#dc5b55"
  danger-soft: "#fdecef"
  warning: "#f1bd61"
  warning-soft: "#fff6e8"
  info: "#2f9f9b"
  info-soft: "#e6f7f7"
  lavender-soft: "#f3edf7"
  peach-soft: "#fff0e9"
  tab-active: "#e9e9e7"
  overlay: "rgba(255, 255, 255, 0.86)"
typography:
  family: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', system-ui, sans-serif"
  brand:
    fontFamily: Georgia, serif
    fontSize: 38px
    fontWeight: 700
    lineHeight: 1.05
  hero:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif"
    fontSize: 36px
    fontWeight: 700
    lineHeight: 1.16
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif"
    fontSize: 30px
    fontWeight: 700
    lineHeight: 1.2
  section:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif"
    fontSize: 24px
    fontWeight: 700
    lineHeight: 1.25
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.35
  body-strong:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"
    fontSize: 18px
    fontWeight: 700
    lineHeight: 1.28
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"
    fontSize: 15px
    fontWeight: 600
    lineHeight: 1.2
  caption:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.25
rounded:
  xs: 8px
  sm: 12px
  md: 18px
  lg: 24px
  xl: 32px
  xxl: 36px
  pill: 9999px
spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  screen-x: 18px
  screen-top: 56px
  bottom-safe: 24px
components:
  app-shell:
    backgroundColor: "{colors.canvas}"
    color: "{colors.ink}"
    font: "{typography.family}"
  brand-wordmark:
    color: "{colors.brand-green}"
    font: "{typography.brand}"
  primary-button:
    backgroundColor: "{colors.brand-green}"
    color: "{colors.canvas}"
    borderRadius: "{rounded.pill}"
  bottom-nav:
    backgroundColor: "{colors.overlay}"
    activeBackgroundColor: "{colors.tab-active}"
    borderRadius: "{rounded.xxl}"
  card:
    backgroundColor: "{colors.surface}"
    borderColor: "{colors.border}"
    borderRadius: "{rounded.lg}"
  job-card:
    backgroundColor: "{colors.surface}"
    borderColor: "{colors.border}"
    borderRadius: "{rounded.xl}"
  progress-bar:
    activeColor: "{colors.brand-green}"
    trackColor: "{colors.border}"
  input:
    borderColor: "{colors.border}"
    errorColor: "{colors.danger}"
  status-chip:
    submittedColor: "{colors.brand-green}"
    pendingColor: "{colors.warning}"
---

## Overview
Sorce is a mobile-first iOS job application product with a bright, sparse, utility-driven interface. The screenshots show an app, not a web landing page: the design language is dominated by white space, oversized native-style typography, a vivid green brand accent, rounded cards, swipeable job surfaces, and a persistent floating bottom navigation.

The core rhythm is simple: top status area, centered or left-aligned screen title, one main task per screen, then a large green bottom action. Onboarding screens use a progress bar and a single decision path. Logged-in screens use a centered green Sorce wordmark, circular utility buttons, content cards, and the bottom tab bar.

Design from evidence, not brand invention. Visible screens include splash, auth sheet, onboarding/profile setup, resume upload choice, job-type selection, rating prompt, paywall, feed swiping, applications summary, application detail, feedback chat, inbox, and profile/resume management.

## Colors
Use {colors.canvas} as the dominant surface. Most screens are nearly pure white, with content separated by {colors.border}, not heavy fills. Avoid dark app chrome.

Primary brand actions use {colors.brand-green}. It appears in the wordmark, progress fill, primary buttons, active tabs, selected cards, success states, icons, and application status dots. For soft emphasis use {colors.brand-green-soft} and {colors.brand-green-faint}, especially behind checkmarks, upload icons, and submitted status banners.

Text hierarchy is high contrast: primary copy uses {colors.ink}; helper text, timestamps, inactive labels, and secondary metadata use {colors.text-muted} or {colors.text-subtle}. Borders and dividers are quiet {colors.border}.

Secondary semantic colors are pastel and restrained. Use {colors.warning} with {colors.warning-soft} for pending and savings badges, {colors.danger} with {colors.danger-soft} for pass/error states, {colors.info} with {colors.info-soft} for remote/work arrangement chips, and {colors.lavender-soft} or {colors.peach-soft} only for category chips visible on job cards and inbox filters.

Do not reintroduce the old landing-page palette, dark hero/video treatment, or grey-heavy web navigation. The app identity is white, green, black, and softly tinted status chips.

## Typography
Use the native Apple system stack from {typography.family}. The supplied screens look like iOS SF Pro, with no evidence of Inter or Biotif in the app UI. Keep letter spacing at `0`.

The Sorce wordmark uses {typography.brand}: green, centered, serif-like, and visually distinct from the rest of the UI. It is not the same typeface as titles.

Screen-level onboarding titles use {typography.hero} or {typography.title}. They are large, bold, black, and usually left aligned with generous line height: examples include "Ready? 4 million jobs are waiting for you", "No more searching, just swiping", "Let's build your profile", and "What type of jobs are you looking for?".

Section titles and dashboard headings use {typography.section}. Form values, card titles, nav labels, and body copy use {typography.body}. Emphasized labels and CTA text use {typography.body-strong}; small chips, timestamps, tab labels, and validation text use {typography.caption} or {typography.label}.

The app tolerates large type but not dense paragraphs on task screens. Long explanatory text belongs in scrollable detail cards, application descriptions, and profile summaries, never in the initial onboarding hero area.

## Layout
Design for a 390px-wide iPhone viewport first. Use {spacing.screen-x} to {spacing.lg} horizontal gutters and keep the status bar area visually clear. Screens with the Sorce header center the wordmark at the top and place utility controls in circular buttons at the left or right edges.

Onboarding screens use a vertical task layout: progress row near the top, large title, short helper text, optional illustration or form region, then a sticky full-width primary action near the bottom safe area. Keep large blank space intentional; most onboarding screenshots place the main illustration or icon around the visual center and reserve the bottom for the CTA.

The swipe feed uses stacked oversized job cards, partially offset and rotated. Cards can extend beyond the viewport edges during swipe states. The action button floats above the bottom nav as a circular green heart for apply/save or a red circle with an x for pass.

The bottom navigation is persistent on authenticated screens. It is a floating rounded pill with five tabs: Feed, Feedback, Applications, Inbox, Profile. Active tabs sit inside a grey pill background using {colors.tab-active}; inactive tabs are black outline icons with labels. Keep the nav above the iOS safe area and avoid content being hidden behind it.

Dashboard screens use card stacks and two-column metric summaries. Detail screens are scrollable, with a fixed top brand header and a visible scroll indicator when content exceeds the viewport. Form-heavy screens use full-width field rows or cards with light borders.

## Elevation & Depth
Depth is soft and iOS-like. Most elements rely on borders, translucency, and spacing rather than strong shadows.

Use a low shadow for floating controls, bottom nav, selected profile cards, and auth sheets: `0 10px 30px rgba(17, 17, 17, 0.08)`. Use a smaller card shadow sparingly: `0 2px 10px rgba(17, 17, 17, 0.05)`. Job swipe cards can use slightly stronger depth, up to `0 16px 36px rgba(17, 17, 17, 0.12)`, because the stacked-card interaction depends on layering.

The auth sheet uses a blurred translucent surface over a dimmed/blurred background. The bottom nav similarly uses {colors.overlay} with a subtle blur. Avoid heavy elevation on standard form fields and list rows.

## Shapes
Rounded geometry is central to the app. Primary CTAs are full-width pills using {rounded.pill}, usually around 64px tall. Circular utility buttons are 52-64px squares with {rounded.pill}. Bottom navigation is a long floating pill using {rounded.xxl}.

Cards use {rounded.lg} or {rounded.xl}; the largest job cards and auth/paywall plan cards use {rounded.xl}. Selected profile-upload cards have a green border and rounded rectangle shape, not a filled background.

Inputs are mostly underline-style in onboarding forms and card-style in profile/application details. Search fields are large rounded rectangles with a pale grey fill and left icon. Chips are pill-shaped and compact.

Do not use sharp rectangular controls. Also do not over-round content cards into cartoon shapes; reserve extreme pill radius for buttons, nav, chips, and circular icon controls.

## Components
**App shell:** Full-screen {colors.canvas} with native iOS safe-area spacing. No sidebars, no desktop navigation, no gradient hero sections.

**Sorce wordmark:** Centered green brand label using {typography.brand}. It appears on splash and authenticated screens. Keep it visually lighter and friendlier than the rest of the bold UI.

**Progress header:** Thin horizontal track near the top. The active segment uses {colors.brand-green}; the inactive track uses {colors.border}. Some steps include a back chevron at left. The bar is flat, straight, and minimal.

**Primary CTA:** Full-width green pill using {components.primary-button}. Text is white, bold, and centered. Disabled state uses a pale green fill with low-contrast white text, as seen when the phone field is required.

**Auth sheet:** Rounded bottom sheet over blurred content. Header says "Sign in to continue"; social buttons are large pills. Apple button is black with white content, Google and phone buttons are white with subtle shadows. Legal copy sits at the bottom with underlined links.

**Onboarding illustration:** Minimal single-color or soft-tint illustration. Examples include thumbs-up outline, green check badge, document upload icon, and phone/job-card mockup. Keep illustrations centered and sparse.

**Form rows:** Label above value with a thin divider. Active underline can darken; invalid state changes underline and helper text to {colors.danger}. Phone input uses a compact country-code segment and a separate number field.

**Search field and selected chips:** Job-type search uses a large rounded grey search field with icon. Resume-derived selections use grey pill chips with small circular x buttons.

**Profile setup cards:** Two large option cards. Recommended upload card has a green border, green upload icon inside a soft green circle, and a green "RECOMMENDED" pill at the top-right. Manual option is a white card with soft shadow and a simple pen icon.

**Job preview grid:** On the "4 million jobs" onboarding screen, use horizontally clipped mini cards in a grid. Cards have light borders, initials/logo circles, truncated job titles, company names, and intentionally blurred metadata placeholders.

**Swipe job card:** Large white card with rounded corners, company logo, role title, company name, location, chips, and job description. Apply/pass stamps are outlined overlays rotated across the top. Include a small arrow/expand circular control near the top-right.

**Feed action controls:** Main action is a circular floating button near the lower card edge. Apply uses green with a white heart/check-like symbol; pass uses red with a white x. Keep it independent from the bottom nav.

**Bottom navigation:** Floating translucent pill with five icon+label tabs. Active state uses {colors.tab-active}; icon becomes filled/strong black while the label remains black. Labels are short and visible.

**Applications summary:** Two metric cards for Submitted and Pending, followed by a list card with rows for saved, passed, and failed applications. Recent applications use a bordered card with status banner, logo circle, job title, and company.

**Application detail:** Header card shows status dot, role, company, logo, applied date, and green job-description link. Timeline events use green circular check icons connected by a thin vertical line. Application fields are bordered cards with labels, values, and trailing ellipsis menus.

**Feedback chat:** Top has centered wordmark, a phone/call utility button, and segmented tabs. Active tab uses green text and underline. Chat bubble is left-aligned, rounded, pale grey, and followed by a small timestamp. Composer is a pale rounded input above the bottom nav.

**Inbox:** Search bar at top with hamburger icon and settings icon inside a rounded grey field. Category chips are large pills: active Primary is dark muted purple; Verification, Interview, and Offer use pastel fills. Message rows are sparse with sender initial, sender/title, preview text, timestamp, and star icon.

**Profile:** Header title "Profile" with settings button. Credit card shows swipe count, lightning icon, and chevron. Completion card contains circular progress, title, helper text, and green button. Profile tabs use icons and a green underline for active state. Resume/experience cards use light borders, logo placeholders, body text, and ellipsis menus.

**Paywall:** Full-screen modal with close button, headline, tilted job-card artwork over a soft green/yellow glow, two selectable pricing cards, and footer links. Selected plan uses green border and check circle; unselected plan uses grey border and optional savings badge.

## Do's and Don'ts
Do use {colors.brand-green} as the only dominant accent across buttons, progress, selected states, success states, and brand wordmark.

Do keep screens sparse. Large blank areas are part of the observed app style, especially during onboarding and rating prompts.

Do use native iOS typography and control proportions. Buttons, sheets, tab bars, and keyboards should feel like they belong on iPhone.

Do keep all repeated cards lightly bordered with {colors.border}, white interiors, and subtle shadows only where floating behavior is visible.

Do use pastel semantic chips for job attributes, inbox filters, statuses, and pricing badges.

Don't recreate the original landing-page DESIGN.md: no cinematic video hero, no desktop header navigation, no dark overlay, and no marketing-style event cards.

Don't expose real user profile data from screenshots in examples. Treat names, emails, phones, resumes, and summaries as user content, not fixed design copy.

Don't invent unseen app flows, hidden settings screens, or official brand claims. Only describe components visible in the supplied screenshots.

Don't use purple/blue gradients, decorative blobs, dense marketing sections, or card-inside-card layouts. The app is restrained, mobile, white, and task-focused.

## Implementation Notes
Frontend technology should be React Native or SwiftUI for a production iOS app; if this is recreated for web/prototyping, use Next.js with React and CSS variables that map exactly to the YAML tokens above. For this repository's extension context, the `DESIGN.md` should be treated as a target design specification, not as evidence from a public webpage crawl.

Use a mobile-first component architecture: `AppShell`, `TopBrandHeader`, `ProgressHeader`, `PrimaryButton`, `BottomNav`, `SwipeJobCard`, `StatusChip`, `ProfileCard`, `ApplicationSummaryCard`, `ApplicationDetailField`, `AuthSheet`, and `PaywallPlanCard`.

Keep accessibility intact. Primary green buttons need white bold text at sufficient size; inactive helper text must remain readable. Icon-only utility buttons require accessible labels. Swipe actions need non-gesture alternatives.

Respect safe areas: top content should clear the iOS status bar, and bottom CTAs/nav should sit above the home indicator. Scrollable screens need enough bottom padding so the floating nav does not cover content.

Use real app icons or a consistent outline icon set. Icons in the screenshots are bold black outlines with rounded stroke endings; selected tab icons become filled or visually heavier.

Motion should be functional: swipe cards translate/rotate with spring easing; stamps appear during threshold states; onboarding steps can crossfade or slide horizontally; bottom nav active state can ease over 160-220ms. Avoid decorative motion.

Form validation should be explicit but calm. Required phone state uses {colors.danger} for underline and helper text; disabled CTA uses a pale green fill. Never submit personal data until required fields pass validation.

For privacy and security, never hardcode personal data from the screenshots. Profile fields, application details, inbox messages, and resume filenames must be dynamic user data and redacted in logs, analytics, test fixtures, and generated documentation.
