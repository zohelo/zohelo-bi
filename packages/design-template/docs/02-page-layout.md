# Page layout

Two master layouts share one header language, one footer and one set of tokens.

## App shell (bi.zohelo.com, data.zohelo.com, tools)

```
┌──────────────┬───────────────────────────────────────────────┐
│ Sidebar 256  │ Top bar 60: breadcrumb · page actions         │
│ logo         ├───────────────────────────────────────────────┤
│ search       │ Page header: h1, lead, period / view controls │
│ primary nav  │ Page tabs (optional)                          │
│ domains      │ Content (max 1184, 12-col grid, gap 16)       │
│ my items     │                                               │
│ methodology  │                                               │
│ sample · PL  │ Footer (thin): source note · version · links  │
└──────────────┴───────────────────────────────────────────────┘
```

- **Sidebar** (`sidebar-w` 256px, `surface`, right border `line`): brand row with collapse button; search with Ctrl K hint; primary nav (Przegląd, Eksplorator, Katalog); group label "DZIEDZINY" with domains that have data, the active one expanded to its pages; one "Wkrótce: N dziedzin" row for empty domains; "MOJE" (Zapisane widoki, Obserwowane); bottom: Metodologia i źródła, sample-data badge, PL | EN. Full rules: the Sidebar component card.
- **Top bar** (`header-h` 60px, `surface`, bottom border): breadcrumb that repeats the sidebar position, and page-level actions on the right (Udostępnij secondary, Pobierz dane primary). On phone it holds the menu button and the primary action only.
- **Page header:** h1 in `page-title`, one-sentence lead in `body-l` `ink-2` that states the main finding, and the period control (1 rok | 5 lat | 10 lat | Max) right-aligned.
- **Page tabs:** links (`aria-current="page"`), not ARIA tabs, because each tab is its own URL. Max 5.
- **Content:** 12 columns, 16px gap, max 1184px, gutter 32px (16px on phone).
- **Footer (app):** one line under the content: "Dane: Eurostat, GUS, NBP, Bank Światowy · Metodologia · Wersja danych 2026-10-24 · Kontakt".

## Site shell (zohelo.com)

Top header 64px: lockup, primary nav (bi, data, O projekcie, Metodologia), language switch, one primary button ("Otwórz pulpity"). Content max `site-max` 1280px. Full footer on `surface-inverse` with the reversed logo, three link columns (Produkty, Dane i metodologia, Projekt), source attribution and licence line. Whether data.zohelo.com needs the sidebar or the site shell for its landing page is open; dataset pages use the app shell.

## Responsive behaviour

| Width | Sidebar | Content |
| --- | --- | --- |
| ≥ 1280px | expanded 256px | KPI tiles 4 per row, chart rows 2:1 or 1:1 |
| 1024–1279px | icon rail 64px with tooltips | KPI 2 per row, chart rows stack to one column |
| 768–1023px | icon rail | as above |
| < 768px | hidden; menu button opens a 308px drawer over a `scrim` | one column, KPI 2 per row without sparklines, 44px controls, phone chart variants |

The page never scrolls sideways at any width. Wide tables scroll inside their own container.

## Page types

| Type | Used for | Skeleton |
| --- | --- | --- |
| Dashboard | A domain or topic overview (Ceny i inflacja) | Page header, tabs, KPI row, chart rows, footer note |
| Indicator | One indicator (Inflacja HICP) | Breadcrumb, hero number with period and change, main chart with band, ranking, other sources table, methodology list, citation, related indicators |
| Explorer | Free comparison | Query bar of filter buttons with popovers (indicators, area, dimensions, period, chart), chart at full width, CSV + saved views |
| Catalogue | Finding indicators | Search, filter chips (Dziedzina, Częstotliwość, Źródło, Zasięg), dense rows with sparkline, latest value, coverage, sources |
| Dataset (data) | One dataset | Title, description, freshness tag, coverage, download formats, API snippet, variables table, licence and citation |
| Article / landing (site) | zohelo.com pages | Site shell, hero claim + KPI tiles, sections of cards |
| Documentation | Methodology, API docs | App shell, left sidebar as table of contents, prose max 72ch |
| System pages | 404, error, maintenance | Shell kept; plain message, what to do next, link to search |

## Info, freshness and refresh

- Every page shows when its data was last loaded ("Dane z 24 paź 2026") in the footer note; every chart card shows its source and, where relevant, the next release.
- Status tags (Aktualne, Wstępne, Zrewidowane) describe the data, never its value. See the StatusTag card.
- There is no manual "refresh" button for readers: data updates on publication. A tool that queries live data shows "Odśwież" as a secondary button with the last-run time next to it.
- "Dane przykładowe" badge is mandatory while any value on the page is synthetic.
