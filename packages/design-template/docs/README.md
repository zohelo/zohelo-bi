The zohelo design template is the one visual system for every zohelo product: bi.zohelo.com (dashboards), data.zohelo.com (datasets and API) and zohelo.com (the public site), plus any tool added later. It works like a company presentation template: a brand kit, master layouts, a dashboard system, a chart library, components, and the rules for building and testing them. Use what is here; do not invent a new look per product.

## Principles

1. **The number first, then the evidence.** Every page leads with what a reader came for (a value, a trend, a dataset), then shows how it was measured and where it came from.
2. **One accent, many data colours.** `accent` (#1E4E8C) is the only UI colour. Data colours (`series-*`, `seq-*`, `div-*`) appear only in charts and never on buttons, links or text.
3. **Neutral, not judgemental.** Changes are shown with an arrow and `ink-2` text (▲ 0,3 pp r/r). Green/red are never used to say a value is good or bad.
4. **Every value can be read without colour, hover or a mouse.** Legends for 2+ series, direct labels where possible, a Wykres | Tabela toggle on every chart, keyboard access everywhere.
5. **Same skeleton everywhere.** The app shell (sidebar + top bar + content) is used by every section of bi.zohelo.com and data.zohelo.com. zohelo.com uses the site shell (top navigation, no sidebar) with the same header, footer, tokens and components.
6. **Design before code.** No visual work starts in code without a mockup in this template (see Development and testing).

## How to use this template

- **Building a page:** pick the shell (Page layout), pick the page type, then fill the content area from the Dashboard rules and the Chart library. Start from the templates in the Templates group of Components.
- **Colours, type, spacing:** use tokens only, by name (`ink-2`, `space-4`, `radius-xl`). A hex value in product code is a defect.
- **Charts:** choose by what the chart must show (change over time, ranking, deviation, part of whole, distribution, relationship, single value). Each chart type has a card with when to use it and what to avoid. The kit script `kit/zchart.js` draws every type from sample data as the visual reference.
- **Logos and images:** use the files in Assets → Logos and Backgrounds. Never redraw the mark.

## Content fundamentals

Product copy is Polish (English version via PL | EN). Write as a careful statistician talking to a curious adult: plain, exact, no hype.

- **Titles state the finding**, subtitles state the measure: "Inflacja w paśmie celu od 2024" / "HICP r/r, %, miesięcznie, 2016–2026". Not "Wykres inflacji".
- **Sentence case** everywhere ("Pobierz dane", not "Pobierz Dane"). No exclamation marks, no emoji.
- **Address the reader impersonally or with plain imperatives** on controls: "Pobierz dane", "Pokaż tabelę", "Przejdź do treści".
- **Numbers:** decimal comma (2,9%), thin or normal space for thousands (37 490), units after the number with a space except % (4,26 zł, 845 mld €, 2,9%), percentage points as "pp". Months abbreviated lowercase (wrz 2026). Ranges with an en dash (2016–2026).
- **Every number has a period and a source** next to it: "wrz 2026 · Eurostat".
- **Symbols get a spoken form.** ▼ 0,1 pp m/m is shown, and "spadek o 0,1 punktu procentowego w porównaniu z poprzednim miesiącem" is what screen readers hear (see Accessibility).
- **Coming soon** is "wkrótce". Sample data is always labelled "Dane przykładowe".

## Visual foundations

- **Colour:** neutrals `canvas` (page), `surface` (cards), `line` (borders); text `ink` > `ink-2` > `ink-3` > `ink-muted` (metadata only). `accent` for primary actions, links, focus and the active nav item (with `accent-tint` fill and a 3px `accent` bar). Status tags use their reserved `status-*` pairs and always carry a word.
- **Type:** Inter Tight for display (`page-title`, `kpi-value`, `display-hero`), Inter for everything else. Body `body` 14/22. Hero numbers use proportional figures; columns of numbers use `tabular-nums`.
- **Spacing and grid:** 4px base (`space-1` … `space-16`). Content grid 12 columns, 16px gap; desktop gutter 32px, phone 16px. Cards pad 18–20px.
- **Shape:** cards `radius-xl` (10px) with a 1px `line` border and no shadow. Controls `radius-md` (6px). Tags and chips `radius-pill`. Shadows only on floating layers (menus, dialogs, drawer).
- **States:** hover `surface-muted`; focus 2px `focus` ring with 2px offset (search fields ring the whole field via `label:focus-within`); active nav `accent-tint` + bar; disabled/unavailable `ink-muted` text, `ink-disabled` icon, not focusable.
- **Motion:** none required. If used, 150–200ms ease-out for menus and drawer, and nothing moves under `prefers-reduced-motion: reduce`.
- **Dark theme:** not yet defined. Do not ship a dark mode until it is designed and validated here.

## Iconography

Line icons, 18px, 1.5px stroke, round caps and joins, drawn in `ink-3` (inactive) or `accent-strong` (active). Icons are inline SVG with `aria-hidden="true"`; the control carries the name. Icons never appear without a text label, except in the collapsed sidebar rail, where each icon has a tooltip and `aria-label`. No emoji, no icon fonts.

## Where things are

| Need | Section or group |
| --- | --- |
| Logo variants, favicon, social image, backgrounds | Brand kit; Assets → Logos, Backgrounds |
| Shells, header, sidebar, footer, page types, breakpoints | Page layout |
| KPI row, chart cards, filters, dashboard order | Dashboard |
| All 21 chart types, colour jobs, marks, formatting | Chart library |
| Buttons, inputs, tags, menus, tables, states | Components (and their cards) |
| Accessibility requirements | Accessibility |
| Definition of done, mandatory tests | Development and testing |
| Which portal uses what | Portals |
