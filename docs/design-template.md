# zohelo design template: development and testing

The zohelo design template is the one visual system for bi.zohelo.com, data.zohelo.com and zohelo.com. Its source of truth is the design system "zohelo design template" on claude.ai (brand kit, page layout, dashboard, chart library, components, accessibility). The full-size templates are on the Design canvas "bi.zohelo.com redesign" (row "Docelowy układ") and, as static pages, in `apps/portal/public/mockups/` (preview: the `design/redesign-mockups` branch deploy). Code-side files: `packages/design-template/`.

This page is the copy of the template's development and testing rules that applies to this repository.

Rules for anyone (person or agent) building UI for a zohelo product.

## Who does what

- **Designer** works only in the template (Design canvas and this system), with sample data, and owns how it looks.
- **Domain expert** supplies the content: which KPIs, their definitions, sources, which charts answer which questions.
- **Developer** builds from an approved mockup. **No visual work in code without a mockup in this template.** A developer who needs a pattern that does not exist asks the designer to add it here first.

## Building

- Use tokens by name (CSS custom properties generated from `tokens.json`); no hex values, font sizes or radii typed into components.
- Use the components and chart types as specified; deviations are added to the system first, then built.
- Charts come from `packages/visuals` (bi) and follow the Chart library rules; `kit/zchart.js` is the visual reference, not production code.
- Every chart has a table view, a one-sentence `aria-label`, a phone variant and a source line.
- Copy follows Content fundamentals (Polish, decimal comma, units, sentence case).

## Definition of done for any UI change

A change is done only when every item below is true and the evidence is in the pull request.

| Check | How | Pass |
| --- | --- | --- |
| Mockup exists | Link to the Design canvas board | Approved by the designer |
| Automated accessibility | axe-core (WCAG 2.0/2.1/2.2 A+AA + best practice) on every changed page, at 1440, 768 and 390px | 0 violations |
| Focus ring | Script tabs through the page and checks every stop shows a visible ring (outline or `focus-within`) and is visible on screen | Every stop passes; no dead links in the tab order |
| Widths | Load at 1280, 1024, 768, 390px | No horizontal page scroll; chart text 11px or more on screen; screenshot of each attached |
| Eyes on screen | A person or agent looks at the 1440 and 390 screenshots | No overlaps, clipped text, labels colliding, empty space; defects fixed |
| Chart rules | dataviz palette validator for any new colour; check against Chart library and its anti-patterns | Validator passes; no anti-pattern |
| Real screen readers | Screen reader workflow: NVDA + Chromium (Windows) and VoiceOver + WebKit (macOS) via Guidepup on key flows; spoken transcripts attached | Key announcements present (names, roles, states, chart descriptions) |
| Visual regression | Screenshot comparison against the approved mockup | Differences explained |
| Human audit | Paid audit with screen-reader users | Before public launch and once a year |

axe-core, focus, widths and screenshots run in CI on every pull request and block merging. The screen-reader workflow runs on every UI pull request and is reported but does not block until it has been stable for two weeks.

## What automated tests cannot tell you

axe-core finds about a third of accessibility problems; it does not see a hidden focus ring, a confusing reading order or a chart nobody can understand. Real screen-reader runs show what is announced, not whether it makes sense. That is why the eyes-on review and the human audit are part of done.

## Commands (zohelo-bi)

- `bun run test:ui` — axe, focus ring and widths on the mockups and built pages (Playwright).
- `cd tests/screen-reader && npm run nvda` / `npm run voiceover` — local real screen-reader runs (Windows / macOS only).
- Palette: `node <dataviz skill>/scripts/validate_palette.js "<hex,…>" --mode light`.

## Known issues

- Screen reader workflow: under automation NVDA speaks nothing on the Charts documentation board (a long page with no focusable element); VoiceOver reads it. The NVDA check for that board is marked `fixme` until investigated. All dashboard (Shell) flows pass on both screen readers.
