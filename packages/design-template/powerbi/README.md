# zohelo design template for Power BI

The bi.zohelo.com layout and tokens as a Power BI report template: a report theme, page backgrounds with the app
shell, and the grid positions of every card. Everything here is generated from `../tokens.json` by `build.mjs`;
do not edit the outputs by hand.

| File | What |
| --- | --- |
| `zohelo.theme.json` | Report theme: palette, text classes, chart-card container on every visual, axes, legend, tables, slicers. |
| `backgrounds/shell.svg` | Page background with the app shell only (sidebar, top bar, footer, canvas). Use it with the theme. |
| `backgrounds/layout-dashboard.svg` | Shell plus the card slots of the dashboard layout (KPI row, 8 + 4, 6 + 6). |
| `backgrounds/layout-analysis.svg` | Shell plus filter row, main chart 9 and side panel 3. |
| `backgrounds/layout-detail.svg` | Shell plus filter row and one full-width table or matrix. |
| `backgrounds/tooltip.svg` | 320 × 240 report-page tooltip. |
| `layouts.json` | Exact x, y, width and height of the shell zones and of every slot, in pixels of the 1280 × 720 page. |
| `build.mjs` | Regenerates all of the above, plus a PNG copy of each background (not committed): `node packages/design-template/powerbi/build.mjs`. |
| `check.mjs` | Checks the theme against Microsoft's theme schema 2.159, strictly: `node packages/design-template/powerbi/check.mjs`. |

## Using it in Power BI Desktop

1. View → Themes → Browse for themes → `zohelo.theme.json`.
2. Page: Canvas settings 16:9 (1280 × 720). Canvas background → Image → `backgrounds/shell.png` (or the `.svg`), Image fit
   **Normal**, transparency 0 %. Use a `layout-*` image while placing visuals, then switch to `shell`. Prefer the PNG
   copies from `build.mjs`: some Power BI versions crop SVG canvas backgrounds.
3. Sidebar (x 0–208): report or client logo in the brand row (16, 12, 176 × 32); a vertical **Page navigator** in the
   navigation zone (12, 64, 184 × 612). Top bar (y 0–48): breadcrumb text left, data date and version right.
4. Canvas: page title and one-sentence finding as text boxes in the header zone, then visuals on the slots of
   `layouts.json`. Every visual already looks like a chart card (white, 1 px border, radius 10, no shadow).
5. Footer (y 692–720): one text box with the sources, the data date and the methodology link.

## zohelo rules, translated to Power BI

| zohelo rule (docs/) | In Power BI |
| --- | --- |
| Card title states the finding; subtitle gives measure, unit, frequency, range | Visual title (on by theme) and Subtitle (on by theme); write a finding, not the field name |
| Source line under each chart | A text box under the visual or the footer; the theme cannot add it |
| One hero colour; Polska / the subject is `series-1`, the rest `series-context` | First data colour is the hero; set comparison series to data colour 6 (context grey) |
| No pie, donut, gauge, 3D, radar, dual axis | Use 100 % bars, a treemap, a bullet chart (Deneb or a column + target line), or two charts |
| KPI tile: value, period, neutral change with ▲/▼, one line of context; no gauges | New Card visual: value in callout size, label above, reference label with the change; no conditional red/green unless the KPI has a polarity |
| Variances (IBCS, Zebra BI style) coloured by polarity only | `good` / `bad` theme colours, applied through conditional formatting on a polarity-aware measure |
| Gridlines: horizontal only, solid 1 px, light | Value-axis gridlines on, category gridlines off (theme) |
| Legend under the chart for 2+ series; direct labels when possible | Legend bottom left (theme); prefer data labels and hide the legend for 1–3 series |
| Summary before detail; max 4 KPI tiles and 6 charts above the detail table | `layout-dashboard` for overviews, `layout-detail` for the table on its own page |
| Sample-data badge while values are synthetic | Text box "Sample data: all values are synthetic" in the footer of demo reports |

## Fonts

The template's Inter is not one of the Power BI service fonts, so the theme uses Segoe UI (Semibold for titles and
values). Text sizes follow the tokens converted to points (`card-title` 16 px = 12 pt, `caption` 12 px = 9 pt,
`kpi-value` 30 px = 22.5 pt).

## Data

Demo reports read the career-desk Gold tables of zohelo-data (Epic zohelo/zohelo-data#1085, Deliverable "Power BI endpoint
for the demo Gold tables"). Until that endpoint is live, `powerquery/zohelo-demo.pq` documents the connection.
