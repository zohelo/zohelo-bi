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

## Page sections and density

- A dashboard page is one scrolling page split into sections (h2). The sticky page header holds the title,
  "Pobierz dane" (primary) and the section buttons (`StickyPageHead`, `apps/portal/src/tpl/ui/SectionNav.tsx`); it
  never leaves the screen. The lead and the filter bar sit below it and scroll away. Buttons scroll smoothly
  (instantly with reduced motion), move focus to the section heading and mark the section being read with
  `aria-current="location"`. Sections are not listed in the sidebar.
- Sections are sized to the window ("screens", `.t-screen`): the KPI row shares the first screen with the first
  section; every further section fills the window between the sticky header and the footer. Card rows share that
  height and line, column and area charts grow into it (`ZChart fill`), so pair cards of similar height in a row (a
  tall map next to a list chart leaves space under the list). On phones sections take their natural height.
- Density: cards 14/16 px padding, grid gap 12 px, sections 16 px apart, section headings 18 px.

## Owner review 2026-11-03

Rules from the owner's review of the template portal (commit 493a8cf). The guide pages (Przewodnik → Układ strony,
Menu boczne, Pulpit, Komponenty, Dostępność) describe the same rules with live examples.

- **Sidebar** (`AppShell`), in this order: Strona główna (Home), Eksplorator danych (Data explorer), Katalog danych
  (Data catalogue), Dashboardy (Dashboards), Przewodnik (Guide). Dashboardy expands to the 12 domains: a domain name
  is a link to its overview ("Przegląd" / "Overview"), the chevron next to it ("Rozwiń: <domain>", `aria-expanded`)
  expands its pages. Przewodnik expands to Wprowadzenie and four groups (Podstawy, Układ i nawigacja, Wykresy i
  treści, Jakość i dane; `GUIDE_GROUPS` in `guide/sections.ts`). No separate "Metodologia i źródła" item (it is a
  guide page and a footer link), no DZIEDZINY / MOJE headings, no sample badge, no PL | EN in the sidebar.
- **Sidebar footer**: one row, `--foot-h` (48 px), "zohelo bi · wersja 0.9", level with the canvas footer.
- **Rail**: `--rail-w` 72 px (was 64 px); the 60 px brand row holds the logo mark and the expand button side by side.
  Below 1280 px the rail is automatic; below 768 px the sidebar is a 308 px drawer.
- **Search** (`SideSearch`, `search.ts`): typed directly in the sidebar field; matches (dashboards, indicators, guide
  pages) appear in a list right under it (combobox + listbox; arrows and Enter, Esc clears). Ctrl K focuses it; in
  the rail a search button opens the field in a panel beside the rail. There is no command palette any more.
- **Top bar** (60 px, `HeaderTools`): breadcrumb on the left; on the right the data date and version ("Dane z
  24.10.2026 · wersja 0.9"), the language menu (flag + code; menu with Polski / English and flags) and the account
  button "Zaloguj się". Accounts are announced, not built: free public access stays; saved views, alerts and team
  plans come later. No Share / Udostępnij, no Copy link and no Download in the top bar.
- **Page actions**: "Pobierz dane" (primary) sits in the page header in the canvas; on dashboards in the sticky
  header next to the title.
- **Canvas**: full width (no 1184 px maximum). The footer is sticky at the bottom of the window and carries the ONE
  sample-data notice ("Dane przykładowe: wszystkie wartości są syntetyczne"), the sources and a Metodologia link; a
  10 px canvas strip above it keeps content off the footer, and padding keeps content off the sticky header.
- **Dashboards**: sticky header = title + Pobierz dane + section buttons; lead and filters below scroll away. No
  page-level period control: each time chart has its own period select in the card tools ("Domyślny okres, 1 rok,
  5 lat, 10 lat, Cały okres"); the YAML `period` filter is ignored (docs/dashboards.md). Sections are sized to the
  window (see above). The domain overview has no "Obszary" list (the sidebar lists the pages). The card menu "…"
  holds only real actions (Pobierz CSV, Strona wskaźnika); no "Kopiuj link".
- **Home** "/" is "Strona główna" / "Home" (being redesigned separately).

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
- Screen reader workflow: under automation VoiceOver stops after the lead sentence of a template domain dashboard (/d/economy/prices); NVDA reads the page to the chart and its Wykres/Tabela toggle. The VoiceOver check for that flow is `fixme` until investigated.
