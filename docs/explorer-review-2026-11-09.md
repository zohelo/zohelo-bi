# Explorer review, 2026-11-09

Independent review of explorer v4 (`/explore`) by the `ui-ux-designer` agent against the owner's 11 points of
2026-11-06 and design brief §4.2. Local build, Playwright at 1440×900, 1336×680, 768, 390, PL and EN. axe clean on
10 states. Owner's own comments for the next round are still to come; merge them with this list.

## The 11 points

| # | Requirement | Status |
|---|---|---|
| 1 | Measures / Dimensions collapsible, collapsed by default | met |
| 2 | SSAS-style dimension tables, hierarchy or level, union of dimensions | partly: no drill by clicking the chart; Geografia "+" goes to small multiples and picks areas the user never chose; 48 tables in a flat list |
| 3 | Wells per chart, X axis always possible | mostly: small multiples missing on 10 kinds; segmented bar has no axis |
| 4 | 35 kinds, not greyed out without reason | met, but nothing warns about invalid charts (see A1) |
| 5 | "Placed by the chart" removed | met |
| 6 | Automatic business title and subtitle | met; finding line leaks codes "(PL-14–PL-12)" |
| 7 | Catalogue aligned with canvas | met at 1440; at 1336 the catalogue drops below everything |
| 8 | Blank default | met |
| 9 | Edit vs view mode | met |
| 10 | One screen from 1336×680 | not met: page 1712–2258 px tall, chart below the fold |
| 11 | Copy formats with title, legend, source | met |

## Findings, most severe first

1. **Statistically invalid charts drawn without warning**: waterfall of monthly average wages sums to "Suma
   89 607 zł"; stacked/segmented of averages; bridge with months as drivers; lines joining voivodeships as a
   sequence. `additive()` (`explore/layout.ts:42`) is only used for recommendations. Fix: issues in
   `layoutIssues()` on the well (keep "never greyed out"), suppress totals, line/area/bump need a time X axis,
   bridge drivers only breakdown dimensions.
2. **Chart switch rewrites the selection, no undo**: Columns → Map → Columns loses "Polska"; every edit uses
   `history.replaceState` (`pages/Explore.tsx:183`). Fix: snapshot/restore in `arrange`, `pushState` for chart
   and well changes, "Cofnij" button + Ctrl+Z.
3. **One screen fails at 1336×680**: `@container (min-width: 1080px)` (`explore3.css:21,86`) is missed (1024 px
   container); `max(560px, …)` floor (`:88`) taller than available. Fix: breakpoint 1000 px, floor 400 px, no
   catalogue column under 1200 px, ask box in the header row, compact AskResult and drill bar.
4. `.zt-sr` text escapes the catalogue scroll box (~600 px blank scroll): `position: relative` on
   `.x3-grid--fit .x3-zone__body`.
5. Chart picker 560 px wide on a 390 px phone, close button off-screen (`explore3.css:591`).
6. Opening Wymiary under an open Measures tree shows nothing visible: sticky section headers or scroll on expand.
7. On phones the chart starts on the second screen (y≈1050); help text says "po lewej". Chart first, wells behind
   a "Pola wykresu (n)" toggle.
8. Map defaults put time in small multiples: 6 maps, page 2834–3608 px. Time → latest-period filter.
9. Geografia "+" targets small multiples with unchosen areas; should go to X and select all 16 voivodeships.
10. Counts contradict: chip "Miesiąc (57)", 40 bars drawn, title "cze 2023–wrz 2026". Say "pokazano 40 z 57".
11. Ask box loses the question and does not highlight the wells it filled.
12. Labels cut off: line end label "Pols…", waterfall "mar 20…".
13. English copy uses Polish quotes „…” (`shell/SideSearch.tsx:44`, answer card).
14. 48 dimension tables in one flat list: group them.
15. Phone tap targets 24–32 px below the project touch height.
16. Downloads appear twice (header and Kopiuj menu).

## Keep

Keyboard parity for every drag ("Dodaj do…" dialogs with reasons, focus return, live region), focus ring on every
Tab stop, copy outputs, guidance on the canvas, URL state, view mode, business titles, the SSAS model in
`model.ts`.

## Top three

1. Statistical guardrails (1). 2. No selection rewrite on chart switch + undo (2). 3. Vertical layout budget for
   1336×680 and phones (3, 4, 7).
